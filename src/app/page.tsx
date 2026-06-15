'use client';

import { useState } from 'react';

export default function CombinedIntakePage() {
  // Your original form states
  const [title, setTitle] = useState('');
  const [requester, setRequester] = useState('');
  const [dept, setDept] = useState('');
  const [targetProd, setTargetProd] = useState('');
  const [score, setScore] = useState('5');
  const [requestType, setRequestType] = useState('feature'); // 'bug' or 'feature'

  // File Upload State Trackers
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Products list from your master copy
  const [products] = useState([
    'The Placement Pool',
    'Pearl',
    'Zilla',
    'Other'
  ]);

  // GOOGLE CHAT WEBHOOK NOTIFICATION ENGINE
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

      // Dynamically attach the screenshot/video link if it exists
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

  // SUPABASE COURIER: STREAMS UPLOADS TO YOUR PUBLIC BUCKET
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Relative import ensures compilation succeeds on Vercel flawlessly
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
    
    // Clear form inputs
    setTitle('');
    setRequester('');
    setDept('');
    setAttachmentUrl(null);
  };

  return (
    <main className="p-8 max-w-2xl mx-auto font-sans">
      {/* HEADER SECTION */}
      <div className="mb-8 border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Emi-vation Station</h1>
        <p className="text-sm text-gray-500 mt-1">Unified Intake Backlog & Lifecycle Control Portal</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-5">
        {/* REQUEST TYPE SELECTOR */}
        <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setRequestType('feature')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${requestType === 'feature' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            ✨ Feature Request
          </button>
          <button
            type="button"
            onClick={() => setRequestType('bug')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${requestType === 'bug' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            🚨 Bug Report
          </button>
        </div>

        {/* TITLE INPUT */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Ticket Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short descriptive summary of the item..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* SUBMITTER & DEPARTMENT GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Your Name</label>
            <input
              type="text"
              required
              value={requester}
              onChange={(e) => setRequester(e.target.value)}
              placeholder="E.g., Laura Faulk"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Department</label>
            <input
              type="text"
              required
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              placeholder="E.g., Innovation / Support"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* TARGET PRODUCT DROPDOWN */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Product Scope Target</label>
          <select
            value={targetProd}
            onChange={(e) => setTargetProd(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select Target System --</option>
            {products.map((prod) => (
              <option key={prod} value={prod}>{prod}</option>
            ))}
          </select>
        </div>

        {/* IMPACT SCORE SLIDER */}
        <div className="flex flex-col gap-1.5 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-700">Priority & Impact Level</label>
            <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
              {score} / 10
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full accent-indigo-600 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none mt-2"
          />
          <div className="flex justify-between text-[10px] text-gray-400 px-1 mt-1">
            <span>Low Priority</span>
            <span>Critical Blocking Blocker</span>
          </div>
        </div>

        {/* INTEGRATED DRAG & DROP FILE UPLOADER */}
        <div className="bg-indigo-50/50 border border-dashed border-indigo-200 rounded-lg p-5 flex flex-col gap-2">
          <label className="text-sm font-semibold text-indigo-950">
            Supporting Assets & Visual Evidence
          </label>
          <p className="text-xs text-gray-500">
            Attach mockups, system screenshots, configuration states, or screen recordings (.png, .jpg, .mov, .mp4, .pdf)
          </p>
          
          <input 
            type="file" 
            accept="image/*,video/*,application/pdf"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 mt-2
              file:mr-4 file:py-2 file:px-4 
              file:rounded-md file:border-0 
              file:text-sm file:font-semibold 
              file:bg-indigo-600 file:text-white 
              hover:file:bg-indigo-700 disabled:opacity-50 cursor-pointer"
          />
          
          {isUploading && (
            <p className="text-xs text-indigo-600 font-medium animate-pulse mt-2">
              ⏳ Compiling file data segments and streaming to cloud vault storage...
            </p>
          )}
          
          {attachmentUrl && (
            <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
              <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                ✅ File successfully attached! URL generated for Google Chat distribution.
              </p>
            </div>
          )}
        </div>

        {/* CONTROL BUTTON PANEL */}
        <button
          type="submit"
          disabled={isUploading}
          className="w-full bg-gray-950 hover:bg-gray-900 text-white font-medium py-3 px-4 rounded-md transition duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Streaming Upload Assets...' : 'Submit to Intake Backlog'}
        </button>
      </form>
    </main>
  );
}