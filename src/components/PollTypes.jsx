import { motion } from 'framer-motion'
import { Scale, ClipboardList, Users, Smile, MessageCircle } from 'lucide-react'

const types = [
  { icon: Scale, title: 'Comparison', desc: 'Head-to-head voting for A/B testing and This vs That.' },
  { icon: ClipboardList, title: 'Survey', desc: 'Multi-question polls for deeper structured feedback.' },
  { icon: Users, title: 'Similarity', desc: 'Find consensus by grouping similar options.' },
  { icon: Smile, title: 'Fun social', desc: 'Casual, entertaining polls designed for viral sharing.' },
  { icon: MessageCircle, title: 'Q&A', desc: 'Open-ended — users submit and vote on answers.' },
]

export default function PollTypes() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Versatile formats</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">A poll type for every need</h2>
          <p className="text-gray-500 max-w-md mx-auto">Run for hours, weeks, or months — the format always fits the goal.</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {types.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center hover:border-primary/20 hover:bg-white hover:shadow-md transition-all duration-300 group cursor-default"
            >
              <div className="w-11 h-11 bg-white border border-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:border-primary/30 transition-colors shadow-xs">
                <t.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{t.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}