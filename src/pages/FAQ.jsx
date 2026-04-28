// src/pages/FAQ.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, HelpCircle, Zap, Shield, BarChart3, Users, Lock, Mail } from 'lucide-react';

const faqData = [
  {
    category: 'Getting Started',
    icon: HelpCircle,
    questions: [
      { q: 'How do I create a poll?', a: 'Click “Create Poll” from the navbar or your dashboard. Enter your question, options, choose settings (privacy, duration, etc.) and publish. You can also use AI to generate the question and options automatically.' },
      { q: 'Do I need an account to vote?', a: 'For public polls, you can vote without an account if the creator allows anonymous voting. However, creating polls and accessing analytics requires an account.' },
      { q: 'Is PollMeNow free?', a: 'Yes, we have a free plan that includes 5 polls per month, public polls, and basic analytics. Premium plans offer unlimited polls, advanced targeting, and AI image generation.' },
      { q: 'What browsers are supported?', a: 'We support the latest versions of Chrome, Firefox, Safari, and Edge. The platform also works on mobile devices via responsive web design.' }
    ]
  },
  {
    category: 'AI Features',
    icon: Zap,
    questions: [
      { q: 'How does AI poll generation work?', a: 'Simply type a topic (e.g. “remote work 2026”) and our AI will generate a balanced poll question and up to 6 answer options. You can then edit, add images, or regenerate.' },
      { q: 'Can I generate images for my poll options?', a: 'Yes, Premium users can generate custom images for question or options using our AI image generator. You can also upload your own images.' },
      { q: 'Is the AI content moderated?', a: 'Yes, every AI‑generated poll is automatically scanned for inappropriate content before publishing.' }
    ]
  },
  {
    category: 'Privacy & Security',
    icon: Shield,
    questions: [
      { q: 'Are votes anonymous?', a: 'Creators can choose to allow anonymous voting. When enabled, votes are not linked to your account. Private polls can also require an access code for extra security.' },
      { q: 'How is my data protected?', a: 'All data is encrypted in transit (TLS) and at rest. We never sell your personal information. You can request deletion of your account and data at any time.' },
      { q: 'Can I delete my account?', a: 'Yes, go to your Profile page and click “Delete account”. All your polls and data will be permanently removed within 30 days.' }
    ]
  },
  {
    category: 'Analytics & Insights',
    icon: BarChart3,
    questions: [
      { q: 'What analytics do I get?', a: 'You’ll see total votes, views, vote rate, and (with Premium) demographic breakdowns (age, gender, country), engagement trends, and exportable reports.' },
      { q: 'Can I see who voted for which option?', a: 'No. We never reveal individual voter identities. Only aggregated counts and percentages are displayed.' }
    ]
  },
  {
    category: 'Polls & Sharing',
    icon: Users,
    questions: [
      { q: 'Can I embed a poll on my website?', a: 'Yes. Every poll has an embed code that you can copy and paste into any HTML page. The widget automatically updates results in real time.' },
      { q: 'What is a private poll?', a: 'Private polls require an access code that you share only with the people you want to vote. This is perfect for internal team feedback or exclusive communities.' }
    ]
  },
  {
    category: 'Billing & Subscription',
    icon: Lock,
    questions: [
      { q: 'How do I upgrade to Premium?', a: 'Go to the Upgrade page from your dashboard or settings. Choose a monthly or yearly plan, enter your payment details, and your account will be upgraded immediately.' },
      { q: 'Can I cancel my subscription?', a: 'Yes, you can cancel anytime from your billing settings. Your premium features will remain active until the end of the current billing period.' },
      { q: 'Do you offer refunds?', a: 'For annual plans, we offer refunds within 7 days of the initial payment. Monthly subscriptions are non‑refundable but can be canceled anytime.' }
    ]
  }
];

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-4 text-left font-medium text-gray-800 hover:text-primary transition"
      >
        <span>{question}</span>
        <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-gray-600 text-sm leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FAQ() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

  const filteredCategories = faqData
    .map((cat, idx) => ({
      ...cat,
      originalIndex: idx,
      questions: cat.questions.filter(
        q => q.q.toLowerCase().includes(search.toLowerCase()) || q.a.toLowerCase().includes(search.toLowerCase())
      )
    }))
    .filter(cat => cat.questions.length > 0);

  const displayCategories = search ? filteredCategories : faqData;
  const currentCategory = search ? filteredCategories[0] : faqData[activeCategory];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-gray-500">Find answers to common questions about PollMeNow</p>
        </div>

        {/* Search bar */}
        <div className="max-w-md mx-auto mb-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        {/* Category tabs (only when no search) */}
        {!search && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {faqData.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCategory(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeCategory === idx
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <cat.icon size={14} />
                {cat.category}
              </button>
            ))}
          </div>
        )}

        {/* FAQ list */}
        {currentCategory && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              {React.createElement(currentCategory.icon, { className: "w-5 h-5 text-primary" })}
              <h2 className="text-lg font-semibold text-gray-800">{currentCategory.category}</h2>
            </div>
            <div>
              {currentCategory.questions.map((item, idx) => (
                <FAQItem key={idx} question={item.q} answer={item.a} />
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {search && filteredCategories.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">No questions found. Try a different search term.</p>
          </div>
        )}

        {/* Still need help */}
        <div className="mt-8 text-center bg-white rounded-xl p-6 border border-gray-100">
          <Mail className="w-6 h-6 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-gray-800 mb-2">Still have questions?</h3>
          <p className="text-sm text-gray-500 mb-4">Our support team is happy to help.</p>
          <a href="/contact" className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}