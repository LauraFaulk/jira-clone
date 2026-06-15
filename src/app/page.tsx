'use client';

import { useState } from 'react';

export default function StandaloneIntakePage() {
  const products = [
    'The Placement Pool',
    'Pearl',
    'Zilla',
    'Other'
  ];

  // HELPER FUNCTION: SENDS CHAT LOGS WITH THE SYSTEM TICKET NUMBER
  async function triggerGoogleChatNotification(title: string, requester: string, dept: string, targetProd: string, score: string, ticketNumber: number, requestType: string) {
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_CHAT_WEBHOOK_URL || "https://chat.googleapis.com/v1/spaces/AAQApvgFOAQ/messages?key=AIzaSyDdI0hCZE6vySjMm-WEFrq3CPzgKqqsHI&token=GnRq0Ik-EjmjbGZpgbh7R1Cy6yZSg_5IANIuZY7RI7E&avatar_url=https://lh3.googleusercontent.com/d/1bwXyKFYgVCbhVwo2extZp2JN6OZkpK5J";

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

  // Rest of your intake page component UI layout (form fields, state mapping, etc.) continues here...
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Emi-vation Station Wish Intake</h1>
      <p className="text-sm text-gray-500 mb-4">Form submission engine active. Ready to route tickets.</p>
      {/* Your form UI mapping components go right below here */}
    </main>
  );
}