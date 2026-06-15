'use client';

import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function StandaloneIntakePage() {
  const [submitterName, setSubmitterName] = useState('');
  const [department, setDepartment] = useState('');
  const [product, setProduct] = useState('eAssist Portal');
  const [requestType, setRequestType] = useState('feature');
  const [featureTitle, setFeatureTitle] = useState('');
  const [problemSolved, setProblemSolved] = useState('');
  const [impactScore, setImpactScore] = useState('5');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [projectBudget, setProjectBudget] = useState('$0');
  const [annualSavings, setAnnualSavings] = useState('$0');
  const [successMetrics, setSuccessMetrics] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  const products = [
    'eAssist Portal', 
    'Launch Lagoon', 
    'Opal', 
    'Oracle', 
    'Signature App',
    'TL Memo Board',
    'The Placement Pool',
    'Pearl',
    'Zilla',
    'Other'
  ];

  // HELPER FUNCTION: SENDS CHAT LOGS WITH THE SYSTEM TICKET NUMBER
  async function triggerGoogleChatNotification(title: string, requester: string, dept: string, targetProd: string, score: string, ticketNumber: number) {
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_CHAT_WEBHOOK_URL || "https://chat.googleapis.com/v1/spaces/AAQApvgFOAQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=GnRq0Ik-EjmjbGZpgbh7R1Cy6yZSg_5IANIuZY7RI7E";
      
      const emojiType = requestType === 'bug' ? '🚨' : '✨';
      const headingText = requestType === 'bug' ? 'New System Issue Spotted!' : 'New Wish Arrived at Emi-vation Station!';

      // Title now includes the sequential ticket number in parentheses right beside it!
      const chatPayload = {
        text: `${emojiType} *${headingText}*\n\n` +
              `*📋 Title:* ${title} (#${ticketNumber})\n` +
              `*👤 Submitter:* ${requester}\n` +
              `*🏢 Department:* ${dept}\n` +
              `*💻 Product Target:* ${targetProd}\n` +
              `*📊 Impact Score:* ${score}/10\n\n` +
              `⚙️ _Logged to Intake Backlog and awaiting technical wizard assignment._`
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatPayload),
        mode: 'no-cors'
      });
    } catch (err) {
      console.error("Google Chat room update dispatch exception:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    const finalTitle = featureTitle.trim() || `New ${requestType === 'bug' ? 'Bug' : 'Request'} from ${submitterName}`;

    const formattedDescription = `👤 **Requester:** ${submitterName}
🏢 **Department/Team:** ${department}
💻 **Target Product:** ${product}

---

### ${requestType === 'bug' ? '🚨 BUG REPORT DETAILS' : '💡 FEATURE REQUEST DETAILS'}

🎯 **Problem Solved / Expected Benefits:**
${problemSolved}

📊 **Estimated Impact/Benefit Score:** ${impactScore}/10

📝 **Detailed Description:**
${detailedDescription}

💰 **Project Budget:** ${projectBudget}

📉 **Estimated Monthly/Annual Savings:** ${annualSavings}

📈 **Success Metrics / Target KPI Improvements:**
${successMetrics}`;

    // .select() forces Supabase to return the newly generated row data (including the auto-increment ID number!)
    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          title: finalTitle,
          description: formattedDescription,
          status: 'Backlog',
          priority: 'Medium',
          is_archived: false,
          attachments: [],
          subtasks: []
        },
      ])
      .select();

    if (error) {
      console.error('Submission failed:', error);
      setSubmitStatus({ success: false, message: 'Oh no! Something went wrong wiring your item to development. Please try again.' });
      setIsSubmitting(false);
    } else {
      setSubmitStatus({ success: true, message: '✨ Wish successfully submitted! It has been safely wired straight to Emi-vation Station development.' });
      
      // Grab the auto-increment numerical ID from the insertion return
      const assignedId = data && data[0] ? data[0].id : 0;

      // DISPATCH GOOGLE CHAT NOTIFICATION WITH THE CORRECT ID
      await triggerGoogleChatNotification(finalTitle, submitterName, department, product, impactScore, assignedId);

      // Clear fields
      setSubmitterName('');
      setDepartment('');
      setFeatureTitle('');
      setProblemSolved('');
      setDetailedDescription('');
      setSuccessMetrics('');
      setProjectBudget('$0');
      setAnnualSavings('$0');
      setImpactScore('5');
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ backgroundImage: 'url("/emivation-background.png")' }} className="min-h-screen w-screen bg-gray-950 bg-cover bg-center flex flex-col items-center justify-start p-4 overflow-y-auto font-sans select-none relative">
      <div className="absolute inset-0 bg-gray-950/60 pointer-events-none z-0" />
      
      {/* HEADER BANNER SECTION */}
      <div className="w-full max-w-5xl mt-6 mb-8 shrink-0 relative z-10 select-none">
        <img 
          src="/emivation-station.png" 
          alt="Emi-vation Station Project Requests banner with stylized character" 
          className="w-full h-auto rounded-3xl border border-gray-800 shadow-2xl"
          draggable="false"
        />
      </div>

      {/* REQUEST FORM CONTAINER */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-2xl max-w-5xl w-full p-6 md:p-8 shadow-2xl backdrop-blur-md relative z-10 text-gray-100 select-text mb-8 max-h-[85vh] flex flex-col">
        
        <div className="border-b border-gray-800 pb-4 mb-6 shrink-0 text-center sm:text-left">
          <h1 className="text-2xl font-black text-purple-400 tracking-wide flex items-center justify-center sm:justify-start gap-2 [font-family:var(--font-elsie)]">
            ✨ Project Request Station
          </h1>
          <p className="text-xs text-gray-400 mt-1.5">Please fill out the technical specifications below to wire your item to development.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-6 text-sm">
          
          {/* Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-purple-400 block mb-1.5 uppercase tracking-wider select-none">Please Tell Us Your Name *</label>
              <input 
                type="text" 
                required 
                placeholder="Your answer" 
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500 font-sans" 
              />
            </div>

            <div>
              <label className="text-xs font-bold text-purple-400 block mb-1.5 uppercase tracking-wider select-none">What Department/Team is this request for? *</label>
              <select 
                required 
                value={department} 
                onChange={(e) => setDepartment(e.target.value)} 
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 font-sans cursor-pointer"
              >
                <option value="" className="text-slate-900 bg-white">Choose</option>
                <option value="Accounting" className="text-slate-900 bg-white">Accounting</option>
                <option value="Brand Promise" className="text-slate-900 bg-white">Brand Promise</option>
                <option value="Copilot" className="text-slate-900 bg-white">Copilot</option>
                <option value="DB Service" className="text-slate-900 bg-white">DB Service</option>
                <option value="DEV" className="text-slate-900 bg-white">DEV</option>
                <option value="IT" className="text-slate-900 bg-white">IT</option>
                <option value="Internal Education" className="text-slate-900 bg-white">Internal Education</option>
                <option value="Innovation" className="text-slate-900 bg-white">Innovation</option>
                <option value="Launch" className="text-slate-900 bg-white">Launch</option>
                <option value="Legal" className="text-slate-900 bg-white">Legal</option>
                <option value="Marketing" className="text-slate-900 bg-white">Marketing</option>
                <option value="Ops" className="text-slate-900 bg-white">Ops</option>
                <option value="Patient Billing 3.0" className="text-slate-900 bg-white">Patient Billing 3.0</option>
                <option value="People Services" className="text-slate-900 bg-white">People Services</option>
                <option value="Practice Booster & eAssist Publishing" className="text-slate-900 bg-white">Practice Booster & eAssist Publishing</option>
                <option value="Regional Lead" className="text-slate-900 bg-white">Regional Lead</option>
                <option value="Sales" className="text-slate-900 bg-white">Sales</option>
                <option value="Talent Onboarding" className="text-slate-900 bg-white">Talent Onboarding</option>
                <option value="Talent Placement" className="text-slate-900 bg-white">Talent Placement</option>
              </select>
            </div>
          </div>

          {/* Product Targets */}
          <div>
            <label className="text-xs font-bold text-purple-400 block mb-2 uppercase tracking-wider select-none">What product are you requesting this for? *</label>
            <div className="bg-gray-950/50 border border-gray-800/80 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 select-none">
              {products.map((prod) => (
                <label key={prod} className="flex items-center gap-3 cursor-pointer group text-gray-300 hover:text-white text-xs">
                  <input 
                    type="radio" 
                    name="product_group" 
                    value={prod} 
                    checked={product === prod}
                    onChange={(e) => setProduct(e.target.value)}
                    className="accent-purple-500 w-4 h-4 cursor-pointer" 
                  />
                  <span>{prod}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Classification Selector */}
          <div>
            <label className="text-xs font-bold text-purple-400 block mb-3 uppercase tracking-wider select-none">Hello! How can we assist you today? Would you like to request a feature or report an error? *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
              
              <label 
                onClick={() => setRequestType('feature')}
                className={`flex items-center gap-4 cursor-pointer p-4 rounded-xl border transition-all ${
                  requestType === 'feature'
                    ? 'bg-purple-950/30 border-purple-500 text-white shadow-lg shadow-purple-950/50'
                    : 'bg-gray-950/40 border-gray-800/80 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                }`}
              >
                <input 
                  type="radio" 
                  name="req_type" 
                  checked={requestType === 'feature'} 
                  onChange={() => setRequestType('feature')} 
                  className="accent-purple-500 w-4 h-4 cursor-pointer shrink-0" 
                />
                <div className="flex flex-col text-left">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                    💡 Feature Request
                  </span>
                  <span className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                    I am requesting a brand new tool, enhancement, or feature pipeline asset.
                  </span>
                </div>
              </label>

              <label 
                onClick={() => setRequestType('bug')}
                className={`flex items-center gap-4 cursor-pointer p-4 rounded-xl border transition-all ${
                  requestType === 'bug'
                    ? 'bg-red-500/10 border-red-500 text-white shadow-lg shadow-red-950/30'
                    : 'bg-gray-950/40 border-gray-800/80 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                }`}
              >
                <input 
                  type="radio" 
                  name="req_type" 
                  checked={requestType === 'bug'} 
                  onChange={() => setRequestType('bug')} 
                  className="accent-red-500 w-4 h-4 cursor-pointer shrink-0" 
                />
                <div className="flex flex-col text-left">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                    🚨 System Issue / Error
                  </span>
                  <span className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                    Something is broken, sluggish, throwing error screens, or acting wrong.
                  </span>
                </div>
              </label>

            </div>
          </div>

          {/* Feature Title */}
          <div>
            <label className="text-xs font-bold text-purple-400 block mb-1.5 uppercase tracking-wider select-none">
              {requestType === 'bug' ? 'Title of System Defect / Failure Log' : 'Title of New Feature (If you have one)'}
            </label>
            <input 
              type="text" 
              placeholder={requestType === 'bug' ? "e.g., Portal crash when updating user parameters" : "e.g., Automated Intake Report Pipeline"} 
              value={featureTitle}
              onChange={(e) => setFeatureTitle(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500 font-sans" 
            />
          </div>

          {/* Value Optimization Metrics */}
          <div>
            <label className="text-xs font-bold text-purple-400 block mb-1.5 uppercase tracking-wider select-none">
              {requestType === 'bug' ? 'What workflow actions prompt this issue, and who does it impact? *' : 'What problem does this solve or what opportunity does it address? *'}
            </label>
            <textarea 
              rows={3} 
              required
              placeholder={requestType === 'bug' ? "Explain exactly how to trigger the breakdown..." : "Provide context on what friction points this feature eliminates..."} 
              value={problemSolved}
              onChange={(e) => setProblemSolved(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500 font-sans resize-none" 
            />
          </div>

          {/* Prioritization Score */}
          <div>
            <div className="flex justify-between items-center mb-1 select-none">
              <label className="text-xs font-bold text-purple-400 uppercase tracking-wider">Estimated Impact/Benefit Score *</label>
              <span className="text-purple-400 font-bold font-mono text-sm px-2 py-0.5 bg-purple-950/40 rounded border border-purple-900/40">{impactScore} / 10</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={impactScore}
              onChange={(e) => setImpactScore(e.target.value)}
              className="w-full accent-purple-500 bg-gray-950 cursor-pointer h-2 rounded-lg appearance-none border border-gray-800" 
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-0.5 select-none font-medium">
              <span>Low Impact</span>
              <span>Medium Impact</span>
              <span>Critical Business Priority</span>
            </div>
          </div>

          {/* Detailed Specifications */}
          <div>
            <label className="text-xs font-bold text-purple-400 block mb-1.5 uppercase tracking-wider select-none">
              {requestType === 'bug' ? 'Detailed Technical Logs / Steps to Reproduce *' : 'Detailed Description / Requirements *'}
            </label>
            <textarea 
              rows={4} 
              required
              placeholder={requestType === 'bug' ? "Paste details, error logs, or specific error message phrases here..." : "Outline specific steps, data handling, user roles, or interface requirements..."} 
              value={detailedDescription}
              onChange={(e) => setDetailedDescription(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500 font-sans resize-none" 
            />
          </div>

          {/* Budget & Overhead Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-purple-400 block mb-1.5 uppercase tracking-wider select-none">Project Budget (If applicable)</label>
              <input 
                type="text" 
                value={projectBudget}
                onChange={(e) => setProjectBudget(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 font-sans" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-purple-400 block mb-1.5 uppercase tracking-wider select-none">Estimated Monthly/Annual Savings</label>
              <input 
                type="text" 
                value={annualSavings}
                onChange={(e) => setAnnualSavings(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 font-sans" 
              />
            </div>
          </div>

          {/* Success Metrics Intake */}
          <div>
            <label className="text-xs font-bold text-purple-400 block mb-1.5 uppercase tracking-wider select-none">Success Metrics / Target KPI Improvements *</label>
            <textarea 
              rows={3} 
              required
              placeholder="How will success be measured? (e.g., Saves 5 hours/week, speeds up onboarding by 2 days, drops bug rate by 20%)" 
              value={successMetrics}
              onChange={(e) => setSuccessMetrics(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500 font-sans resize-none" 
            />
          </div>

          {/* Status Message Overlays */}
          {submitStatus && (
            <div className={`p-4 rounded-xl text-xs font-semibold select-none border border-dashed ${
              submitStatus.success 
                ? 'bg-purple-950/40 text-purple-300 border-purple-500/40' 
                : 'bg-red-950/40 text-red-300 border-red-500/40'
            }`}>
              {submitStatus.message}
            </div>
          )}

          {/* Submit Anchor Action Panel */}
          <div className="pt-2 shrink-0 select-none">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black text-base rounded-xl transition shadow-lg shadow-purple-900/30 [font-family:var(--font-elsie)] tracking-wide capitalize"
            >
              {isSubmitting ? '✨ wiring wish to station...' : '✨ submit wish to emi-vation station'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}