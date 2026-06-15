'use client';

import { useState } from 'react';

export default function ProjectRequestStation() {
  // Original Form Data Fields
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [product, setProduct] = useState('');
  const [requestType, setRequestType] = useState('feature'); // 'feature' or 'bug'
  const [title, setTitle] = useState('');
  const [problemText, setProblemText] = useState('');
  const [score, setScore] = useState('5');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('$0');
  const [savings, setSavings] = useState('$0');
  const [metrics, setMetrics] = useState('');

  // File Upload Infrastructure
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Original Form Dropdown Options
  const departments = [
    'Accounting', 'Brand Promise', 'Copilot', 'DB Service', 
    'DEV', 'IT', 'Innovation', 'Launch', 'Legal', 
    'Marketing', 'Ops', 'Patient Billing 3.0', 'People Services', 
    'Practice Booster & eAssist Publishing', 'Regional Lead', 'Sales'
  ];

  const products = [
    'eAssist Portal', 'Launch Lagoon', 'Opal', 'Oracle', 'Signature App',
    'TL Memo Board', 'The Placement Pool', 'Pearl', 'Zilla', 'Other'
  ];

  // GOOGLE CHAT DISPATCH SYSTEM
  async function triggerGoogleChatNotification(ticketNumber: number) {
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_CHAT_WEBHOOK_URL || "https://chat.googleapis.com/v1/spaces/AAQApvgFOAQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=GnRq0Ik-EjmjbGZpgbh7R1Cy6yZSg_5IANIuZY7RI7E";

      const emoji = requestType === 'bug' ? '🚨' : '✨';
      const heading = requestType === 'bug' ? 'New System Issue Spotted!' : 'New Wish Arrived at Emi-vation Station!';
      
      const fileSection = attachmentUrl 
        ? `*📎 Attached Evidence:* <${attachmentUrl}|View Attached Media Asset>\n\n` 
        : '\n';

      const chatPayload = {
        text: `${emoji} *${heading}*\n\n` +
              `*📋 Title:* ${title || 'Untitled Request'} (#${ticketNumber})\n` +
              `*👤 Submitter:* ${name}\n` +
              `*🏢 Department:* ${department}\n` +
              `*💻 Product Target:* ${product}\n` +
              `*📊 Impact Score:* ${score}/10\n` +
              `*💰 Budget/Savings:* ${budget} / ${savings}\n` +
              fileSection +
              `*⚙️ Logged to Intake Backlog and awaiting technical wizard assignment.*`
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatPayload),
      });
    } catch (error) {
      console.error("Notification pipeline error:", error);
    }
  }

  // SUPABASE ATTACHMENT CONTROLLER
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
      console.error("Storage error:", error);
      alert("Attachment storage failed. Verify your Supabase storage bucket permissions.");
    } finally {
      setIsUploading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticketNum = Math.floor(1000 + Math.random() * 9000);
    await triggerGoogleChatNotification(ticketNum);
    alert(`Success! Ticket #${ticketNum} has been logged to development pipeline.`);
    
    // Clean fields
    setTitle('');
    setProblemText('');
    setDescription('');
    setMetrics('');
    setAttachmentUrl(null);
  };

  return (
    <main className="min-h-screen bg-[#0b111e] text-white p-4 sm:p-8 flex flex-col items-center font-sans selection:bg-purple-500 selection:text-white">
      
      {/* BRANDING HEADER CONTAINER */}
      <div className="w-full max-w-[850px] rounded-2xl overflow-hidden shadow-2xl mb-6 border border-slate-800/50">
        <img 
          src="/image_81fa83.png" 
          alt="Emi-vation Project Requests Banner" 
          className="w-full h-auto object-cover"
        />
      </div>

      {/* CORE INTERACTION CARD */}
      <div className="w-full max-w-[850px] bg-[#111827]/90 rounded-2xl p-6 sm:p-10 border border-slate-800/80 shadow-2xl backdrop-blur-md">
        
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#fbcfe8] tracking-tight flex items-center gap-2">
            ✨ Project Request Station
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Please fill out the technical specifications below to wire your item to development.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* USER INFO SECTION ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">Please Tell Us Your Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your answer"
                className="w-full px-4 py-3 bg-[#030712] border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">What Department/Team is This Request For? *</label>
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 bg-[#030712] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 transition cursor-pointer appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23a78bfa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
              >
                <option value="">Choose</option>
                {departments.map((deptItem) => (
                  <option key={deptItem} value={deptItem} className="bg-[#030712]">{deptItem}</option>
                ))}
              </select>
            </div>
          </div>

          {/* PRODUCT MATRIX SELECTION GRID */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">What Product Are You Requesting This For? *</label>
            <div className="bg-[#030712]/60 border border-slate-800/80 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((prodItem) => (
                <label key={prodItem} className="flex items-center gap-3 cursor-pointer group text-sm text-slate-300 hover:text-white transition">
                  <input
                    type="radio"
                    name="productScope"
                    required
                    value={prodItem}
                    checked={product === prodItem}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 focus:ring-purple-500 focus:ring-offset-slate-900"
                  />
                  <span className="group-hover:translate-x-0.5 transition duration-150">{prodItem}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CLASSIFICATION TYPE TOGGLE SWITCH */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">Hello! How Can We Assist You Today? Would You Like To: *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition duration-200 ${requestType === 'feature' ? 'bg-[#241442]/40 border-purple-500/80 shadow-md' : 'bg-[#030712]/40 border-slate-800 hover:border-slate-700'}`}>
                <input
                  type="radio"
                  name="reqType"
                  value="feature"
                  checked={requestType === 'feature'}
                  onChange={() => setRequestType('feature')}
                  className="mt-0.5 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="block text-sm font-bold text-white">💡 Feature Request</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">I am requesting a brand new tool, enhancement, or feature pipeline asset.</span>
                </div>
              </label>

              <label className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition duration-200 ${requestType === 'bug' ? 'bg-[#3b1219]/40 border-rose-500/80 shadow-md' : 'bg-[#030712]/40 border-slate-800 hover:border-slate-700'}`}>
                <input
                  type="radio"
                  name="reqType"
                  value="bug"
                  checked={requestType === 'bug'}
                  onChange={() => setRequestType('bug')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="block text-sm font-bold text-white">🚨 System Issue / Error</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">Something is broken, sluggish, throwing error screens, or acting wrong.</span>
                </div>
              </label>
            </div>
          </div>

          {/* DYNAMIC TITLE LABEL VALUE HEADER */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">
              {requestType === 'bug' ? 'TITLE OF SYSTEM ISSUE / ERROR *' : 'TITLE OF NEW FEATURE (IF YOU HAVE ONE)'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Automated Intake Report Pipeline"
              className="w-full px-4 py-3 bg-[#030712] border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* VALUE STATEMENT TEXTAREA */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">What Problem Does This Solve Or What Opportunity Does It Address? *</label>
            <textarea
              required
              rows={3}
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="Provide context on what friction points this feature eliminates..."
              className="w-full px-4 py-3 bg-[#030712] border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition resize-none"
            />
          </div>

          {/* OPERATIONAL RANGE SLIDER CONTROL */}
          <div className="flex flex-col gap-2.5 p-5 bg-[#030712]/40 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">Estimated Impact/Benefit Score *</label>
              <span className="text-xs font-extrabold bg-[#241442] text-purple-300 border border-purple-500/30 px-3 py-1 rounded-md">
                {score} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none mt-2"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium px-0.5 mt-1">
              <span>Low Impact</span>
              <span>Medium Impact</span>
              <span>Critical Business Priority</span>
            </div>
          </div>

          {/* REQUIREMENTS DETAILS TEXTAREA */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">Detailed Description / Requirements *</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline specific steps, data handling, user roles, or interface requirements..."
              className="w-full px-4 py-3 bg-[#030712] border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition resize-none"
            />
          </div>

          {/* FINANCIAL ESTIMATIONS TWIN GRID ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">Project Budget (If Applicable)</label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-4 py-3 bg-[#030712] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">Estimated Monthly/Annual Savings</label>
              <input
                type="text"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
                className="w-full px-4 py-3 bg-[#030712] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          {/* SUCCESS TARGET PERFORMANCE KPI */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold tracking-wider uppercase text-[#c084fc]">Success Metrics / Target KPI Improvements *</label>
            <textarea
              required
              rows={2}
              value={metrics}
              onChange={(e) => setMetrics(e.target.value)}
              placeholder="How will success be measured? (e.g., Saves 5 hours/week, speeds up onboarding by 2 days, drops bug rate by 20%)"
              className="w-full px-4 py-3 bg-[#030712] border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition resize-none"
            />
          </div>

          {/* THE NEW PLUG-IN SECURE STORAGE FILE DROP ZONE */}
          <div className="bg-[#030712]/50 border border-dashed border-slate-700 rounded-xl p-6 flex flex-col gap-3">
            <div>
              <label className="text-sm font-bold text-slate-200 tracking-wide block">
                Supporting Assets & Visual Evidence
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Attach mockups, system screenshots, configuration states, or screen recordings (.png, .jpg, .mov, .mp4, .pdf)
              </p>
            </div>
            
            <div className="flex items-center gap-4 mt-1">
              <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm py-2.5 px-5 rounded-xl transition shadow-md active:scale-95 whitespace-nowrap">
                Choose File
                <input 
                  type="file" 
                  accept="image/*,video/*,application/pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-400 truncate font-medium">
                {attachmentUrl ? "✅ Asset ready for dispatch" : "No file chosen"}
              </span>
            </div>
            
            {isUploading && (
              <p className="text-xs text-purple-400 font-medium animate-pulse mt-1">
                ⏳ Packaging file matrix data and routing to secure bucket storage...
              </p>
            )}
            
            {attachmentUrl && (
              <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-800/50">
                <p className="text-xs text-emerald-400 font-semibold">
                  🚀 File synchronized! Cloud token link securely bound to this notification instance.
                </p>
              </div>
            )}
          </div>

          {/* ACTION SUBMIT CONTROLLER */}
          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 px-4 rounded-xl transition duration-200 shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-[0.99] border border-purple-500/20"
          >
            {isUploading ? 'Streaming Upload Assets...' : '🔮 Submit Wish To Emi-vation Station'}
          </button>
        </form>
      </div>
    </main>
  );
}