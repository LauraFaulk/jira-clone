'use client';

import { useState } from 'react';

export default function CombinedIntakePage() {
  const [title, setTitle] = useState('');
  const [requester, setRequester] = useState('');
  const [dept, setDept] = useState('');
  const [targetProd, setTargetProd] = useState('');
  const [score, setScore] = useState('5');
  const [requestType, setRequestType] = useState('feature'); 

  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [products] = useState([
    'The Placement Pool',
    'Pearl',
    'Zilla',
    'Other'
  ]);

  async function triggerGoogleChatNotification(
    ticketTitle: string,
    ticketRequester: string,
    ticketDept: string,
    ticketProd: string,
    ticketScore: string,
    ticketNumber: number,
    type: string,
    fileLink: string | null
  ) {
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_CHAT_WEBHOOK_URL || "https://chat.googleapis.com/v1/spaces/AAQApvgFOAQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=GnRq0Ik-EjmjbGZpgbh7R1Cy6yZSg_5IANIuZY7RI7E";

      const emojiType = type === 'bug' ? '🚨' : '✨';
      const headingText = type === 'bug' ? 'New System Issue Spotted!' : 'New Wish Arrived at Emi-vation Station!';

      const attachmentSection = fileLink
        ? `*📎 Attached Evidence:* <${fileLink}|View Asset / Screenshot>\n\n`
        : '\n';

      const chatPayload = {
        text: `${emojiType} *${headingText}*\n\n` +
              `*📋 Title:* ${ticketTitle} (#${ticketNumber})\n` +
              `*👤 Submitter:* ${ticketRequester}\n` +
              `*🏢 Department:* ${ticketDept}\n` +
              `*💻 Product Target:* ${ticketProd}\n` +
              `*📊 Impact Score:* ${ticketScore}/10\n` +
              attachmentSection +
              `*⚙️ Logged to Intake Backlog and awaiting technical wizard assignment.*`
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatPayload),
      });
    } catch (error) {
      console.error("Webhook failed:", error);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { supabase } = await import('../supabaseClient');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('intake-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('intake-attachments')
        .getPublicUrl(filePath);

      setAttachmentUrl(data.publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Attachment failed. Make sure your 'intake-attachments' bucket exists in Supabase!");
    } finally {
      setIsUploading(false);
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const generatedTicketNum = Math.floor(1000 + Math.random() * 9000);

    await triggerGoogleChatNotification(
      title,
      requester,
      dept,
      targetProd,
      score,
      generatedTicketNum,
      requestType,
      attachmentUrl
    );

    alert(`Success! Ticket #${generatedTicketNum} has been routed to Emi-vation Station.`);
    setTitle('');
    setRequester('');
    setDept('');
    setAttachmentUrl(null);
  };

  return (
    <main className="min-h-screen bg-slate-900 p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-2xl bg-slate-950/40 rounded-xl p-8 border border-slate-800 backdrop-blur-sm shadow-2xl">
        
        {/* HEADER SECTION */}
        <div className="mb-8 border-b border-slate-800 pb-5">
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text">
            Emi-vation Station
          </h1>
          <p className="text-sm text-slate-400 mt-1">Unified Intake Backlog & Lifecycle Control Portal</p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          
          {/* REQUEST TYPE SELECTOR */}
          <div className="flex gap-4 p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setRequestType('feature')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition duration-200 ${requestType === 'feature' ? 'bg-white text-slate-950 shadow-md transform scale-[1.01]' : 'text-slate-400 hover:text-white'}`}
            >
              ✨ Feature Request
            </button>
            <button
              type="button"
              onClick={() => setRequestType('bug')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition duration-200 ${requestType === 'bug' ? 'bg-white text-slate-950 shadow-md transform scale-[1.01]' : 'text-slate-400 hover:text-white'}`}
            >
              🚨 Bug Report
            </button>
          </div>

          {/* TITLE INPUT */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-200 tracking-wide">Ticket Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short descriptive summary of the item..."
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* SUBMITTER & DEPARTMENT GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-200 tracking-wide">Your Name</label>
              <input
                type="text"
                required
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                placeholder="E.g., Laura Faulk"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-200 tracking-wide">Department</label>
              <input
                type="text"
                required
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                placeholder="E.g., Innovation / Support"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* TARGET PRODUCT DROPDOWN */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-200 tracking-wide">Product Scope Target</label>
            <select
              value={targetProd}
              onChange={(e) => setTargetProd(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
            >
              <option value="" className="text-slate-500">-- Select Target System --</option>
              {products.map((prod) => (
                <option key={prod} value={prod} className="text-white bg-slate-900">{prod}</option>
              ))}
            </select>
          </div>

          {/* IMPACT SCORE SLIDER */}
          <div className="flex flex-col gap-1.5 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-800">Priority & Impact Level</label>
              <span className="text-sm font-extrabold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full shadow-sm">
                {score} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none mt-3"
            />
            <div className="flex justify-between text-[11px] font-semibold text-slate-500 px-0.5 mt-1.5">
              <span>Low Priority</span>
              <span>Critical Blocking Blocker</span>
            </div>
          </div>

          {/* ASSET ATTACHMENT DRAG/DROP CONTAINER */}
          <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-xl p-6 flex flex-col gap-3">
            <div>
              <label className="text-sm font-bold text-slate-200 tracking-wide block">
                Supporting Assets & Visual Evidence
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Attach mockups, system screenshots, configuration states, or screen recordings (.png, .jpg, .mov, .mp4, .pdf)
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-1">
              <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2 px-4 rounded-lg transition shadow-md active:scale-95 whitespace-nowrap">
                Choose File
                <input 
                  type="file" 
                  accept="image/*,video/*,application/pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-400 truncate">
                {attachmentUrl ? "✅ Asset ready for dispatch" : "No file chosen"}
              </span>
            </div>
            
            {isUploading && (
              <p className="text-xs text-indigo-400 font-medium animate-pulse mt-1">
                ⏳ Packaging file matrix data and routing to secure bucket storage...
              </p>
            )}
            
            {attachmentUrl && (
              <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-800/60">
                <p className="text-xs text-emerald-400 font-semibold">
                  🚀 File synchronized! Cloud token link securely bound to this notification instance.
                </p>
              </div>
            )}
          </div>

          {/* CONTROL SUBMIT PANEL */}
          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-gradient-to-r from-slate-100 to-white hover:from-white hover:to-white text-slate-950 font-bold py-3.5 px-4 rounded-lg transition duration-200 shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {isUploading ? 'Synchronizing Media Streams...' : 'Submit to Intake Backlog'}
          </button>
        </form>
      </div>
    </main>
  );
}