import { motion } from 'framer-motion'
import { 
  Bot, Sparkles, Image as ImageIcon, Layers, Lock, Activity, Share2, 
  MapPin, Calendar, Users, Radio, BarChart3, Globe, Target, PieChart,
  Zap, Shield, Clock, Check
} from 'lucide-react'

const features = [
  { icon: Bot, title: "AI Poll Generation", desc: "Type any topic � AI instantly creates balanced questions and smart answer options. No more writer's block.", details: ["Auto-generate questions", "Balanced options", "Multi-language support"] },
  { icon: Sparkles, title: "AI Image Options (Premium)", desc: "Generate custom visual options for your polls without a designer. Describe, and AI creates.", details: ["Text-to-image", "Style matching", "Brand consistency"] },
  { icon: Layers, title: "10+ Answer Options", desc: "Go beyond yes/no. Capture nuanced opinions with up to 10 unique options per poll.", details: ["Deep insights", "Ranked choices", "Open-ended hybrid"] },
  { icon: ImageIcon, title: "Multimedia Polls", desc: "Use images, GIFs, or videos for both questions and answer options. Boost engagement.", details: ["Rich media answers", "Visual voting", "Higher completion"] },
  { icon: Lock, title: "Flexible Privacy", desc: "Control who votes � Public (global), Friends network, or Private link-only access.", details: ["Enterprise ready", "White-label options", "Audit logs"] },
  { icon: Activity, title: "Real-Time Results", desc: "Votes update instantly across all devices via WebSockets. No refresh needed.", details: ["Live counters", "Geographic heatmaps", "Second-by-second"] },
  { icon: Share2, title: "Viral Sharing", desc: "One-click share to TikTok, Instagram, X, WhatsApp. Embed anywhere with a widget.", details: ["Deep linking", "Open Graph previews", "QR codes"] },
  { icon: MapPin, title: "Country Targeting", desc: "Reach specific countries, regions, or cities. Get localized insights.", details: ["190+ countries", "Regional breakdowns", "Language filters"] },
  { icon: Calendar, title: "Age Demographics", desc: "Filter by age ranges (18-24, 25-34, 35-44, 45+). Perfect for generational trends.", details: ["Gen Z to Boomers", "Cross-tab analysis", "Exportable"] },
  { icon: Users, title: "Gender Balance", desc: "Ensure balanced representation or target specific gender identities.", details: ["Inclusive options", "Comparative stats", "Demographic weighting"] },
  { icon: Radio, title: "Live Event Polling", desc: "Real-time feedback for debates, sports, town halls, and live streams.", details: ["Second latency", "Moderator controls", "Audience engagement"] },
  { icon: BarChart3, title: "Advanced Analytics", desc: "Track engagement rates, shares, voter demographics, and sentiment analysis.", details: ["Custom dashboards", "Export CSV/PDF/JSON", "Trend lines"] },
  { icon: Globe, title: "Global Reach", desc: "Polls appear in 190+ countries with automatic translation and geographic heatmaps.", details: ["Localized UI", "Cross-cultural insights", "Global trends"] },
  { icon: Target, title: "Trend Detection", desc: "AI predicts viral opinion shifts before they peak. Stay ahead of the curve.", details: ["Predictive algorithms", "Alert system", "Trending feed"] },
  { icon: PieChart, title: "Data Export & API", desc: "Download raw data or connect via REST API for custom integrations.", details: ["Real-time webhooks", "Custom reports", "White-label API"] },
  { icon: Zap, title: "Instant Poll Creation", desc: "Create a poll in under 10 seconds. Intuitive interface, zero learning curve.", details: ["Templates", "Drafts", "Scheduled publishing"] },
  { icon: Shield, title: "Fraud Protection", desc: "AI detects bots and duplicate votes. Clean, reliable data.", details: ["CAPTCHA optional", "IP filtering", "Blocklist"] },
  { icon: Clock, title: "Flexible Duration", desc: "Set polls to run for hours, days, weeks, or months � auto-expire when done.", details: ["Countdown timers", "Recurring polls", "Timezone aware"] }
]

export default function Features() {
  return (
    <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="text-center mb-20"
      >
        <h2 className="text-5xl md:text-6xl font-bold mb-6">
          <span className="gradient-text">AI-Powered Polling</span>
          <br />
          <span className="text-gray-900">Built for Speed</span>
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Everything you need to create, share, and analyze polls � with intelligent assistance at every step.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: idx * 0.03, duration: 0.5 }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            className="group relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-secondary/0 group-hover:from-primary/5 group-hover:to-secondary/5 transition-all duration-500"></div>
            <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <feature.icon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">{feature.desc}</p>
            <div className="flex flex-wrap gap-2">
              {feature.details.map((detail, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border border-gray-100">
                  <Check className="w-3 h-3 text-green-600" />
                  {detail}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
