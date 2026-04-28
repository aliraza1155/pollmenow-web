// src/pages/ReportAbuse.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Send } from 'lucide-react';

export default function ReportAbuse() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would send the report to your backend or email
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Report Abuse</h1>
            <p className="text-gray-500 text-sm mt-1">Help us keep PollMeNow safe and respectful</p>
          </div>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-medium">Thank you for your report.</p>
              <p className="text-sm text-green-600 mt-1">We'll review it within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type *</label>
                <select required className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20">
                  <option>Spam or misleading content</option>
                  <option>Harassment or hate speech</option>
                  <option>Inappropriate images</option>
                  <option>Privacy violation</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poll URL or ID *</label>
                <input type="text" required placeholder="e.g., /poll/abc123 or full URL" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={4} placeholder="Please provide details..." className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email (optional)</label>
                <input type="email" placeholder="We may contact you for more info" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary text-white py-2.5 rounded-xl font-semibold shadow-sm hover:shadow transition flex items-center justify-center gap-2">
                <Send size={16} /> Submit Report
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}