import { motion } from 'framer-motion'
import { Shield, Eye, Database, Cookie, Mail, Lock } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-6 py-16"
    >
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-4">
          <Shield className="w-3 h-3" />
          Last updated: April 4, 2026
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-500 text-lg">How we collect, use, and protect your data.</p>
      </div>

      <div className="space-y-8 text-gray-600 leading-relaxed">
        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
          </div>
          <p className="mb-3">When you use PollMeNow, we collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account information:</strong> name, email address, profile picture (if provided).</li>
            <li><strong>Poll data:</strong> questions, answer options, votes, comments, and sharing activity.</li>
            <li><strong>Usage data:</strong> IP address, browser type, device info, pages visited, and time spent.</li>
            <li><strong>Cookies & similar technologies</strong> (see section 4).</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
          </div>
          <p>We use your data to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Operate, maintain, and improve PollMeNow features.</li>
            <li>Display real-time poll results and analytics.</li>
            <li>Send transactional emails (e.g., password reset, payment receipts).</li>
            <li>Analyze aggregated trends (e.g., “most popular polls”, geographic voting patterns).</li>
            <li>Prevent fraud, spam, and abuse.</li>
          </ul>
          <p className="mt-3 text-sm text-gray-500">We never sell your personal data to third parties.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">3. Data Sharing & Disclosure</h2>
          </div>
          <p>We may share information only in these limited cases:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>With your consent</strong> (e.g., when you choose to make a poll public).</li>
            <li><strong>Service providers</strong> (hosting, analytics, payment processing – Stripe).</li>
            <li><strong>Legal compliance</strong> if required by law or to protect our rights.</li>
            <li><strong>Business transfers</strong> (merger, acquisition, or asset sale).</li>
          </ul>
          <p className="mt-3 text-sm">Aggregated, anonymized poll insights may be published for research or marketing.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Cookie className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">4. Cookies & Tracking</h2>
          </div>
          <p>We use cookies to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Keep you logged in (essential).</li>
            <li>Remember your preferences (e.g., dark mode, language).</li>
            <li>Analyze site traffic via anonymized analytics (you can opt out).</li>
          </ul>
          <p className="mt-3">You can disable cookies in your browser settings, but some features may not work correctly.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
          <p>We retain your personal data for as long as your account is active. Poll responses are anonymized after 12 months for aggregate analysis. You may request deletion of your account and associated data at any time – we will fulfill within 30 days.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Security</h2>
          <p>We implement industry-standard measures: encryption in transit (TLS), hashed passwords, regular security audits, and restricted access to personal data. However, no internet transmission is 100% secure.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights (GDPR & CCPA)</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Access, correct, or delete your personal data.</li>
            <li>Object to or restrict certain processing.</li>
            <li>Data portability (receive a copy of your data).</li>
            <li>Withdraw consent at any time.</li>
          </ul>
          <p className="mt-3">To exercise these rights, contact <strong>privacy@pollmenow.com</strong>.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children's Privacy</h2>
          <p>PollMeNow is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have, please contact us to delete it.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Material changes will be notified via email or a prominent notice on our website. The "Last updated" date at the top indicates when the policy was last revised.</p>
        </section>

        <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">10. Contact Us</h2>
              <p>For privacy-related questions or requests:</p>
              <p className="mt-2"><strong>Email:</strong> <a href="mailto:privacy@pollmenow.com" className="text-primary hover:underline">privacy@pollmenow.com</a></p>
              <p><strong>Postal:</strong> PollMeNow, 548 Market St, PMB 12345, San Francisco, CA 94104, USA</p>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  )
}
