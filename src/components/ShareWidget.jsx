// src/components/ShareWidget.jsx
import { useState } from 'react';

export default function ShareWidget({ poll, onShare }) {
  const [copied, setCopied] = useState(false);

  const pollUrl = `${window.location.origin}/poll/${poll.id}`;
  const message = poll.accessCode
    ? `🗳️ Vote on this poll: "${poll.question}"\n\nUse access code: ${poll.accessCode}\n\n${pollUrl}`
    : `🗳️ Vote on this poll: "${poll.question}"\n\n${pollUrl}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShare();
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: poll.question,
          text: message,
          url: pollUrl,
        });
        onShare();
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="text-center">
      <h3 className="text-lg font-bold mb-2">Share Poll</h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">"{poll.question}"</p>
      <div className="flex flex-col gap-3">
        <button onClick={copyToClipboard} className="bg-primary text-white py-2 rounded-lg flex items-center justify-center gap-2">
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button onClick={shareNative} className="border border-primary text-primary py-2 rounded-lg">Share via...</button>
      </div>
    </div>
  );
}