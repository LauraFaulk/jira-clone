'use client';

import { useState } from 'react';

export default function StandaloneIntakePage() {
  const [products] = useState([
    'The Placement Pool',
    'Pearl',
    'Zilla',
    'Other'
  ]);

  // File Upload State Trackers
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // HELPER FUNCTION: SENDS CHAT LOGS WITH THE ATTACHMENT EVIDENCE LINK
  async function triggerGoogleChatNotification(
    title: string, 
    requester: string, 
    dept: string, 
    targetProd: string, 
    score: string, 
    ticketNumber: number, 
    requestType: string,
    fileUrl: string | null
  ) {
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_CHAT_WEBHOOK_URL || "https://chat.googleapis.com/v1/spaces/AAQApvgFOAQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=GnRq0Ik-EjmjbGZpgbh7R1Cy6yZSg_5IANIuZY7RI7E";

      const emojiType = requestType === 'bug' ? '🚨' : '✨';
      const headingText = requestType === 'bug' ? 'New System Issue Spotted!' : 'New Wish Arrived at Emi-vation Station!';

      // If a file is attached, dynamically build a hyperlink block for the chat card
      const attachmentSection = fileUrl 
        ? `*📎 Attached Evidence:* <${fileUrl}|View Screenshot / Asset>\n\n` 
        : '\n';

      const chatPayload = {
        text: `${emojiType} *${headingText}*\n\n` +
              `*📋 Title:* ${title} (#${ticketNumber})\n` +
              `*👤 Submitter:* ${requester}\n` +
              `*🏢 Department:* ${dept}\n` +
              `*💻 Product Target:* ${targetProd}\n` +
              `*📊 Impact Score:* ${score}/10\n` +
              attachmentSection +
              `*⚙️ Logged to Intake Backlog and awaiting technical wizard assignment.*`
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatPayload),
      });

    } catch (error) {
      console.error("Failed to post automated notification to Google Chat Space:", error);
    }
  }

  // CORE ENGINE: STREAMS UPLOADS DIRECTLY TO SECURE SUPABASE STORAGE BUCKET
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Dynamic inline fetch of your standard client initialization module
      const { supabase } = await import('../supabaseClient'); 
      
      // Sanitizes and constructs an un-clashable storage destination filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Stream the raw payload straight into the public bucket container asset bucket
      const { error: uploadError } = await supabase.storage
        .from('intake-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Extract the absolute cloud cdn path route mapping endpoint for the entry
      const { data } = supabase.storage
        .from('intake-attachments')
        .getPublicUrl(filePath);

      setAttachmentUrl(data.publicUrl);

    } catch (error) {
      console.error("Supabase Storage Target Error:", error);
      alert("Attachment stream pipeline failed. Ensure your bucket is configured as public.");
    } finally {
      setIsUploading(false);
    }
  }

  // MOCK FORM SUBMIT IMPLEMENTATION CONTAINER
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sample static form values representing your current form fields wrapper data
    const sampleTitle = "Intake Pipeline Asset Test";
    const sampleRequester = "System Administrator";
    const sampleDept = "Innovation";
    const sampleProduct = products[0];
    const sampleScore = "8";
    const sampleTicketNumber = Math.floor(Math.random() * 1000);
    const sampleType = "feature"; 

    // Passes form parameters plus our attachment link right into our notification engine
    await triggerGoogleChatNotification(
      sampleTitle, 
      sampleRequester, 
      sampleDept, 
      sampleProduct, 
      sampleScore, 
      sampleTicketNumber, 
      sampleType, 
      attachmentUrl
    );
    
    alert("Ticket processed successfully and routed to Emi-vation Station!");
  };

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <div className="mb-8 border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Emi-vation Station</h1>
        <p className="text-sm text-gray-500 mt-1">Unified Intake Backlog & Lifecycle Deployment Control Portal</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* INTERACTIVE ASSET ATTACHMENT BOX CONTAINER */}
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-800">
            Supporting Assets & Visual Evidence
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Attach mockups, system screenshots, configuration states, or screen recordings (.png, .jpg, .mov, .mp4, .pdf)
          </p>
          
          <input 
            type="file" 
            accept="image/*,video/*,application/pdf"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 
              file:mr-4 file:py-2 file:px-4 
              file:rounded-md file:border-0 
              file:text-sm file:font-semibold 
              file:bg-indigo-50 file:text-indigo-700 
              hover:file:bg-indigo-100 disabled:opacity-50 cursor-pointer"
          />
          
          {isUploading && (
            <p className="text-xs text-indigo-600 font-medium animate-pulse mt-2">
              ⏳ Encrypting file components and streaming to secure bucket storage...
            </p>
          )}
          
          {attachmentUrl && (
            <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
              <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                ✅ File successfully attached! Direct Link generated for Workspace Routing.
              </p>
            </div>
          )}
        </div>

        {/* ACTIONS CONTROL PANEL */}
        <button
          type="submit"
          disabled={isUploading}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-md transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Waiting on Upload Complete...' : 'Submit to Intake Backlog'}
        </button>
      </form>
    </main>
  );
}