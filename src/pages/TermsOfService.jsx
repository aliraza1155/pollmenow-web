import { motion } from 'framer-motion'
import { FileText, Scale, CreditCard, AlertCircle, Mail } from 'lucide-react'

export default function TermsOfService() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-6 py-16"
    >
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-4">
          <FileText className="w-3 h-3" />
          Effective: April 4, 2026
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-500 text-lg">Agreement between you and PollMeNow</p>
      </div>

      <div className="space-y-8 text-gray-600 leading-relaxed">
        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
          </div>
          <p>By accessing or using PollMeNow (the "Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the Service. These terms apply to all visitors, users, and others who access the Service.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Eligibility</h2>
          <p>You must be at least 13 years old to use PollMeNow. By using the Service, you represent and warrant that you meet this age requirement. If you are under 18, you represent that you have parental or guardian consent.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
          <p>You are responsible for maintaining the security of your account and for any activity that occurs under your account. You agree to provide accurate, current, and complete information during registration and to update it as needed. You may not share your account credentials with others.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Acceptable Use Policy</h2>
          <p>You agree not to misuse PollMeNow. Prohibited activities include:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Posting illegal, harassing, defamatory, or hateful content.</li>
            <li>Attempting to manipulate poll results (e.g., bots, vote stuffing).</li>
            <li>Distributing malware, spam, or phishing links.</li>
            <li>Violating any applicable laws or regulations.</li>
            <li>Reverse engineering, copying, or scraping the Service.</li>
          </ul>
          <p className="mt-3">We reserve the right to remove any content and suspend or terminate accounts that violate this policy.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">5. Subscriptions & Payments</h2>
          </div>
          <p><strong>Free plan:</strong> Limited features as described on our Pricing page. No payment required.</p>
          <p className="mt-2"><strong>Premium & Agency plans:</strong> Billed monthly or annually. Subscriptions auto-renew unless canceled before the next billing period. You may cancel at any time from your account settings. Refunds are generally not provided for partial months, but we may issue refunds at our discretion within 7 days of initial payment.</p>
          <p className="mt-2">Prices may change with 30 days' notice. Continued use after a price change constitutes acceptance.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
          <p><strong>Your content:</strong> You retain ownership of polls and content you create. By posting, you grant PollMeNow a non-exclusive, royalty-free, worldwide license to display, distribute, and promote your content within the Service.</p>
          <p className="mt-2"><strong>Our IP:</strong> The PollMeNow platform, software, trademarks, logos, and aggregated analytics data are owned by PollMeNow. You may not copy, modify, or reverse engineer any part of the Service.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Termination</h2>
          <p>Either party may terminate your account at any time for any reason. Upon termination, your content may be removed from public view. We may retain anonymized data for analytics. We are not liable for any loss of data.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">8. Disclaimers & Limitation of Liability</h2>
          </div>
          <p><strong>Service "as is":</strong> PollMeNow is provided without warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the Service will be uninterrupted or error-free.</p>
          <p className="mt-2"><strong>Limitation of liability:</strong> To the maximum extent permitted by law, PollMeNow shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of the Service.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Governing Law & Dispute Resolution</h2>
          <p>These terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law principles. Any disputes arising from these terms or your use of the Service shall be resolved through binding arbitration in San Francisco, CA, unless otherwise agreed.</p>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
          <p>We may update these Terms from time to time. Material changes will be notified via email or a prominent notice on our website. Your continued use of the Service after changes become effective constitutes acceptance of the revised terms.</p>
        </section>

        <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">11. Contact Information</h2>
              <p>For legal notices or questions about these Terms:</p>
              <p className="mt-2"><strong>Email:</strong> <a href="mailto:legal@pollmenow.com" className="text-primary hover:underline">legal@pollmenow.com</a></p>
              <p><strong>Postal:</strong> PollMeNow, 548 Market St, PMB 12345, San Francisco, CA 94104, USA</p>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  )
}
