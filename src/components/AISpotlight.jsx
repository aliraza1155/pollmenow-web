// src/components/AISpotlight.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const CAPABILITIES = [
  {
    icon:   '🤖',
    title:  'Auto-generate full polls',
    desc:   'Describe any topic in plain English — AI writes the question and up to 6 balanced, unbiased answer options in seconds.',
    badge:  null,
  },
  {
    icon:   '✏️',
    title:  'AI rephrase & improve',
    desc:   'Already have a question drafted? Hit the sparkle button to let AI polish the wording for clarity and engagement.',
    badge:  null,
  },
  {
    icon:   '🖼',
    title:  'AI image generation',
    desc:   'Generate photorealistic images for poll options — perfect for comparison and live polls — without needing a designer.',
    badge:  'Premium',
  },
  {
    icon:   '🛡',
    title:  'Content moderation',
    desc:   'Every poll is scanned for inappropriate content before publishing, keeping the platform safe and trusted.',
    badge:  null,
  },
];

const CHAT_FLOW = [
  { from: 'user', text: 'Create a poll about remote work preferences for 2026' },
  { from: 'bot',  text: '✦ Generating your poll...', loading: true },
];

const GENERATED_OPTIONS = [
  'Fully remote — I work from anywhere',
  'Hybrid — mix of home and office',
  'Fully in-office — collaboration matters',
  'Flexible contract — depends on the project',
];

export default function AISpotlight() {
  const [step, setStep] = useState(1); // 1 = chat, 2 = generated

  return (
    <section style={{ padding: '96px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

        {/* Left: text */}
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .6 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>AI assistant</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, color: '#0d0d12', letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 16 }}>
            Let AI do<br />the heavy lifting
          </h2>
          <p style={{ fontSize: 15, color: '#9898a8', lineHeight: 1.7, maxWidth: 420, marginBottom: 32 }}>
            Just describe your topic — PollMeNow crafts professional polls instantly. No prompting experience needed. Our AI handles question phrasing, option balance, and even image generation for visual polls.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
            {CAPABILITIES.map((cap, i) => (
              <motion.div key={cap.title}
                initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * .1, duration: .4 }}
                style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(108,92,231,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {cap.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{cap.title}</span>
                    {cap.badge && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(108,92,231,.1)', color: '#6C5CE7', borderRadius: 20, padding: '2px 8px' }}>{cap.badge}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: '#9898a8', lineHeight: 1.55, margin: 0 }}>{cap.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <Link to="/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 12, padding: '12px 22px', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
            🤖 Try AI generation free →
          </Link>
        </motion.div>

        {/* Right: interactive mockup */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ delay: .15, duration: .6 }}>
          <div style={{ background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.07)' }}>
            {/* Toolbar */}
            <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f5', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ flex: 1, background: '#f4f4f6', borderRadius: 6, padding: '4px 12px', fontSize: 11, color: '#9898a8', textAlign: 'center' }}>
                PollMeNow AI assistant
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6C5CE7', animation: 'pulse 2s infinite' }} />
            </div>

            {/* Chat area */}
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* User message */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '10px 14px', maxWidth: '80%', fontSize: 13, lineHeight: 1.5 }}>
                  Create a poll about remote work preferences for 2026
                </div>
              </div>

              {/* Bot thinking */}
              {step === 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', fontSize: 13, color: '#666' }}>
                    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                      <span style={{ animation: 'dot1 1.4s infinite', fontSize: 18, color: '#6C5CE7' }}>·</span>
                      <span style={{ animation: 'dot2 1.4s infinite .15s', fontSize: 18, color: '#6C5CE7' }}>·</span>
                      <span style={{ animation: 'dot3 1.4s infinite .3s', fontSize: 18, color: '#6C5CE7' }}>·</span>
                    </span>
                    &nbsp; Generating your poll...
                  </div>
                </div>
              )}
            </div>

            {/* Generated poll card */}
            <div style={{ margin: '0 16px 16px', background: '#fff', border: '1px solid #e8e8ee', borderRadius: 16, padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 13 }}>✦</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '.05em' }}>AI generated</span>
                <span style={{ marginLeft: 'auto', background: '#f0fdf4', color: '#15803d', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>Ready to publish</span>
              </div>

              <p style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 14, lineHeight: 1.4 }}>
                "What is your preferred work model in 2026?"
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                {GENERATED_OPTIONS.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 8, background: '#f7f7fb', border: '1px solid #eee', fontSize: 12, color: '#444', fontWeight: 500 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid #d4ccf0', flexShrink: 0 }} />
                    {opt}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/create" style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Publish poll</Link>
                <button style={{ background: '#f4f4f6', border: '1px solid #e8e8ee', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#6b6b7b', cursor: 'pointer' }}>Regenerate</button>
                <button style={{ background: '#f4f4f6', border: '1px solid #e8e8ee', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#6b6b7b', cursor: 'pointer' }}>Edit</button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes dot1 { 0%,60%,100%{opacity:0}30%{opacity:1} }
        @keyframes dot2 { 0%,60%,100%{opacity:0}30%{opacity:1} }
        @keyframes dot3 { 0%,60%,100%{opacity:0}30%{opacity:1} }
        @media (max-width: 768px) {
          .ai-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}