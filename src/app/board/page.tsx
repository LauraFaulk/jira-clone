'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from '../../supabaseClient';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DraggableStateSnapshot,
} from '@hello-pangea/dnd';

interface Subtask {
  id: string;
  text: string;
  isDone: boolean;
  timestamp: string;
  assignee?: string;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string; 
  developer_notes?: string; 
  tech_wizard?: string[]; 
  status: string;
  priority?: string;
  is_archived?: boolean;
  attachments?: Attachment[];
  created_at?: string;
  subtasks?: Subtask[];
}

export default function BoardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const columns = ["To-Do", "In Progress", "In Test", "Done"];
  const hasMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  // VIEW CONFIGURATION MODES
  const [showArchivedView, setShowArchivedView] = useState(false);

  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [mergeTicketId, setMergeTicketId] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDeveloperNotes, setEditDeveloperNotes] = useState(''); 
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState<string>('');

  // ATTACHMENT MODAL INPUT STATES
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [uploadType, setUploadType] = useState<'link' | 'file'>('link');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function fetchTickets() {
    const { data, error } = await supabase.from('tickets').select('*').order('id', { ascending: true });
    if (error) console.error("Error fetching data:", error);
    else if (data) setTickets(data);
  }

  useEffect(() => {
    const initialFetchTimer = window.setTimeout(() => {
      void fetchTickets();
    }, 0);

    // LIVE WEBSOCKET DATABASE LISTENER (The Realtime Sync Engine)
    const realtimeDatabaseChannel = supabase
      .channel('live-tickets-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          const eventType = payload.eventType;

          // --- CASE 1: TICKET WAS UPDATED OR MOVED ---
          if (eventType === 'UPDATE') {
            const updatedRow = payload.new as Ticket;
            
            setTickets((prevTickets) =>
              prevTickets.map((ticket) =>
                ticket.id === updatedRow.id ? { ...ticket, ...updatedRow } : ticket
              )
            );

            // If the user currently has this specific card open in their modal details tray,
            // update the tray info in real-time too!
            setActiveTicket((currentActive) => 
              currentActive && currentActive.id === updatedRow.id 
                ? { ...currentActive, ...updatedRow } 
                : currentActive
            );
          }

          // --- CASE 2: NEW TICKET WAS CREATED ---
          else if (eventType === 'INSERT') {
            const newRow = payload.new as Ticket;
            const formattedNewTicket: Ticket = {
              ...newRow,
              status: !newRow.status ? 'To-Do' : newRow.status
            };

            setTickets((prevTickets) => {
              // Double check to make sure we don't accidentally add duplicate items
              if (prevTickets.some(t => t.id === formattedNewTicket.id)) return prevTickets;
              return [formattedNewTicket, ...prevTickets];
            });
          }

          // --- CASE 3: TICKET WAS DELETED ---
          else if (eventType === 'DELETE') {
            const oldRow = payload.old as { id: number };
            
            // Wipe it off the board instantly
            setTickets((prevTickets) => prevTickets.filter((t) => t.id !== oldRow.id));
            
            // Close the details view modal automatically if it was the card that got deleted
            setActiveTicket((currentActive) => 
              currentActive && currentActive.id === oldRow.id ? null : currentActive
            );
          }
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialFetchTimer);
      supabase.removeChannel(realtimeDatabaseChannel);
    };
  }, []);

  if (!hasMounted) {
    return <div className="min-h-screen w-screen bg-gray-950" />;
  }

  async function moveToBoard(ticketId: number) {
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'To-Do', is_archived: false })
      .eq('id', ticketId);

    if (error) console.error("Error updating ticket:", error);
    else fetchTickets();
  }

  async function handleToggleArchiveStatus(ticket: Ticket, shouldArchive: boolean) {
    const { error } = await supabase
      .from('tickets')
      .update({ is_archived: shouldArchive })
      .eq('id', ticket.id);

    if (error) {
      console.error("Archiving action configuration failed:", error);
    } else {
      await fetchTickets();
      if (activeTicket?.id === ticket.id) {
        setActiveTicket({ ...activeTicket, is_archived: shouldArchive });
      }
    }
  }

  async function handleAddAttachment(e: React.FormEvent) {
  e.preventDefault();
  if (!activeTicket) return;

  // Validation safety check depending on selected mode
  if (uploadType === 'link' && (!newLinkUrl.trim() || !newLinkName.trim())) return;
  if (uploadType === 'file' && !selectedFile) return;

  try {
    let formattedUrl = newLinkUrl.trim();

    // --- CASE 1: USER CHOSE TO UPLOAD A FILE ---
    if (uploadType === 'file' && selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `ticket-${activeTicket.id}/${uniqueFileName}`;

      // Upload file directly into your existing bucket
      const { error: uploadError } = await supabase.storage
        .from('intake-attachments')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Extract the public destination path URL string
      const { data: urlData } = supabase.storage
        .from('intake-attachments')
        .getPublicUrl(filePath);

      formattedUrl = urlData.publicUrl;
    } 
    // --- CASE 2: USER CHOSE A STANDARD URL LINK ---
    else {
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
    }

    // Assemble the structural payload asset object
    const currentAttachments = activeTicket.attachments || [];
    const newFile: Attachment = {
      id: crypto.randomUUID(),
      name: newLinkName.trim(),
      url: formattedUrl
    };

    const updatedAttachments = [...currentAttachments, newFile];

    // --- CASE 3: SAVE TO SUPABASE DATABASE ROW ---
    const { error } = await supabase
      .from('tickets')
      .update({ attachments: updatedAttachments })
      .eq('id', activeTicket.id);

    if (error) {
      console.error("Error saving resource link:", error);
      alert("Failed to save to database.");
    } else {
      // Clear forms out and sync local UI state immediately
      setNewLinkName('');
      setNewLinkUrl('');
      setSelectedFile(null);
      
      const freshlyUpdatedTicket = { ...activeTicket, attachments: updatedAttachments };
      setActiveTicket(freshlyUpdatedTicket);
      setTickets(tickets.map(t => t.id === activeTicket.id ? freshlyUpdatedTicket : t));
    }

  } catch (error) {
    console.error("Catch interceptor hit during attachment processing:", error);
    alert("An unexpected processing error occurred.");
  }
}

  async function handleDeleteAttachment(attachmentId: string) {
    if (!activeTicket) return;

    const currentAttachments = activeTicket.attachments || [];
    const updatedAttachments = currentAttachments.filter(f => f.id !== attachmentId);

    const { error } = await supabase
      .from('tickets')
      .update({ attachments: updatedAttachments })
      .eq('id', activeTicket.id);

    if (error) {
      console.error("Error breaking link attachment connection:", error);
    } else {
      const freshlyUpdatedTicket = { ...activeTicket, attachments: updatedAttachments };
      setActiveTicket(freshlyUpdatedTicket);
      setTickets(tickets.map(t => t.id === activeTicket.id ? freshlyUpdatedTicket : t));
    }
  }

  async function handleDeleteConfirm() {
    if (!ticketToDelete) return;
    const { error } = await supabase.from('tickets').delete().eq('id', ticketToDelete.id);
    if (error) console.error("Error deleting ticket:", error);
    else {
      fetchTickets();
      setTicketToDelete(null);
      if (activeTicket?.id === ticketToDelete.id) setActiveTicket(null);
    }
  }

  function openMergeDialog() {
    setMergeTicketId('');
    setMergeError('');
    setIsMergeDialogOpen(true);
  }

  async function handleMergeConfirm() {
    if (!activeTicket || !mergeTicketId) return;

    const absorbedTicketId = Number(mergeTicketId);
    setIsMerging(true);
    setMergeError('');

    const { data, error } = await supabase.rpc('merge_tickets', {
      remaining_ticket_id: activeTicket.id,
      merged_ticket_id: absorbedTicketId,
    });

    if (error) {
      console.error('Ticket merge failed:', error);
      setMergeError('The tickets could not be merged. Nothing was changed.');
      setIsMerging(false);
      return;
    }

    const mergedTicket = data as Ticket;
    setTickets((currentTickets) =>
      currentTickets
        .filter((ticket) => ticket.id !== absorbedTicketId)
        .map((ticket) => ticket.id === mergedTicket.id ? mergedTicket : ticket)
    );
    setActiveTicket(mergedTicket);
    setEditTitle(mergedTicket.title);
    setEditDeveloperNotes(mergedTicket.developer_notes || '');
    setIsMergeDialogOpen(false);
    setMergeTicketId('');
    setIsMerging(false);
  }

  async function handleSaveChanges() {
    if (!activeTicket) return;

    const { error } = await supabase
      .from('tickets')
      .update({ developer_notes: editDeveloperNotes })
      .eq('id', activeTicket.id);

    if (error) {
      console.error("Error updating details:", error);
    } else {
      await fetchTickets();
      setActiveTicket({ ...activeTicket, developer_notes: editDeveloperNotes });
      setIsEditing(false);
    }
  }

  async function handleTitleSave() {
    if (!activeTicket) return;

    const updatedTitle = editTitle.trim();
    if (!updatedTitle || updatedTitle === activeTicket.title) {
      setEditTitle(activeTicket.title);
      setIsEditingTitle(false);
      return;
    }

    const { error } = await supabase
      .from('tickets')
      .update({ title: updatedTitle })
      .eq('id', activeTicket.id);

    if (error) {
      console.error('Error updating ticket title:', error);
      setEditTitle(activeTicket.title);
    } else {
      const updatedTicket = { ...activeTicket, title: updatedTitle };
      setActiveTicket(updatedTicket);
      setTickets((currentTickets) =>
        currentTickets.map((ticket) => ticket.id === updatedTicket.id ? updatedTicket : ticket)
      );
    }

    setIsEditingTitle(false);
  }

  async function handlePriorityChange(newPriority: string) {
    if (!activeTicket) return;

    const { error } = await supabase
      .from('tickets')
      .update({ priority: newPriority })
      .eq('id', activeTicket.id);

    if (error) {
      console.error("Failed to update task priority:", error);
    } else {
      const updated = { ...activeTicket, priority: newPriority };
      setActiveTicket(updated);
      setTickets(tickets.map(t => t.id === activeTicket.id ? updated : t));
    }
  }

  function getPriorityBadge(priorityName?: string) {
    const name = priorityName || 'Medium';
    switch (name) {
      case 'Highest':
        return { text: '🪶 Highest', style: 'text-red-400 bg-red-950/40 border-red-900/60' };
      case 'High':
        return { text: '🔼 High', style: 'text-orange-400 bg-orange-950/40 border-orange-900/60' };
      case 'Low':
        return { text: '🔽 Low', style: 'text-blue-400 bg-blue-950/40 border-blue-900/60' };
      case 'Lowest':
        return { text: '⏬ Lowest', style: 'text-sky-500 bg-sky-950/30 border-sky-900/40' };
      default:
        return { text: '⏸️ Medium', style: 'text-amber-400 bg-amber-950/40 border-amber-900/60' };
    }
  }

  function renderBoardTicket(
    ticket: Ticket,
    provided: DraggableProvided,
    snapshot: DraggableStateSnapshot
  ) {
    const subtasks = ticket.subtasks || [];
    const doneCount = subtasks.filter((subtask) => subtask.isDone).length;
    const badge = getPriorityBadge(ticket.priority);
    const files = ticket.attachments || [];

    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        onClick={() => openTicketDetails(ticket)}
        style={{ ...provided.draggableProps.style }}
        className={`p-4 rounded-lg border shadow-md flex flex-col justify-between shrink-0 min-h-[120px] transition-shadow ${
          snapshot.isDragging
            ? 'z-[100] bg-purple-900 border-purple-400 shadow-2xl shadow-purple-500/50 cursor-grabbing'
            : 'bg-gray-800 border-gray-700 hover:border-purple-500/50 cursor-grab'
        }`}
      >
        <div className="overflow-hidden relative w-full">
          <span className={`absolute top-0 right-0 text-[10px] px-1.5 py-0.5 rounded border font-sans font-bold ${badge.style}`}>
            {badge.text.split(' ')[1]}
          </span>
          <h4 className="font-semibold text-sm text-white group-hover:text-purple-300 pr-16 truncate">
            <span className="text-purple-400 font-bold font-mono mr-1">#{ticket.id}</span> {ticket.title}
          </h4>
          <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-2" onClick={(event) => event.stopPropagation()}>
          {subtasks.length > 0 && (
            <div className="text-[10px] text-purple-400 bg-purple-950/40 border border-purple-900/40 rounded px-1.5 py-0.5 font-medium">
              📋 {doneCount}/{subtasks.length}
            </div>
          )}
          {files.length > 0 && (
            <div className="text-[10px] text-blue-400 bg-blue-950/40 border border-blue-900/40 rounded px-1.5 py-0.5 font-medium">
              🔗 {files.length} files
            </div>
          )}
          {ticket.tech_wizard && (
            <div className="text-[10px] text-purple-300 bg-slate-950/80 border border-purple-500/20 rounded px-2 py-0.5 font-bold truncate max-w-[120px]" title={`Assigned: ${ticket.tech_wizard}`}>
              🧙‍♂️ {ticket.tech_wizard}
            </div>
          )}
        </div>
      </div>
    );
  }

  async function triggerAddSubtask() {
    if (!activeTicket || !newSubtaskText.trim()) return;

    const taskTime = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const currentSubtasks = activeTicket.subtasks || [];
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: newSubtaskText.trim(),
      isDone: false,
      timestamp: taskTime,
      assignee: newSubtaskAssignee || undefined
    };

    const updatedSubtasks = [...currentSubtasks, newSubtask];

    const { error } = await supabase
      .from('tickets')
      .update({ subtasks: updatedSubtasks })
      .eq('id', activeTicket.id);

    if (error) {
      console.error("Error adding subtask:", error);
    } else {
      setNewSubtaskText('');
      setNewSubtaskAssignee('');
      const freshlyUpdatedTicket = { ...activeTicket, subtasks: updatedSubtasks };
      setActiveTicket(freshlyUpdatedTicket);
      setTickets(tickets.map(t => t.id === activeTicket.id ? freshlyUpdatedTicket : t));
    }
  }

  function handleSubtaskKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      triggerAddSubtask();
    }
  }

  async function handleToggleSubtask(subtaskId: string) {
    if (!activeTicket) return;

    const currentSubtasks = activeTicket.subtasks || [];
    const updatedSubtasks = currentSubtasks.map(sub => 
      sub.id === subtaskId ? { ...sub, isDone: !sub.isDone } : sub
    );

    const { error } = await supabase
      .from('tickets')
      .update({ subtasks: updatedSubtasks })
      .eq('id', activeTicket.id);

    if (error) {
      console.error("Error updating subtask state:", error);
    } else {
      const freshlyUpdatedTicket = { ...activeTicket, subtasks: updatedSubtasks };
      setActiveTicket(freshlyUpdatedTicket);
      setTickets(tickets.map(t => t.id === activeTicket.id ? freshlyUpdatedTicket : t));
    }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    if (!activeTicket) return;

    const currentSubtasks = activeTicket.subtasks || [];
    const updatedSubtasks = currentSubtasks.filter(sub => sub.id !== subtaskId);

    const { error } = await supabase
      .from('tickets')
      .update({ subtasks: updatedSubtasks })
      .eq('id', activeTicket.id);

    if (error) {
      console.error("Error removing subtask:", error);
    } else {
      const freshlyUpdatedTicket = { ...activeTicket, subtasks: updatedSubtasks };
      setActiveTicket(freshlyUpdatedTicket);
      setTickets(tickets.map(t => t.id === activeTicket.id ? freshlyUpdatedTicket : t));
    }
  }

  function openTicketDetails(ticket: Ticket) {
    setActiveTicket(ticket);
    setEditTitle(ticket.title);
    setEditDeveloperNotes(ticket.developer_notes || '');
    setIsEditing(false);
    setIsEditingTitle(false);
    setNewSubtaskText('');
    setNewLinkName('');
    setNewLinkUrl('');
    setIsMergeDialogOpen(false);
    setMergeTicketId('');
    setMergeError('');
  }

  function formatCoreTimestamp(isoString?: string) {
    if (!isoString) return 'Not Tracked';
    return new Date(isoString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  function parseAndRenderIntakeContent(rawText: string) {
    if (!rawText) return <span className="text-gray-600 italic">No detailed description provided.</span>;

    const items = rawText.split('\n');
    return (
      <div className="space-y-4 font-sans text-xs">
        {items.map((line, idx) => {
          const trimmed = line.trim();

          if (trimmed === '---') {
            return <hr key={idx} className="border-gray-800 my-4" />;
          }

          if (trimmed.startsWith('###')) {
            return (
              <h4 key={idx} className="text-sm font-black text-purple-400 mt-4 uppercase tracking-wider">
                {trimmed.replace('###', '').trim()}
              </h4>
            );
          }

          if (trimmed.includes('**')) {
            const match = trimmed.match(/\*\*(.*?)\*\*(.*)/);
            if (match) {
              const question = match[1].replace(':', '').trim();
              const response = match[2].trim();

              if (response && response.length > 0) {
                return (
                  <div key={idx} className="space-y-1">
                    <span className="text-[13px] font-bold text-gray-400 block underline decoration-purple-500/40 underline-offset-4 tracking-wide select-none">
                      {question}
                    </span>
                    <p className="text-[12px] text-gray-200 pl-1 leading-relaxed whitespace-pre-wrap">
                      {response}
                    </p>
                  </div>
                );
              }
              
              return (
                <div key={idx} className="space-y-1">
                  <span className="text-[13px] font-bold text-gray-400 block underline decoration-purple-500/40 underline-offset-4 tracking-wide select-none">
                    {question}
                  </span>
                </div>
              );
            }
          }

          if (trimmed.length > 0) {
            const isNoEntryText = trimmed.toLowerCase() === 'no entry provided';
            return (
              <p key={idx} className={`text-[12px] pl-1 leading-relaxed whitespace-pre-wrap ${isNoEntryText ? 'text-gray-600 italic' : 'text-gray-200'}`}>
                {trimmed}
              </p>
            );
          }

          return null;
        })}
      </div>
    );
  }

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const ticketId = parseInt(draggableId);

    const updatedTickets = tickets.map((t) => 
      t.id === ticketId ? { ...t, status: newStatus } : t
    );
    setTickets(updatedTickets);

    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);

    if (error) {
      console.error("Database update failed:", error);
      fetchTickets();
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-screen w-screen bg-gray-950 text-gray-100 font-sans overflow-hidden relative select-none">
        
        {/* SIDEBAR (INTAKE BACKLOG) */}
        <aside className="w-72 xl:w-80 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-800 flex items-center gap-4 min-h-[120px]">
            <div 
              style={{ backgroundImage: 'url("/emivation-icon.png")' }}
              className="w-20 h-20 rounded-full border border-purple-500/30 bg-cover bg-center shadow-md shadow-purple-950/50 shrink-0"
              aria-label="Emi-vation Avatar"
            />
            <div className="flex flex-col justify-center">
              <h2 className="text-xl text-purple-400 font-black tracking-wide [font-family:var(--font-elsie)] leading-none">
                Intake Backlog
              </h2>
              <p className="text-[11px] text-gray-400 mt-2 font-medium leading-tight">
                Incoming Wishes Awaiting Magic ✨
              </p>
            </div>
          </div>
          
          <Droppable droppableId="Backlog">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`p-4 flex-1 overflow-y-auto space-y-3 transition-colors ${
                  snapshot.isDraggingOver ? 'bg-purple-950/20 ring-1 ring-inset ring-purple-500/40' : ''
                }`}
              >
                {tickets
                  .filter((ticket) => ticket.status?.toLowerCase() === "backlog" && !ticket.is_archived)
                  .map((ticket) => {
                const subtasks = ticket.subtasks || [];
                const doneCount = subtasks.filter(s => s.isDone).length;
                const badge = getPriorityBadge(ticket.priority);
                const files = ticket.attachments || [];
                
                return (
                  <div 
                    key={ticket.id} 
                    onClick={() => openTicketDetails(ticket)}
                    className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md relative group cursor-pointer hover:border-purple-500/40 transition-colors min-h-[145px] flex flex-col justify-between"
                  >
                    <div className="relative">
                      <span className={`absolute top-0 right-0 text-[10px] px-2 py-0.5 rounded border font-sans font-bold ${badge.style}`}>
                        {badge.text.split(' ')[1]}
                      </span>
                      <h4 className="font-semibold text-sm text-white pr-16 truncate">
                        <span className="text-purple-400 font-bold font-mono mr-1">#{ticket.id}</span> {ticket.title}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{ticket.description}</p>
                    </div>

                    <div className="mt-3 flex justify-between items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                        {subtasks.length > 0 && <span>📋 {doneCount}/{subtasks.length}</span>}
                        {files.length > 0 && <span>📁 {files.length} files</span>}
                        {ticket.tech_wizard && (
                          <span className="text-[10px] text-purple-400 bg-purple-950/40 border border-purple-900/30 rounded px-1.5 font-bold truncate max-w-[90px]">
                            🧙‍♂️ {ticket.tech_wizard}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => moveToBoard(ticket.id)}
                        className="px-4 py-1 bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white rounded transition tracking-wide font-sans shrink-0"
                      >
                        Move to Board →
                      </button>
                    </div>
                  </div>
                );
                  })}
                {provided.placeholder}
                {snapshot.isDraggingOver && (
                  <div className="rounded-lg border border-dashed border-purple-500/60 bg-purple-950/30 p-4 text-center text-xs font-semibold text-purple-300">
                    Drop here to return this ticket to Intake Backlog
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </aside>

        {/* MAIN BOARD AREA */}
        <main className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">
          <header className="w-full bg-[#090b11] border-b border-gray-800 h-16 shrink-0 shadow-lg shadow-purple-950/10 flex items-center justify-end px-8">
            <button 
              onClick={() => setShowArchivedView(!showArchivedView)}
              className={`px-4 py-1.5 rounded-xl border text-xs font-bold font-sans transition shadow-md flex items-center gap-1.5 ${
                showArchivedView 
                  ? 'bg-purple-600 border-purple-500 text-white' 
                  : 'bg-gray-900 border-gray-800 text-purple-400 hover:text-white hover:border-gray-700'
              }`}
            >
              {showArchivedView ? '📋 View Active Board' : '🗄️ View Archived Projects'}
            </button>
          </header>

          {showArchivedView ? (
            <div 
              style={{ backgroundImage: 'url("/emivation-background.png")' }}
              className="flex-1 p-8 flex flex-col items-center bg-gray-950 bg-cover bg-center overflow-y-auto relative"
            >
              <div className="absolute inset-0 bg-gray-950/70 pointer-events-none z-0" />
              <div className="w-full max-w-4xl relative z-10 space-y-4">
                <div className="border-b border-gray-800 pb-2">
                  <h2 className="text-xl font-black text-purple-300 [font-family:var(--font-elsie)]">🗄️ Project Archive Storage Vault</h2>
                  <p className="text-xs text-gray-500">Historical logs of all finalized documentation blueprints.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tickets
                    .filter(t => t.is_archived)
                    .map(ticket => {
                      const badge = getPriorityBadge(ticket.priority);
                      return (
                        <div 
                          key={ticket.id}
                          onClick={() => openTicketDetails(ticket)}
                          className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 shadow-xl backdrop-blur-sm cursor-pointer hover:border-purple-500/40 transition flex flex-col justify-between h-40"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-4">
                              <h3 className="font-bold text-base text-white truncate pr-16">
                                <span className="text-purple-400 font-bold font-mono mr-1">#{ticket.id}</span> {ticket.title}
                              </h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-sans font-bold shrink-0 ${badge.style}`}>{badge.text}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 line-clamp-2">{ticket.description}</p>
                          </div>
                          
                          <div className="flex justify-between items-center border-t border-gray-800/60 pt-3 mt-2 text-xs" onClick={e => e.stopPropagation()}>
                            <span className="text-gray-500 font-mono text-[10px]">ID: #{ticket.id}</span>
                            <button 
                              onClick={() => handleToggleArchiveStatus(ticket, false)}
                              className="text-purple-400 hover:text-white font-bold transition"
                            >
                              ⏪ Restore to Board
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {tickets.filter(t => t.is_archived).length === 0 && (
                    <p className="text-sm text-gray-600 italic text-center col-span-2 py-12">Vault empty. No documents archived yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div 
              style={{ backgroundImage: 'url("/emivation-background.png")' }}
              className="flex-1 min-h-0 p-4 md:p-6 xl:p-8 bg-gray-950 bg-cover bg-center overflow-x-auto overflow-y-hidden relative"
            >
              <div className="absolute inset-0 bg-gray-950/40 pointer-events-none" />

              <div className="flex min-w-max gap-6 h-full max-h-[85vh] items-center relative z-10 py-2 pr-4 md:pr-6 xl:pr-8">
                {columns.map((columnName) => {
                  const columnTickets = tickets.filter(
                    (ticket) => ticket.status?.toLowerCase() === columnName.toLowerCase() && !ticket.is_archived
                  );

                  return (
                    <div
                      key={columnName}
                      className="w-80 shrink-0 bg-gray-900/60 rounded-xl flex flex-col border border-gray-800/80 h-full max-h-[82vh] backdrop-blur-sm shadow-xl shadow-black/40 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 rounded-t-xl shrink-0">
                        <span className="text-base text-purple-300 font-black tracking-wide [font-family:var(--font-elsie)]">
                          {columnName}
                        </span>
                        <span className="bg-gray-800 text-xs px-2.5 py-0.5 rounded-full text-gray-400 font-sans font-bold">
                          {columnTickets.length}
                        </span>
                      </div>

                      <Droppable
                        droppableId={columnName}
                        renderClone={(provided, snapshot, rubric) =>
                          renderBoardTicket(columnTickets[rubric.source.index], provided, snapshot)
                        }
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="p-4 flex-1 overflow-y-auto space-y-3 min-h-[150px] overflow-x-hidden"
                          >
                            {columnTickets.map((ticket, index) => (
                              <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                                {(provided, snapshot) => renderBoardTicket(ticket, provided, snapshot)}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* DOUBLE-SIZED DETAIL MODAL OVERLAY */}
        {activeTicket && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-40 select-text p-4">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-5xl w-full mx-4 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4 text-xs select-none">
                <div className="flex items-center gap-3">
                  <span className="font-semibold px-2.5 py-1 rounded bg-purple-900/40 border border-purple-800 text-purple-300 font-mono tracking-wider uppercase">
                    📌 {activeTicket.status} Mode
                  </span>
                  <div className="px-2.5 py-1 rounded bg-gray-950 border border-gray-800 text-purple-400 font-bold font-mono tracking-wider text-[11px] uppercase">
                    Ticket #{activeTicket.id}
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">Priority:</span>
                    <select
                      value={activeTicket.priority || 'Medium'}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                      className="bg-transparent text-xs font-bold text-gray-200 focus:outline-none cursor-pointer pr-1 select-none"
                    >
                      <option value="Highest" className="bg-gray-900 text-red-400">🔴 Highest</option>
                      <option value="High" className="bg-gray-900 text-orange-400">🟠 High</option>
                      <option value="Medium" className="bg-gray-900 text-amber-400">🟡 Medium</option>
                      <option value="Low" className="bg-gray-900 text-blue-400">🔵 Low</option>
                      <option value="Lowest" className="bg-gray-900 text-sky-400">⚪ Lowest</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 bg-gray-950 px-3 py-1 rounded border border-gray-800 min-h-[28px]">
                    <span className="text-[11px] text-purple-400 font-bold uppercase tracking-wide whitespace-nowrap">
                      Tech Wizards:
                    </span>
                    {activeTicket.tech_wizard && Array.isArray(activeTicket.tech_wizard) && activeTicket.tech_wizard.map((wizard: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 bg-purple-950/60 border border-purple-800/80 text-purple-300 text-[11px] font-medium px-1.5 py-0.5 rounded"
                      >
                        <span>🧙‍♂️ {wizard}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            const updatedWizards = (activeTicket.tech_wizard || []).filter((_: string, i: number) => i !== idx);
                            const updatedTicket = { ...activeTicket, tech_wizard: updatedWizards };
                            setActiveTicket(updatedTicket);
                            setTickets(tickets.map((t) => t.id === activeTicket.id ? updatedTicket : t));
                            await supabase.from('tickets').update({ tech_wizard: updatedWizards }).eq('id', activeTicket.id);
                          }}
                          className="text-purple-400 hover:text-red-400 ml-0.5 font-sans font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder={activeTicket.tech_wizard && activeTicket.tech_wizard.length >= 3 ? '' : 'Add tech + Enter...'}
                      disabled={activeTicket.tech_wizard && activeTicket.tech_wizard.length >= 3}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const target = e.currentTarget;
                          const newName = target.value.trim();
                          if (!newName) return;

                          const currentWizards = activeTicket.tech_wizard || [];
                          if (!currentWizards.includes(newName)) {
                            const updatedWizards = [...currentWizards, newName];
                            const updatedTicket = { ...activeTicket, tech_wizard: updatedWizards };
                            setActiveTicket(updatedTicket);
                            setTickets(tickets.map((t) => t.id === activeTicket.id ? updatedTicket : t));
                            await supabase.from('tickets').update({ tech_wizard: updatedWizards }).eq('id', activeTicket.id);
                          }
                          target.value = '';
                        }
                      }}
                      className="bg-transparent text-xs font-bold text-gray-100 placeholder-gray-700 focus:outline-none min-w-[90px] flex-1 border-none p-0 focus:ring-0 disabled:hidden"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTicket(null);
                    setIsEditingTitle(false);
                  }}
                  className="text-gray-400 hover:text-white text-sm bg-gray-800 hover:bg-gray-700 w-7 h-7 rounded-full flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-12 gap-8 min-h-0">
                <div className="md:col-span-7 space-y-5 md:border-r md:border-gray-800/60 md:pr-6 flex flex-col min-h-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-800/40 pb-2 shrink-0">
                    {isEditingTitle ? (
                      <input
                        autoFocus
                        type="text"
                        aria-label="Ticket title"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        onBlur={() => void handleTitleSave()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.currentTarget.blur();
                          } else if (event.key === 'Escape') {
                            setEditTitle(activeTicket.title);
                            setIsEditingTitle(false);
                          }
                        }}
                        className="min-w-0 flex-1 bg-gray-950 border border-purple-700/70 rounded-lg px-2.5 py-1.5 text-xl font-black text-white tracking-wide focus:outline-none focus:border-purple-400 [font-family:var(--font-elsie)]"
                      />
                    ) : (
                      <button
                        type="button"
                        title="Click to edit ticket title"
                        onClick={() => {
                          setEditTitle(activeTicket.title);
                          setIsEditingTitle(true);
                        }}
                        className="min-w-0 flex-1 -mx-2 px-2 py-1 text-left rounded-lg border border-transparent hover:border-purple-900/50 hover:bg-purple-950/20 transition cursor-text"
                      >
                        <h2 className="truncate text-xl font-black text-white hover:text-purple-200 tracking-wide [font-family:var(--font-elsie)]">
                          {activeTicket.title}
                        </h2>
                      </button>
                    )}
                    <span className="text-[10px] text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-800 shrink-0 font-sans font-medium select-none">
                      🗓️ Received: {formatCoreTimestamp(activeTicket.created_at)}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0 max-h-[62vh] pr-1">
                    <div className="bg-gray-950/40 border border-gray-800/70 rounded-xl p-4 overflow-y-auto flex-1">
                      {parseAndRenderIntakeContent(activeTicket.description)}
                    </div>

                    <div className="shrink-0 flex flex-col">
                      <h3 className="text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-2 select-none flex items-center gap-1.5">
                        📝 Internal Developer Notes & Specs
                      </h3>
                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={editDeveloperNotes}
                          onChange={(e) => setEditDeveloperNotes(e.target.value)}
                          placeholder="Inject structural layout edits, logic specs, technical comments, or changes here..."
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-purple-300 placeholder-gray-700 focus:outline-none focus:border-purple-500 font-sans resize-none"
                        />
                      ) : (
                        <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-3 text-xs text-purple-300/90 italic font-sans leading-relaxed whitespace-pre-wrap min-h-[60px] max-h-[150px] overflow-y-auto">
                          {activeTicket.developer_notes || (
                            <span className="text-gray-600 font-sans not-italic">No additional developer scope files attached. Click &quot;Edit Details&quot; below to append project updates.</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 space-y-6 flex flex-col justify-between h-full min-h-0">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider block select-none">📂 Documentation Station</h3>
                    <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
                      {(activeTicket.attachments || []).map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-gray-950/50 border border-gray-800 hover:border-gray-700 p-2 rounded-xl group/file">
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-300 hover:text-blue-400 font-medium truncate flex-1 pl-1">
                            🔗 {file.name}
                          </a>
                          <button onClick={() => handleDeleteAttachment(file.id)} className="text-gray-600 hover:text-red-400 text-xs px-2 opacity-0 group-hover/file:opacity-100 transition select-none">
                            ✕
                          </button>
                        </div>
                      ))}
                      {(activeTicket.attachments || []).length === 0 && (
                        <p className="text-xs text-gray-600 italic pl-1">No reference files or links attached yet.</p>
                      )}
                    </div>

                    <form onSubmit={handleAddAttachment} className="flex flex-col gap-2 pt-1 select-none">
                      <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800 text-xs self-start mb-1">
                        <button type="button" onClick={() => setUploadType('link')} className={`px-3 py-1 rounded-lg transition ${uploadType === 'link' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}>
                          Link URL
                        </button>
                        <button type="button" onClick={() => setUploadType('file')} className={`px-3 py-1 rounded-lg transition ${uploadType === 'file' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}>
                          Upload File (PDF/Image)
                        </button>
                      </div>

                      <input
                        type="text"
                        required
                        placeholder={uploadType === 'link' ? 'Link Name (e.g., Project Scope, Notion)' : 'File Name / Asset Description'}
                        value={newLinkName}
                        onChange={(e) => setNewLinkName(e.target.value)}
                        className="bg-gray-950 border border-gray-800 rounded-xl p-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-blue-500 font-sans w-full"
                      />

                      <div className="flex gap-2">
                        {uploadType === 'link' ? (
                          <input
                            type="text"
                            required
                            placeholder="Paste absolute link or URL path..."
                            value={newLinkUrl}
                            onChange={(e) => setNewLinkUrl(e.target.value)}
                            className="flex-1 bg-gray-950 border border-gray-800 rounded-xl p-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-blue-500 font-sans"
                          />
                        ) : (
                          <div className="relative flex-1 bg-gray-950 border border-dashed border-gray-800 hover:border-gray-700 rounded-xl transition px-3 py-2 text-xs flex items-center justify-between cursor-pointer">
                            <input
                              type="file"
                              required={!selectedFile}
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setSelectedFile(file);
                                if (file && !newLinkName) {
                                  setNewLinkName(file.name.split('.').slice(0, -1).join('.'));
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <span className="text-gray-400 truncate max-w-[200px]">
                              {selectedFile ? selectedFile.name : 'Choose screenshot or PDF...'}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">Browse</span>
                          </div>
                        )}

                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs px-4 transition shrink-0">
                          {uploadType === 'link' ? '+ Attach' : '+ Upload'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-3 flex-1 flex flex-col justify-end min-h-0 pt-4 border-t border-gray-800/40">
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider block select-none">🛠️ Card Subtasks Checklist</h3>

                    <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[22vh]">
                      {(activeTicket.subtasks || []).length === 0 ? (
                        <p className="text-xs text-gray-600 italic pl-1">No modular tasks logged to this card yet.</p>
                      ) : (
                        (activeTicket.subtasks || []).map((sub) => (
                          <div key={sub.id} className="flex items-start justify-between bg-gray-950/60 border border-gray-800 rounded-xl p-2.5 transition hover:border-gray-700 group/sub">
                            <label className="flex items-start gap-3 cursor-pointer text-xs flex-1 min-w-0 pt-0.5 select-none">
                              <input
                                type="checkbox"
                                checked={sub.isDone}
                                onChange={() => handleToggleSubtask(sub.id)}
                                className="accent-purple-500 w-4 h-4 rounded border-gray-800 text-purple-600 focus:ring-0 cursor-pointer shrink-0 mt-0.5"
                              />
                              <div className="flex flex-col text-left min-w-0 select-text">
                                <span className={`whitespace-pre-wrap break-words text-gray-200 leading-relaxed ${sub.isDone ? 'line-through text-gray-600 italic' : ''}`}>
                                  {sub.text}
                                </span>
                                <div className="flex items-center gap-2 text-[9px] text-gray-600 font-mono mt-0.5 select-none">
                                  <span>📆 Logged: {sub.timestamp || 'Prior'}</span>
                                  {sub.assignee && (
                                    <span className="bg-purple-950/50 border border-purple-800/60 text-purple-400 px-1.5 py-0.5 rounded font-sans font-semibold">
                                      🧙‍♂️ {sub.assignee}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                            <button onClick={() => handleDeleteSubtask(sub.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover/sub:opacity-100 transition-all text-xs px-2 self-center select-none" title="Delete subtask">
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex flex-col gap-2 pt-2 select-none">
                        <textarea
                          placeholder="Type list specs... [Ctrl + Enter to append]"
                          rows={2}
                          value={newSubtaskText}
                          onChange={(e) => setNewSubtaskText(e.target.value)}
                          onKeyDown={handleSubtaskKeyDown}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-purple-500 font-sans"
                        />

                        <div className="flex items-center justify-end gap-2 mt-1">
                          {activeTicket?.tech_wizard && Array.isArray(activeTicket.tech_wizard) && activeTicket.tech_wizard.length > 0 && (
                            <select
                              value={newSubtaskAssignee}
                              onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                              className="bg-gray-950 border border-gray-800 text-gray-300 text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer hover:border-gray-700 h-[36px]"
                            >
                              <option value="">✨ Assign Subtask...</option>
                              {activeTicket.tech_wizard.map((wizard: string, index: number) => (
                                <option key={index} value={wizard}>
                                  🧙‍♂️ {wizard}
                                </option>
                              ))}
                            </select>
                          )}

                          <button type="button" onClick={triggerAddSubtask} className="px-4 py-2 bg-gray-800 hover:bg-purple-600 border border-gray-700 hover:border-purple-500 text-purple-300 hover:text-white rounded-xl text-xs font-semibold transition h-[36px]">
                            + Add Subtask
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-gray-800 pt-4 mt-4 text-xs font-medium select-none">
                      {isEditing ? (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition">Cancel</button>
                          <button onClick={handleSaveChanges} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition shadow-lg shadow-purple-900/30 font-semibold">Save Changes</button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 items-center justify-center gap-x-2 gap-y-2">
                          <button
                            onClick={() => setIsEditing(true)}
                            className="justify-self-center px-5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-purple-300 hover:text-white rounded-lg transition font-semibold"
                          >
                            ✏️ Edit Details
                          </button>
                          <button
                            onClick={() => handleToggleArchiveStatus(activeTicket, !activeTicket.is_archived)}
                            className="justify-self-center px-4 py-2 bg-gray-950 hover:bg-gray-800 text-purple-400 border border-gray-800 rounded-lg transition font-semibold"
                          >
                            {activeTicket.is_archived ? '🗄️ Unarchive Project' : '📥 Archive Closed Project'}
                          </button>
                          <button
                            onClick={openMergeDialog}
                            disabled={!tickets.some((ticket) => ticket.id !== activeTicket.id && !ticket.is_archived)}
                            title="Combine another ticket into this one"
                            className="justify-self-center min-w-32 px-2.5 py-1.5 text-[10px] bg-gray-950 hover:bg-purple-950/40 text-gray-500 hover:text-purple-300 border border-gray-800 hover:border-purple-800 rounded-md transition disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ⇄ Merge Ticket
                          </button>
                          <button
                            onClick={() => setTicketToDelete(activeTicket)}
                            className="justify-self-center min-w-32 px-2.5 py-1.5 text-[10px] bg-gray-950 hover:bg-purple-950/40 text-gray-500 hover:text-purple-300 border border-gray-800 hover:border-purple-800 rounded-md transition"
                          >
                            🗑️ Delete Work Item
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MERGE CONFIRMATION MODAL OVERLAY */}
        {isMergeDialogOpen && activeTicket && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 transition-all select-none">
            <div className="bg-gray-900 border border-purple-900/60 p-6 rounded-xl max-w-md w-full mx-4 shadow-2xl shadow-purple-950/30">
              <h3 className="text-lg font-bold text-white tracking-wide">Are you sure?</h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Choose the ticket to merge into <span className="text-purple-300 font-semibold">#{activeTicket.id} {activeTicket.title}</span>.
                The selected ticket will be removed after all of its details, notes, subtasks, attachments, priority, and tech assignments are combined into this ticket.
              </p>

              <label htmlFor="merge-ticket-select" className="block mt-5 mb-2 text-[11px] font-bold uppercase tracking-wider text-purple-400">
                Ticket to merge
              </label>
              <select
                id="merge-ticket-select"
                value={mergeTicketId}
                onChange={(event) => {
                  setMergeTicketId(event.target.value);
                  setMergeError('');
                }}
                disabled={isMerging}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500 disabled:opacity-60"
              >
                <option value="">Select a ticket...</option>
                {tickets
                  .filter((ticket) => ticket.id !== activeTicket.id && !ticket.is_archived)
                  .map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      #{ticket.id} · {ticket.title} ({ticket.status})
                    </option>
                  ))}
              </select>

              {mergeError && (
                <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                  {mergeError}
                </p>
              )}

              <div className="flex justify-end gap-3 mt-6 font-medium text-xs">
                <button
                  onClick={() => setIsMergeDialogOpen(false)}
                  disabled={isMerging}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMergeConfirm}
                  disabled={!mergeTicketId || isMerging}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded transition shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isMerging ? 'Merging...' : 'Merge Tickets'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL OVERLAY */}
        {ticketToDelete && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all select-none">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl max-w-sm w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white tracking-wide">Confirm Deletion</h3>
              <p className="text-sm text-gray-400 mt-2">Are you sure you want to delete this work item?</p>
              <div className="bg-gray-950/50 border border-gray-800/80 rounded p-3 mt-3 text-xs text-purple-300 italic truncate">&ldquo;{ticketToDelete.title}&rdquo;</div>
              <div className="flex justify-end gap-3 mt-6 font-medium text-xs">
                <button onClick={() => setTicketToDelete(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition">
                  Cancel
                </button>
                <button onClick={handleDeleteConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition shadow-lg">
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
