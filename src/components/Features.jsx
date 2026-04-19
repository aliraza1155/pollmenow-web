// src/components/Features.jsx
import { motion } from 'framer-motion';
import { 
  Bot, Sparkles, Image as ImageIcon, Layers, Lock, Activity, Share2, 
  MapPin, Calendar, Users, Radio, BarChart3, Globe, Target, PieChart,
  Zap, Shield, Clock, Check, UsersRound, Building2
} from 'lucide-react';

const features = [
  { icon: Bot, title: "AI Poll Generation", desc: "Type any topic – AI instantly creates balanced questions and smart answer options.", premium: false },
  { icon: Sparkles, title: "AI Image Options", desc: "Generate custom visual options for your polls without a designer. (Premium)", premium: true },
  { icon: Layers, title: "Up to 10 Answer Options", desc: "Capture nuanced opinions with up to 10 unique options per poll (Premium).", premium: false },
  { icon: ImageIcon, title: "Multimedia Polls", desc: "Use images, GIFs, or videos for both questions and answer options.", premium: false },
  { icon: Lock, title: "Flexible Privacy", desc: "Public, Friends‑only, or Private link‑only access (Premium).", premium: true },
  { icon: Activity, title: "Real-Time Results", desc: "Votes update instantly via WebSockets – no refresh needed.", premium: false },
  { icon: Share2, title: "Viral Sharing", desc: "One-click share to social media, embed anywhere with a widget.", premium: false },
  { icon: MapPin, title: "Country Targeting", desc: "Reach specific countries, regions, or cities (Premium/Organization).", premium: true },
  { icon: Calendar, title: "Age Demographics", desc: "Filter by age ranges – perfect for generational trends (Premium).", premium: true },
  { icon: Users, title: "Gender Balance", desc: "Target specific gender identities or ensure balanced representation (Premium).", premium: true },
  { icon: Radio, title: "Live Event Polling", desc: "Real‑time feedback for debates, sports, and live streams (Premium).", premium: true },
  { icon: BarChart3, title: "Advanced Analytics", desc: "Track engagement, shares, voter demographics, and sentiment analysis (Premium).", premium: true },
  { icon: Globe, title: "Global Reach", desc: "Polls appear worldwide with geographic heatmaps.", premium: false },
  { icon: Target, title: "Trend Detection", desc: "AI predicts viral opinion shifts before they peak (Premium).", premium: true },
  { icon: PieChart, title: "Data Export & API", desc: "Download raw data or connect via REST API (Organization).", premium: true },
  { icon: UsersRound, title: "Team Management", desc: "Invite team members, assign roles, and collaborate (Organization).", premium: true },
  { icon: Building2, title: "Organization Branding", desc: "White‑label polls with your own logo and colors (Organization).", premium: true },
  { icon: Zap, title: "Instant Poll Creation", desc: "Create a poll in under 10 seconds – intuitive interface.", premium: false },
  { icon: Shield, title: "Fraud Protection", desc: "AI detects bots and duplicate votes – clean, reliable data.", premium: false },
  { icon: Clock, title: "Flexible Duration", desc: "Set polls to run for hours, days, weeks, or months – auto‑expire.", premium: false }
];

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
          <span className="text-gray-900">Built for Everyone</span>
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Everything you need to create, share, and analyze polls – with intelligent assistance at every step.
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
            whileHover={{ y: -8 }}
            className="group relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition">
              <feature.icon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition">
              {feature.title}
              {feature.premium && <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Premium</span>}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}