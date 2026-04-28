// src/pages/PrivacyPolicy.jsx
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Eye, Database, Trash2, Globe, Users, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  const lastUpdated = 'April 28, 2026';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <p className="text-sm leading-relaxed">
            PollMeNow ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application and related services (collectively, the "Service"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.
          </p>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <Database className="w-5 h-5 text-primary" /> 1. Information We Collect
            </h2>
            <p>We collect information that you provide directly to us, information automatically through your use of the Service, and information from third‑party sources where permitted by law.</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Account Information:</strong> When you register, we collect your email address, chosen username, and a hashed password. You may optionally provide your name, profile picture, phone number, age, gender, and location (city/country).</li>
              <li><strong>Poll Data:</strong> Polls you create (questions, options, images, media), votes you cast, and any associated metadata (timestamps, IP addresses for vote verification).</li>
              <li><strong>Usage & Analytics:</strong> We collect information about your interactions with the Service, such as pages visited, vote history, poll shares, and device/browser information (user agent, approximate location derived from IP).</li>
              <li><strong>Payment Information:</strong> If you upgrade to a paid plan, Stripe (our payment processor) collects your payment card details. We do not store full card numbers on our servers – only a payment method reference.</li>
              <li><strong>AI‑Generated Content:</strong> When you use our AI poll generation or image generation features, your prompts (topic, question, option text) are sent to third‑party AI providers (Vertex AI / OpenAI). Those providers may temporarily store inputs to improve their models, but we do not associate them with your identity beyond the session.</li>
              <li><strong>Communications:</strong> If you contact us via email or our contact form, we keep a record of that correspondence.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <Eye className="w-5 h-5 text-primary" /> 2. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide, maintain, and improve the Service (e.g., display your polls, count votes, show analytics).</li>
              <li>Process payments and manage your subscription.</li>
              <li>Authenticate your identity and prevent fraud.</li>
              <li>Generate personalized recommendations (e.g., "For You" section).</li>
              <li>Communicate with you about updates, security alerts, and support messages.</li>
              <li>Detect, investigate, and prevent abusive or illegal activities.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <Users className="w-5 h-5 text-primary" /> 3. Data Sharing & Third Parties
            </h2>
            <p><strong>We do not sell or rent your personal information to third parties.</strong> We only share data in the following limited circumstances:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Service Providers:</strong> We use trusted third‑party services to operate our platform: Firebase (authentication, database, storage), Stripe (payments), and AI providers (Vertex AI / OpenAI). These providers have their own privacy policies and are contractually bound to only use your data to provide the requested services.</li>
              <li><strong>Legal Requirements:</strong> If required by law or in response to valid legal process (e.g., court order, subpoena), we may disclose your information.</li>
              <li><strong>Public Polls:</strong> The polls you publish as "public" are visible to anyone, including non‑registered users. Your username and profile picture will appear as the creator.</li>
              <li><strong>With Your Consent:</strong> We may share information for any other purpose with your explicit permission.</li>
            </ul>
            <p className="mt-2 text-sm italic">All information stored in our Firebase database is encrypted at rest and in transit. Access is strictly controlled.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <Trash2 className="w-5 h-5 text-primary" /> 4. Data Retention & Deletion
            </h2>
            <p>We retain your personal information for as long as your account is active or as needed to provide you with the Service. If you close your account, we will delete or anonymise your data within 30 days, except where we are required to retain it for legal, tax, or security reasons (e.g., transaction records kept for 7 years).</p>
            <p className="mt-2"><strong>Your Right to Delete:</strong> You can request deletion of your account and all associated data by emailing <a href="mailto:privacy@pollmenow.com" className="text-primary hover:underline">privacy@pollmenow.com</a>. We will confirm deletion within 15 days.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3">
              <Globe className="w-5 h-5 text-primary" /> 5. International Data Transfers
            </h2>
            <p>Your information may be transferred to and maintained on servers located outside your country or jurisdiction, where data protection laws may differ. By using the Service, you consent to the transfer of your data to the United States (where our primary servers are located) and other countries where we or our sub‑processors operate. We take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">6. Cookies & Tracking Technologies</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Keep you logged in (essential).</li>
              <li>Understand how you interact with the Service (analytics).</li>
              <li>Prevent duplicate votes (local storage use).</li>
            </ul>
            <p>You can disable cookies in your browser settings, but some parts of the Service may not function properly.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">7. Your Rights (GDPR / CCPA)</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data.</li>
              <li><strong>Rectification:</strong> Update inaccurate or incomplete information.</li>
              <li><strong>Erasure ("right to be forgotten"):</strong> Delete your account and data.</li>
              <li><strong>Restriction:</strong> Limit how we process your data.</li>
              <li><strong>Portability:</strong> Receive your data in a structured, machine‑readable format.</li>
              <li><strong>Object:</strong> Object to processing for direct marketing or certain legitimate interests.</li>
            </ul>
            <p>To exercise any of these rights, contact us at <a href="mailto:privacy@pollmenow.com" className="text-primary hover:underline">privacy@pollmenow.com</a>. We will respond within one month.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">8. Children’s Privacy</h2>
            <p>The Service is not intended for individuals under the age of 13 (or 16 in certain jurisdictions). We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us so we can delete it.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">9. Security Measures</h2>
            <p>We implement appropriate technical and organisational measures to protect your personal data, including:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Encryption of data at rest and in transit (TLS, Firestore encryption).</li>
              <li>Firebase Authentication with strong password hashing (bcrypt).</li>
              <li>Regular security audits and vulnerability scanning.</li>
              <li>Limited access to personal data by our employees (only on a need‑to‑know basis).</li>
            </ul>
            <p>However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">10. Changes to This Privacy Policy</h2>
            <p>We may update this policy from time to time. The “Last updated” date at the top of this page indicates when changes were last made. If we make material changes, we will notify you by email or through a notice on the Service before the changes become effective. Your continued use of the Service after any changes indicates your acceptance of the updated policy.</p>
          </div>

          <div className="pt-4 border-t border-gray-200 mt-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-primary" /> 11. Contact Us
            </h2>
            <p>If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:</p>
            <p className="mt-2">
              <strong>Email:</strong> <a href="mailto:privacy@pollmenow.com" className="text-primary hover:underline">privacy@pollmenow.com</a><br />
              <strong>Address:</strong> PollMeNow, 123 Digital Avenue, Suite 400, San Francisco, CA 94105, USA<br />
              <strong>Data Protection Officer:</strong> DPO@pollmenow.com
            </p>
          </div>

          <p className="text-xs text-gray-400 mt-8 text-center">
            This Privacy Policy is part of our <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>. By using PollMeNow, you also agree to the Terms.
          </p>
        </div>
      </div>
    </motion.div>
  );
}