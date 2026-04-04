import { motion } from 'framer-motion'
import { Bot, Sparkles, Image as ImageIcon, ArrowRight, Check } from 'lucide-react'

const chatMessages = [
  { type: 'user', text: 'Create a poll about remote work trends for 2026' },
  { type: 'bot', text: 'Generating your poll now...' },
]

const generatedOptions = [
  'Fully remote — I work from anywhere',
  'Hybrid — mix of home and office',
  'Fully in-office — collaboration matters',
  'Flexible contract — depends on the week',
]

const capabilities = [
  {
    icon: Bot,
    title: 'Auto-generate questions',
    desc: 'AI writes professional, unbiased questions for any topic',
  },
  {
    icon: Sparkles,
    title: 'Smart option suggestions',
    desc: 'Balanced, relevant answers populated automatically',
  },
  {
    icon: ImageIcon,
    title: 'AI image generation',
    badge: 'Premium',
    desc: 'Create visual poll options without needing a designer',
  },
]

export default function AISpotlight() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">AI assistant</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight tracking-tight">
              Let AI do<br />the heavy lifting
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8 max-w-md">
              Just describe your topic — PollMeNow crafts professional polls instantly. 
              Premium users also get AI-generated images for visual, eye-catching polls.
            </p>

            <div className="space-y-5">
              {capabilities.map((cap, i) => (
                <motion.div
                  key={cap.title}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex gap-4 items-start group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    <cap.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{cap.title}</span>
                      {cap.badge && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {cap.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{cap.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — AI chat mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs font-medium text-gray-500">PollMeNow AI assistant</span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-end">
                  <div className="bg-primary text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%]">
                    Create a poll about remote work trends for 2026
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 text-gray-600 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[80%] shadow-xs">
                    Generating your poll now...
                  </div>
                </div>
              </div>

              <div className="mx-4 mb-4 bg-white border border-gray-100 rounded-xl p-4 shadow-xs">
                <div className="flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI generated</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  What is your preferred work model in 2026?
                </p>
                <div className="space-y-1.5 mb-4">
                  {generatedOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-gray-600 py-1.5 border-b border-gray-50 last:border-0">
                      <div className="w-4 h-4 rounded border border-gray-200 flex-shrink-0" />
                      {opt}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="bg-primary text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    Publish poll
                  </button>
                  <button className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
