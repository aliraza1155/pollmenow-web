import { motion } from 'framer-motion'
import { Sparkles, Share2, BarChart3 } from 'lucide-react'

const steps = [
  {
    num: '01',
    icon: Sparkles,
    title: 'Create with AI',
    desc: 'Type your topic — AI generates professional, unbiased questions with balanced answer options in seconds.',
  },
  {
    num: '02',
    icon: Share2,
    title: 'Share anywhere',
    desc: 'One-click share to any platform. Embed on your website with a single line of code.',
  },
  {
    num: '03',
    icon: BarChart3,
    title: 'Watch live results',
    desc: 'Real-time dashboard shows votes, demographic breakdowns, and AI trend insights as they happen.',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-20 px-6 bg-gray-50/60">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Three steps to viral insights
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">From idea to real-time results in under a minute.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="text-center group"
            >
              <div className="relative inline-block mb-5">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mx-auto group-hover:border-primary/30 group-hover:shadow-md transition-all duration-300">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
