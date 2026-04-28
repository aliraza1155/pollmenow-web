// src/components/ShareWidget.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Share2, Link as LinkIcon, MessageCircle, QrCode, X, Mail } from 'lucide-react';

export default function ShareWidget({ poll, onShare, creator }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const pollUrl = `${window.location.origin}/poll/${poll.id}`;
  const encodedUrl = encodeURIComponent(pollUrl);
  const encodedMessage = encodeURIComponent(
    poll.accessCode
      ? `🗳️ Vote on this poll: "${poll.question}"\n\nAccess code: ${poll.accessCode}\n\n${pollUrl}`
      : `🗳️ Vote on this poll: "${poll.question}"\n\n${pollUrl}`
  );

  const shareData = {
    title: poll.question,
    text: poll.accessCode ? `Vote on "${poll.question}" (code: ${poll.accessCode})` : `Vote on "${poll.question}"`,
    url: pollUrl,
  };

  const shareLinks = [
    { name: 'Twitter', href: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`, color: 'bg-[#1DA1F2] hover:bg-[#1a8cd8]', label: '𝕏' },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, color: 'bg-[#0A66C2] hover:bg-[#0956a8]', label: 'in' },
    { name: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${encodedMessage}`, color: 'bg-[#25D366] hover:bg-[#20b858]' },
    { name: 'Email', icon: Mail, href: `mailto:?subject=${encodeURIComponent(poll.question)}&body=${encodedMessage}`, color: 'bg-gray-600 hover:bg-gray-700' },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(poll.accessCode ? `${pollUrl}\nAccess code: ${poll.accessCode}` : pollUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShare?.();
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        onShare?.();
      } catch (err) {
        // User cancelled
      }
    } else {
      copyToClipboard();
    }
  };

  const creatorData = creator || poll.creator;

  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      {/* Header with PollMeNow branding */}
      <div className="bg-gradient-to-r from-primary to-secondary px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">P</span>
          </div>
          <span className="text-white font-semibold text-sm">PollMeNow</span>
        </div>
        <span className="text-white/80 text-[10px] uppercase tracking-wider">Share this poll</span>
      </div>

      <div className="p-5">
        {/* Poll question */}
        <h3 className="text-base font-bold text-gray-900 mb-3 line-clamp-2">
          “{poll.question}”
        </h3>

        {/* Creator info */}
        {creatorData && (
          <Link
            to={`/profile/${creatorData.id}`}
            className="flex items-center gap-2 mb-4 group"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {creatorData.profileImage ? (
                <img src={creatorData.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                (creatorData.name?.[0] || 'U').toUpperCase()
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 group-hover:text-primary transition">
                {creatorData.name}
              </p>
              <p className="text-[10px] text-gray-400">Poll creator</p>
            </div>
          </Link>
        )}

        {/* Access code (if private) */}
        {poll.accessCode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-amber-700">🔑 Access code</span>
              <p className="text-lg font-mono font-bold text-amber-800 tracking-wider">{poll.accessCode}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(poll.accessCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="text-amber-700 hover:text-amber-900 transition"
            >
              <Copy size={16} />
            </button>
          </div>
        )}

        {/* Share buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <LinkIcon size={16} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={shareNative}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-white py-2.5 rounded-xl text-sm font-medium shadow-sm hover:shadow transition"
            >
              <Share2 size={16} />
              Share via...
            </button>
          </div>

          {/* Social media icons - using text for Twitter/LinkedIn */}
          <div className="flex justify-center gap-2 pt-2 border-t border-gray-100">
            {shareLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 ${social.color} text-white shadow-sm font-bold`}
                aria-label={`Share on ${social.name}`}
              >
                {social.icon ? <social.icon size={16} /> : social.label}
              </a>
            ))}
            <button
              onClick={() => setShowQR(true)}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition"
              aria-label="Show QR code"
            >
              <QrCode size={16} />
            </button>
          </div>

          {/* Direct link display */}
          <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
            <p className="text-[11px] text-gray-400 truncate">
              {pollUrl}
              {poll.accessCode && <span className="text-amber-600 ml-1">(code: {poll.accessCode})</span>}
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-gray-800">QR Code</h4>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="bg-white p-2 rounded-xl inline-block mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pollUrl + (poll.accessCode ? `\nAccess code: ${poll.accessCode}` : ''))}`}
                alt="QR Code"
                className="w-32 h-32 mx-auto"
              />
            </div>
            <p className="text-xs text-gray-500 mt-3">Scan to vote on this poll</p>
            <button
              onClick={copyToClipboard}
              className="mt-4 w-full bg-primary/10 text-primary py-2 rounded-lg text-sm font-medium"
            >
              Copy link instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}