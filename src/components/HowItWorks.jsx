// ============================================================
// src/components/HowItWorks.jsx
// ============================================================
import { motion } from 'framer-motion';

const STEPS = [
  {
    num:   '01',
    icon:  '🤖',
    title: 'Describe your topic',
    desc:  'Type any topic — "remote work 2026", "sports rivalry", "product feedback" — and our AI instantly crafts a professional, unbiased poll with balanced answer options.',
    highlight: 'Takes under 10 seconds',
  },
  {
    num:   '02',
    icon:  '🎯',
    title: 'Customize & target',
    desc:  'Choose who sees your poll. Set a duration, make it public, private, or friends-only. Premium users can target by age, gender, and country for precision insights.',
    highlight: 'Reach the right audience',
  },
  {
    num:   '03',
    icon:  '📊',
    title: 'Watch results live',
    desc:  'Votes flow in real time. Your dashboard shows live tallies, demographic breakdowns, geographic heatmaps, and AI trend insights as they happen — no refresh needed.',
    highlight: 'Real-time analytics',
  },
];

export default function HowItWorks() {
  return (
    <section style={{ padding: '96px 24px', background: 'linear-gradient(180deg,#fafafa,#fff)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <p style={{ fontSize: 11, fontWeight: 800, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0d0d12', letterSpacing: '-.02em', marginBottom: 14, lineHeight: 1.2 }}>
            From idea to live poll<br />in three steps
          </h2>
          <p style={{ fontSize: 16, color: '#9898a8', maxWidth: 400, margin: '0 auto' }}>No design skills. No survey expertise. Just your topic and our AI.</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, position: 'relative' }}>
          {/* Connector line */}
          <div style={{ position: 'absolute', top: 52, left: '18%', right: '18%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(108,92,231,.3),transparent)', pointerEvents: 'none' }} />

          {STEPS.map((step, i) => (
            <motion.div key={step.num}
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }} transition={{ delay: i * .14, duration: .5 }}
              style={{ background: '#fff', border: '1px solid #eee', borderRadius: 20, padding: '28px 24px', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,.04)', transition: 'transform .18s, box-shadow .18s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(108,92,231,.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,.04)'; }}
            >
              {/* Step number + icon */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,rgba(108,92,231,.1),rgba(168,85,247,.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto' }}>
                  {step.icon}
                </div>
                <div style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                  {i + 1}
                </div>
              </div>

              <p style={{ fontSize: 11, fontWeight: 700, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>{step.num}</p>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0d0d12', marginBottom: 10 }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: '#9898a8', lineHeight: 1.65, marginBottom: 14 }}>{step.desc}</p>
              <span style={{ display: 'inline-block', background: '#f0eeff', color: '#6C5CE7', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>
                {step.highlight}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hiw-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}