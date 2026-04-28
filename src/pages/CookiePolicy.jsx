// src/pages/CookiePolicy.jsx
import { motion } from 'framer-motion';
import { Cookie } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
        >
          <div className="text-center mb-6">
            <Cookie className="w-10 h-10 text-primary mx-auto mb-2" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cookie Policy</h1>
            <p className="text-gray-500 text-sm">Effective: April 28, 2026</p>
          </div>
          <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
            <p>PollMeNow uses cookies and similar tracking technologies to enhance your experience, analyse usage, and personalise content.</p>
            <h2 className="text-base font-semibold text-gray-800">What are cookies?</h2>
            <p>Cookies are small text files stored on your device when you visit a website. They help us remember your preferences and improve functionality.</p>
            <h2 className="text-base font-semibold text-gray-800">How we use cookies</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Essential cookies:</strong> Required for login, voting, and core features.</li>
              <li><strong>Analytics cookies:</strong> To understand how users interact with our site.</li>
              <li><strong>Local storage:</strong> Used to store your vote preferences and prevent duplicate voting.</li>
            </ul>
            <h2 className="text-base font-semibold text-gray-800">Your choices</h2>
            <p>You can manage cookies through your browser settings. However, disabling essential cookies may break functionality like voting and login.</p>
            <p>For more information, see our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}