// src/components/Hero.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Brain, Users, Clock, ArrowRight, TrendingUp, BarChart3, Shield, Globe } from 'lucide-react';

export default function Hero() {
  const [voteCount, setVoteCount] = useState(2841);

  useEffect(() => {
    const interval = setInterval(() => {
      setVoteCount(prev => prev + Math.floor(Math.random() * 4) + 1);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleDemoClick = () => {
    alert('Demo video coming soon! Check back later.');
  };

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/8 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-accent/6 to-transparent rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* LEFT COLUMN */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-7"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 bg-primary/8 text-primary px-4 py-1.5 rounded-full text-sm font-semibold"
            >
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              AI-powered polling platform
            </motion.div>

            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-gray-900"
              >
                Capture opinions
                <br />
                <span className="gradient-text">instantly.</span>
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-lg text-gray-500 leading-relaxed max-w-md"
            >
              The AI polling platform that writes your questions, targets the right audience, 
              and shows results in real time — all in under 10 seconds.
            </motion.p>

            {/* Live poll preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Live · Trending now</span>
                <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  12m left
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-4">
                "How do you prefer to gather customer feedback in 2026?"
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Instant AI polls', pct: 72, color: 'from-primary to-secondary' },
                  { label: 'Long surveys', pct: 15, color: 'from-secondary to-accent' },
                  { label: 'Email forms', pct: 13, color: 'from-accent to-pink-400' },
                ].map((opt) => (
                  <div key={opt.label}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>{opt.label}</span>
                      <span className="font-semibold text-gray-700">{opt.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${opt.color} rounded-full`}
                        style={{ width: `${opt.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-gray-50 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  <span className="font-semibold text-primary tabular-nums">{voteCount.toLocaleString()}</span> votes
                </span>
                <span className="text-primary font-medium cursor-pointer hover:underline">Share ?</span>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                to="/create"
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
              >
                <Brain className="w-4 h-4" />
                Create poll with AI
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={handleDemoClick}
                className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
              >
                Watch demo
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex flex-wrap gap-5 text-xs text-gray-400"
            >
              {['99.9% uptime', '1M+ votes cast', '190+ countries'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT COLUMN – DASHBOARD PREVIEW */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="relative"
          >
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-3xl blur-2xl scale-105 opacity-60 animate-pulse" />
            <div className="relative bg-gray-950 rounded-2xl p-6 shadow-2xl border border-white/15 hover:border-primary/30 transition-all duration-500">
              {/* Dashboard header */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-green-400 uppercase tracking-widest">Live analytics</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-white/60">+12% vs last hour</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold text-white mb-0.5">2,845</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wide">Total votes</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold text-emerald-400 mb-0.5">68.2%</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wide">Engagement</div>
                </div>
              </div>

              {/* AI Feature Poll Question */}
              <div className="mb-4">
                <p className="text-white/90 text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  AI-generated poll
                </p>
                <p className="text-white text-sm font-medium leading-relaxed">
                  "What is the most critical feature for 2026?"
                </p>
              </div>

              {/* Options with styling */}
              <div className="space-y-2.5 mb-5">
                {[
                  { label: 'AI Automation', pct: 44, color: 'text-emerald-400', barColor: 'bg-emerald-400' },
                  { label: 'Privacy Control', pct: 30, color: 'text-blue-400', barColor: 'bg-blue-400' },
                  { label: 'Cross-Platform', pct: 16, color: 'text-violet-400', barColor: 'bg-violet-400' },
                ].map(row => (
                  <div key={row.label} className="group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white/70 text-xs">{row.label}</span>
                      <span className={`${row.color} text-xs font-mono font-bold`}>{row.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.barColor} rounded-full transition-all duration-500 group-hover:opacity-90`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional insights */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10 text-center">
                <div>
                  <div className="text-lg font-bold text-emerald-400">432</div>
                  <div className="text-[10px] text-white/35">Shares</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-400">12?</div>
                  <div className="text-[10px] text-white/35">Viral lift</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary">5?</div>
                  <div className="text-[10px] text-white/35">AI trust score</div>
                </div>
              </div>

              {/* AI badge */}
              <div className="mt-4 flex items-center justify-center gap-1.5 bg-primary/10 rounded-full px-3 py-1 w-fit mx-auto">
                <Brain className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-primary/80 font-medium">Powered by PollMeNow AI</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}