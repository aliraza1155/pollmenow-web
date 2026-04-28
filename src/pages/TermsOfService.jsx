// src/pages/TermsOfService.jsx
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, Scale, AlertCircle, Users, Shield, DollarSign, Mail } from 'lucide-react';

export default function TermsOfService() {
  const effectiveDate = 'April 28, 2026';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="text-center mb-8">
          <FileText className="w-12 h-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-gray-500 text-sm mt-2">Effective: {effectiveDate}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <p className="text-sm leading-relaxed">
            Welcome to PollMeNow! These Terms of Service ("Terms") govern your access to and use of the PollMeNow website, services, and applications (collectively, the "Service"). By using the Service, you agree to be bound by these Terms. If you do not agree, please do not use the Service.
          </p>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <Users className="w-5 h-5 text-primary" /> 1. Eligibility
            </h2>
            <p>You must be at least 13 years old (or 16 in certain jurisdictions) to use the Service. If you are under the age of majority in your country, you must have your parent or legal guardian’s permission to use the Service. By using the Service, you represent that you meet these eligibility requirements.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <AlertCircle className="w-5 h-5 text-primary" /> 2. Account Registration & Security
            </h2>
            <p>To access certain features (e.g., creating polls, voting on private polls), you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide accurate, current, and complete information during registration.</li>
              <li>Maintain the security of your password and accept all risks of unauthorised access.</li>
              <li>Notify us immediately of any breach of security or unauthorised use of your account.</li>
              <li>Be responsible for all activities that occur under your account, regardless of whether you authorised them.</li>
            </ul>
            <p>We reserve the right to suspend or terminate accounts that violate these Terms or applicable laws.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <FileText className="w-5 h-5 text-primary" /> 3. User Content & Conduct
            </h2>
            <p><strong>Your responsibility:</strong> You retain all ownership rights to the polls, comments, images, and other content you post ("User Content"). By posting, you grant PollMeNow a non‑exclusive, royalty‑free, worldwide license to host, display, and distribute your content solely to operate and promote the Service.</p>
            <p className="mt-2"><strong>Prohibited Content:</strong> You may not post content that:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Is illegal, defamatory, harassing, abusive, or promotes violence.</li>
              <li>Infringes on the intellectual property rights of others.</li>
              <li>Contains malware, viruses, or other harmful code.</li>
              <li>Is intended to manipulate voting results (e.g., vote buying, bots).</li>
              <li>Violates any applicable law or regulation.</li>
            </ul>
            <p><strong>Enforcement:</strong> We reserve the right, but have no obligation, to review, remove, or refuse to display any content we deem objectionable.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <Scale className="w-5 h-5 text-primary" /> 4. Subscription Plans & Payments
            </h2>
            <p>PollMeNow offers a free tier and paid subscription plans ("Premium", "Organization"). By upgrading, you agree to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Pay all fees as described at checkout (prices are displayed in USD and exclude applicable taxes).</li>
              <li>Provide valid, up‑to‑date payment information via Stripe.</li>
              <li>Auto‑renewal: Your subscription will automatically renew at the end of each billing cycle unless you cancel at least 24 hours before renewal. Cancellation can be done from your Dashboard Billing settings.</li>
              <li>Refunds: Monthly subscriptions are non‑refundable. For annual plans, you may request a refund within 7 days of the initial payment. No partial refunds for mid‑cycle cancellation.</li>
              <li>We may change subscription fees with 30 days' notice. Continued use after the price change constitutes acceptance.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <Shield className="w-5 h-5 text-primary" /> 5. AI Features
            </h2>
            <p>Our AI‑powered poll generation and image creation tools use third‑party services (Google Vertex AI, OpenAI). By using these features, you acknowledge that:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>The AI may produce outputs that are not always accurate, appropriate, or original. You are solely responsible for reviewing and editing any AI‑generated content before publishing.</li>
              <li>We do not guarantee the quality, legality, or non‑infringement of AI‑generated content.</li>
              <li>We may log prompts and outputs for quality improvement and abuse prevention, but we do not share them with other users or the public.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <AlertCircle className="w-5 h-5 text-primary" /> 6. Prohibited Activities
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the Service for any illegal purpose or in violation of any local, state, national, or international law.</li>
              <li>Attempt to gain unauthorised access to any part of the Service, other accounts, or computer systems.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service (e.g., DDoS attacks, spamming votes).</li>
              <li>Reverse engineer, decompile, or disassemble any portion of the Service.</li>
              <li>Scrape, crawl, or use automated means to extract data without our express permission.</li>
              <li>Use the Service to send unsolicited commercial messages (spam).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">7. Intellectual Property</h2>
            <p>All content and materials on the Service not provided by users (e.g., logos, graphics, code, design) are the property of PollMeNow or its licensors and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without prior written permission.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">8. Termination</h2>
            <p>You may delete your account at any time from your profile settings or by contacting support. We may suspend or terminate your access to the Service if you breach these Terms or if we are required to do so by law. Upon termination, your right to use the Service will cease immediately, and we may delete your User Content, except where retention is required by law.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">9. Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON‑INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR‑FREE, SECURE, OR FREE FROM VIRUSES.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">10. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL POLLMENOW, ITS DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID US (IF ANY) DURING THE 12 MONTHS PRECEDING THE EVENT.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">11. Indemnification</h2>
            <p>You agree to indemnify and hold harmless PollMeNow and its affiliates from any claims, damages, losses, and expenses (including reasonable legal fees) arising out of your use of the Service, your violation of these Terms, or your infringement of any third‑party rights.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">12. Governing Law & Dispute Resolution</h2>
            <p>These Terms shall be governed by the laws of the State of California, without regard to its conflict of laws principles. Any dispute arising from these Terms or your use of the Service shall be resolved exclusively in the state or federal courts located in San Francisco County, California. You waive any objection to jurisdiction or venue in those courts.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">13. Changes to Terms</h2>
            <p>We may revise these Terms from time to time. The “Effective” date at the top of this page indicates when changes were last made. If we make material changes, we will notify you by email or through a prominent notice on the Service. Your continued use after the changes become effective constitutes your acceptance of the revised Terms.</p>
          </div>

          <div className="pt-4 border-t border-gray-200 mt-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-primary" /> 14. Contact Information
            </h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p className="mt-2">
              <strong>Email:</strong> <a href="mailto:legal@pollmenow.com" className="text-primary hover:underline">legal@pollmenow.com</a><br />
              <strong>Address:</strong> PollMeNow, 123 Digital Avenue, Suite 400, San Francisco, CA 94105, USA
            </p>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            These Terms of Service and our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> together form the entire agreement between you and PollMeNow.
          </p>
        </div>
      </div>
    </motion.div>
  );
}