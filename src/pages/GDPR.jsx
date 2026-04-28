// src/pages/GDPR.jsx
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function GDPR() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
        >
          <div className="text-center mb-6">
            <Shield className="w-10 h-10 text-primary mx-auto mb-2" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">GDPR Compliance</h1>
            <p className="text-gray-500 text-sm">General Data Protection Regulation</p>
          </div>
          <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
            <p>PollMeNow is committed to protecting your personal data and respecting your privacy rights under the GDPR (Regulation (EU) 2016/679).</p>
            <h2 className="text-base font-semibold text-gray-800">Your rights under GDPR</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Right to access:</strong> Request a copy of your personal data.</li>
              <li><strong>Right to rectification:</strong> Correct inaccurate information.</li>
              <li><strong>Right to erasure ("right to be forgotten"):</strong> Delete your account and data.</li>
              <li><strong>Right to restrict processing:</strong> Limit how we use your data.</li>
              <li><strong>Right to data portability:</strong> Receive your data in a structured format.</li>
              <li><strong>Right to object:</strong> Object to direct marketing or legitimate interest processing.</li>
            </ul>
            <h2 className="text-base font-semibold text-gray-800">How to exercise your rights</h2>
            <p>Contact us at <a href="mailto:privacy@pollmenow.com" className="text-primary hover:underline">privacy@pollmenow.com</a>. We will respond within 30 days.</p>
            <h2 className="text-base font-semibold text-gray-800">Data retention</h2>
            <p>We retain your data as long as your account is active. Upon deletion, your data is removed within 30 days, except where required by law.</p>
            <p>For full details, read our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}