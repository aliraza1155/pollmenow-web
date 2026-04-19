// src/pages/CreatePollPage.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { doc, addDoc, collection, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CATEGORIES, POLL_TYPES, VISIBILITY_OPTIONS, DURATION_OPTIONS, MAX_TITLE_LENGTH, MAX_OPTION_LENGTH, MAX_TAGS } from '../lib/constants';
import { canCreatePollType, canUseVisibility, getMaxOptions, getMonthlyPollLimit, hasTargeting, canUseAIFeatures, canUseAIPollGeneration } from '../lib/tierUtils';
import { generatePollSuggestions, generateImage, rewritePromptForDalle } from '../lib/ai';
import MediaPicker from '../components/MediaPicker';
import TagInput from '../components/TagInput';

const COUNTRIES = [ /* ... same list as before ... */ ];

const cleanObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = cleanObject(v);
  }
  return out;
};

const POLL_TYPE_ICONS = {
  quick: '⚡', yesno: '✅', rating: '⭐', comparison: '⚖', live: '🔴',
};

function SectionTitle({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: '#9898a8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{children}</p>;
}

function FormCard({ children, style = {} }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '20px', marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? 'linear-gradient(135deg,#6C5CE7,#a855f7)' : '#e8e8ee', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </div>
  );
}

// AI image generation button component
function AiImageButton({ onGenerate, loading, disabled, label = '✨ AI' }) {
  return (
    <button
      type="button"
      onClick={onGenerate}
      disabled={loading || disabled}
      style={{
        background: 'linear-gradient(135deg,#6C5CE7,#a855f7)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 11,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginLeft: 8,
      }}
    >
      {loading ? '⏳' : '✨'} {label}
    </button>
  );
}

export default function CreatePollPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  // Form state
  const [question, setQuestion] = useState('');
  const [type, setType] = useState('quick');
  const [visibility, setVisibility] = useState('public');
  const [anonymous, setAnonymous] = useState(false);
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState([]);
  const [durationMs, setDurationMs] = useState(null);
  const [options, setOptions] = useState([{ id: '1', text: '' }, { id: '2', text: '' }]);
  const [ratingScale, setRatingScale] = useState({ min: 1, max: 5, step: 1 });
  const [qMedia, setQMedia] = useState(null);
  const [optMedia, setOptMedia] = useState({});
  const [customCat, setCustomCat] = useState('');
  const [domainRestr, setDomainRestr] = useState({ enabled: false, domains: '' });

  // Targeting state (only for premium/organization)
  const [targeting, setTargeting] = useState({ enabled: false, ageRange: [18, 65], genders: [], countries: [] });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // NEW: Media choice (question image OR option images)
  const [mediaChoice, setMediaChoice] = useState('question'); // 'question' or 'options'
  const [isComparison, setIsComparison] = useState(false);

  // UI state
  const [publishing, setPublishing] = useState(false);
  const [aiLoading, setAiLoading] = useState({ question: false, poll: false, options: {} });
  const [aiTopic, setAiTopic] = useState('');
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [generatingImageForOption, setGeneratingImageForOption] = useState(null);

  const tier = user?.tier || 'free';
  const canUseTargeting = hasTargeting(tier);
  const canUseAI = canUseAIPollGeneration(tier);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Auto‑set mediaChoice for comparison polls
  useEffect(() => {
    const isComp = type === 'comparison';
    setIsComparison(isComp);
    if (isComp) {
      setMediaChoice('options'); // comparison polls require option images
    }
  }, [type]);

  // Load poll for editing
  useEffect(() => {
    if (!editId || !user) return;
    const load = async () => {
      const snap = await getDoc(doc(db, 'polls', editId));
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.creator?.id !== user.uid) { navigate('/dashboard'); return; }
      setQuestion(d.question || '');
      setType(d.type || 'quick');
      setVisibility(d.visibility || 'public');
      setAnonymous(d.anonymous || false);
      setCategory(d.category || 'general');
      setTags(d.tags || []);
      if (d.options) setOptions(Object.values(d.options).map(o => ({ id: o.id, text: o.text })));
      if (d.questionMedia) {
        setQMedia(d.questionMedia.url);
        setMediaChoice('question');
      } else if (d.options?.some(o => o.mediaUrl)) {
        setMediaChoice('options');
        const media = {};
        d.options.forEach(o => { if (o.mediaUrl) media[o.id] = o.mediaUrl; });
        setOptMedia(media);
      }
      if (d.meta?.targetDemographics && canUseTargeting) {
        setTargeting({
          enabled: true,
          ageRange: d.meta.targetDemographics.ageRange || [18, 65],
          genders: d.meta.targetDemographics.genders || [],
          countries: d.meta.targetDemographics.locations || [],
        });
      }
      setIsEditing(true);
    };
    load().catch(console.error);
  }, [editId, user, navigate, canUseTargeting]);

  // Type change resets options
  const handleTypeChange = (t) => {
    setType(t);
    if (t === 'yesno') setOptions([{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }]);
    else if (t === 'rating') setOptions([]);
    else setOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
  };

  // Options management
  const maxOpts = getMaxOptions(tier);
  const addOption = () => {
    if (options.length >= maxOpts) { showToast('error', `Maximum ${maxOpts} options allowed.`); return; }
    setOptions(prev => [...prev, { id: Date.now().toString(), text: '' }]);
  };
  const removeOption = (i) => {
    if (options.length <= 2) { showToast('error', 'Minimum 2 options required.'); return; }
    const id = options[i].id;
    setOptions(prev => prev.filter((_, idx) => idx !== i));
    setOptMedia(prev => { const n = { ...prev }; delete n[id]; return n; });
  };
  const updateOption = (i, text) => {
    setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, text } : o));
  };

  // AI poll generation
  const handleAIGenerate = async () => {
    if (!canUseAI) { showToast('error', 'AI generation requires Premium.'); return; }
    if (!aiTopic.trim()) { showToast('error', 'Enter a topic first.'); return; }
    setAiLoading(prev => ({ ...prev, poll: true }));
    try {
      const res = await generatePollSuggestions(aiTopic.trim());
      setQuestion(res.question || '');
      setOptions((res.options || []).map((t, i) => ({ id: i.toString(), text: t })));
      showToast('success', 'AI poll generated!');
    } catch { showToast('error', 'AI generation failed.'); }
    finally { setAiLoading(prev => ({ ...prev, poll: false })); }
  };

  // AI image generation for question
  const handleGenerateQuestionImage = async () => {
    if (!canUseAI) { showToast('error', 'AI image generation requires Premium.'); return; }
    if (!question.trim()) { showToast('error', 'Enter a question first.'); return; }
    setAiLoading(prev => ({ ...prev, question: true }));
    try {
      const safePrompt = await rewritePromptForDalle(question);
      const fullPrompt = `A professional, high-quality photograph for a poll question about: ${safePrompt}. No text, no watermark.`;
      const result = await generateImage(fullPrompt, 'hd');
      setQMedia(result.url);
      setMediaChoice('question');
      showToast('success', 'Image generated!');
    } catch (err) {
      showToast('error', 'Image generation failed.');
    } finally {
      setAiLoading(prev => ({ ...prev, question: false }));
    }
  };

  // AI image generation for an option
  const handleGenerateOptionImage = async (optionId, optionText) => {
    if (!canUseAI) { showToast('error', 'AI image generation requires Premium.'); return; }
    if (!optionText.trim()) { showToast('error', 'Enter option text first.'); return; }
    setGeneratingImageForOption(optionId);
    try {
      const safePrompt = await rewritePromptForDalle(optionText);
      const fullPrompt = `A professional, high-quality photograph representing: ${safePrompt}. No text, no watermark.`;
      const result = await generateImage(fullPrompt, 'hd');
      setOptMedia(prev => ({ ...prev, [optionId]: result.url }));
      showToast('success', 'Option image generated!');
    } catch (err) {
      showToast('error', 'Image generation failed.');
    } finally {
      setGeneratingImageForOption(null);
    }
  };

  // Upload helper
  const uploadFile = async (dataUrl, folder) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const path = `${folder}/${Date.now()}.${ext}`;
    const ref_ = ref(storage, path);
    await uploadBytes(ref_, blob);
    return getDownloadURL(ref_);
  };

  // Validation
  const validate = () => {
    if (!question.trim()) { showToast('error', 'Question is required.'); return false; }
    if (question.length > MAX_TITLE_LENGTH) { showToast('error', `Question too long (max ${MAX_TITLE_LENGTH}).`); return false; }
    if (type !== 'rating' && type !== 'yesno') {
      const valid = options.filter(o => o.text.trim());
      if (valid.length < 2) { showToast('error', 'At least 2 options required.'); return false; }
    }
    if (type === 'rating' && ratingScale.min >= ratingScale.max) { showToast('error', 'Min rating must be less than max.'); return false; }
    // For comparison polls, ensure each option has an image
    if (type === 'comparison') {
      const missing = options.some(opt => opt.text.trim() && !optMedia[opt.id]);
      if (missing) { showToast('error', 'All options must have an image for comparison polls.'); return false; }
    }
    return true;
  };

  // Publish
  const handlePublish = async () => {
    if (!validate()) return;
    const monthlyLimit = getMonthlyPollLimit(tier);
    if (!isEditing && (user?.pollsThisMonth || 0) >= monthlyLimit) {
      showToast('error', 'Monthly poll limit reached. Upgrade for more.');
      return;
    }
    setPublishing(true);
    setProgress(10);
    try {
      let qMediaUrl = null;
      let optsWithMedia = options;

      // Upload media based on choice
      if (mediaChoice === 'question' && qMedia && qMedia.startsWith('blob:')) {
        setProgress(25);
        qMediaUrl = await uploadFile(qMedia, `polls/${user.uid}/questions`);
      } else if (mediaChoice === 'question' && qMedia) {
        qMediaUrl = qMedia;
      } else if (mediaChoice === 'options') {
        setProgress(25);
        optsWithMedia = await Promise.all(
          options.filter(o => o.text.trim()).map(async (opt) => {
            if (optMedia[opt.id] && optMedia[opt.id].startsWith('blob:')) {
              const url = await uploadFile(optMedia[opt.id], `polls/${user.uid}/options`);
              return { ...opt, mediaUrl: url };
            }
            if (optMedia[opt.id]) return { ...opt, mediaUrl: optMedia[opt.id] };
            return opt;
          })
        );
      }
      setProgress(50);

      const endsAt = durationMs ? Timestamp.fromDate(new Date(Date.now() + durationMs)) : null;
      const accessCode = visibility === 'private' && !isEditing
        ? Math.random().toString(36).slice(2, 8).toUpperCase()
        : undefined;
      const finalCat = category === 'other' ? (customCat.trim() || 'other') : category;

      const meta = {
        isPremium: tier === 'premium' || tier === 'organization',
        isVerified: user.verified || false,
        isLive: type === 'live',
      };
      if (targeting.enabled && canUseTargeting) {
        meta.targetDemographics = {
          ageRange: targeting.ageRange,
          genders: targeting.genders,
          locations: targeting.countries,
        };
      }

      const pollData = cleanObject({
        question: question.trim(),
        type,
        visibility,
        anonymous: visibility !== 'private' && anonymous,
        category: finalCat,
        tags,
        creator: {
          id: user.uid,
          name: user.name || 'Anonymous',
          username: user.username || null,
          type: user.type || 'individual',
          verified: user.verified || false,
          profileImage: user.profileImage || null,
          tier: user.tier || 'free',
        },
        endsAt,
        totalVotes: isEditing ? undefined : 0,
        totalViews: isEditing ? undefined : 0,
        accessCode: accessCode || null,
        questionMedia: qMediaUrl ? { url: qMediaUrl, type: 'image' } : null,
        meta,
        allowedDomains: domainRestr.enabled && user.type === 'organization'
          ? domainRestr.domains.split(',').map(d => d.trim()).filter(Boolean)
          : null,
        ...(type === 'rating' ? { scale: ratingScale } : { options: optsWithMedia }),
      });

      if (isEditing) {
        await updateDoc(doc(db, 'polls', editId), { ...pollData, updatedAt: serverTimestamp() });
        showToast('success', 'Poll updated!');
        navigate(`/poll/${editId}`);
      } else {
        const ref_ = await addDoc(collection(db, 'polls'), { ...pollData, score24h: 0, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'users', user.uid), {
          pollsThisMonth: (user.pollsThisMonth || 0) + 1,
          pollsCreated: (user.pollsCreated || 0) + 1,
          updatedAt: serverTimestamp(),
        });
        await refreshUser();
        setProgress(100);
        if (visibility === 'private' && accessCode) showToast('success', `Poll published! Access code: ${accessCode}`);
        else showToast('success', 'Poll published!');
        navigate(`/poll/${ref_.id}`);
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
      setProgress(0);
    }
  };

  if (!user) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>Sign in to create polls</p>
      <a href="/login" style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 12, padding: '11px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Sign in</a>
    </div>
  );

  const pollsLeft = getMonthlyPollLimit(tier) - (user.pollsThisMonth || 0);
  const usagePct = Math.min(100, ((user.pollsThisMonth || 0) / getMonthlyPollLimit(tier)) * 100);
  const showOptions = type !== 'yesno' && type !== 'rating';
  const showOptImg = type === 'comparison' || type === 'live' || (mediaChoice === 'options' && showOptions);
  const showQuestionMedia = mediaChoice === 'question' && !isComparison;

  // Targeting UI (only if user can use targeting)
  const renderTargeting = () => {
    if (!canUseTargeting) return null;
    const filteredCountries = COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));
    return (
      <FormCard>
        <SectionTitle>🎯 Audience Targeting</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div><p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>Target specific audience</p><p style={{ fontSize: 11, color: '#9898a8', margin: '2px 0 0' }}>Show this poll only to selected demographics</p></div>
          <Toggle value={targeting.enabled} onChange={(v) => setTargeting(prev => ({ ...prev, enabled: v }))} />
        </div>
        {targeting.enabled && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f4f4f6' }}>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 700, color: '#6b6b7b', display: 'block', marginBottom: 4 }}>Age range</label><div style={{ display: 'flex', gap: 8 }}><input type="number" value={targeting.ageRange[0]} onChange={e => setTargeting(prev => ({ ...prev, ageRange: [parseInt(e.target.value) || 18, prev.ageRange[1]] }))} style={{ width: 70, background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 8, padding: '8px 10px', fontSize: 12 }} /><span>to</span><input type="number" value={targeting.ageRange[1]} onChange={e => setTargeting(prev => ({ ...prev, ageRange: [prev.ageRange[0], parseInt(e.target.value) || 65] }))} style={{ width: 70, background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 8, padding: '8px 10px', fontSize: 12 }} /></div></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 700, color: '#6b6b7b', display: 'block', marginBottom: 4 }}>Genders</label><div style={{ display: 'flex', gap: 12 }}>{['Male', 'Female', 'Other'].map(g => (<label key={g} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={targeting.genders.includes(g)} onChange={(e) => { if (e.target.checked) setTargeting(prev => ({ ...prev, genders: [...prev.genders, g] })); else setTargeting(prev => ({ ...prev, genders: prev.genders.filter(x => x !== g) })); }} /><span style={{ fontSize: 12 }}>{g}</span></label>))}</div></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6b6b7b', display: 'block', marginBottom: 4 }}>Countries</label><button onClick={() => { setCountrySearch(''); setShowCountryPicker(true); }} style={{ width: '100%', textAlign: 'left', background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#111', cursor: 'pointer' }}>{targeting.countries.length === 0 ? 'Select countries' : `${targeting.countries.length} country(s) selected`}</button>
            {targeting.countries.length > 0 && (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{targeting.countries.map(code => { const country = COUNTRIES.find(c => c.code === code); return (<span key={code} style={{ background: '#f0eeff', padding: '4px 8px', borderRadius: 16, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>{country?.name || code}<button onClick={() => setTargeting(prev => ({ ...prev, countries: prev.countries.filter(c => c !== code) }))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 12 }}>×</button></span>); })}</div>)}</div>
          </div>
        )}
      </FormCard>
    );
  };

  const filteredCountries = COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 76, right: 20, zIndex: 999, background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: toast.type === 'success' ? '#14532d' : '#7f1d1d', borderRadius: 12, padding: '12px 18px', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.1)', animation: 'fadeUp .2s ease' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111118', margin: 0 }}>{isEditing ? 'Edit Poll' : 'Create a New Poll'}</h1>
          <p style={{ fontSize: 14, color: '#9898a8', margin: '4px 0 0' }}>{isEditing ? 'Update your poll details below.' : 'Fill in the details, or let AI generate a poll for you.'}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }} className="create-grid">
          {/* Left: main form */}
          <div>
            {/* AI Generator */}
            <FormCard>
              <SectionTitle>✦ AI Generate (Optional)</SectionTitle>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ flex: 1, background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#111', outline: 'none', fontFamily: 'inherit' }} placeholder="e.g. remote work trends 2026..." value={aiTopic} onChange={e => setAiTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAIGenerate()} />
                <button onClick={handleAIGenerate} disabled={aiLoading.poll} style={{ background: aiLoading.poll ? '#e8e8ee' : 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: aiLoading.poll ? '#aaa' : '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: aiLoading.poll ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>{aiLoading.poll ? <><div style={{ width: 14, height: 14, border: '2px solid #ccc', borderTopColor: '#888', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Generating</> : '✦ Generate'}</button>
              </div>
              {!canUseAI && <p style={{ fontSize: 11, color: '#9898a8', marginTop: 7 }}>AI generation requires Premium. <a href="/upgrade" style={{ color: '#6C5CE7', fontWeight: 600 }}>Upgrade →</a></p>}
            </FormCard>

            {/* Question */}
            <FormCard>
              <SectionTitle>Poll Question *</SectionTitle>
              <textarea style={{ width: '100%', background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 10, padding: '12px 14px', fontSize: 15, fontWeight: 600, color: '#111', resize: 'vertical', minHeight: 80, outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }} placeholder="What would you like to ask?" value={question} onChange={e => setQuestion(e.target.value)} maxLength={MAX_TITLE_LENGTH} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><p style={{ fontSize: 11, color: '#9898a8', margin: 0 }}>Be clear and concise</p><p style={{ fontSize: 11, color: question.length > MAX_TITLE_LENGTH * 0.9 ? '#ef4444' : '#9898a8', margin: 0 }}>{question.length}/{MAX_TITLE_LENGTH}</p></div>
            </FormCard>

            {/* Media Choice (only if not comparison) */}
            {!isComparison && (
              <FormCard>
                <SectionTitle>Media placement</SectionTitle>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" name="mediaChoice" value="question" checked={mediaChoice === 'question'} onChange={() => setMediaChoice('question')} />
                    <span>Question image</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" name="mediaChoice" value="options" checked={mediaChoice === 'options'} onChange={() => setMediaChoice('options')} />
                    <span>Option images</span>
                  </label>
                </div>
              </FormCard>
            )}

            {/* Question Media (only if question image chosen and not comparison) */}
            {showQuestionMedia && (
              <FormCard>
                <SectionTitle>Question image</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <MediaPicker onPicked={setQMedia} currentImage={qMedia} />
                  {canUseAI && (
                    <AiImageButton
                      onGenerate={handleGenerateQuestionImage}
                      loading={aiLoading.question}
                      disabled={!question.trim()}
                      label="Generate with AI"
                    />
                  )}
                </div>
              </FormCard>
            )}

            {/* Poll type */}
            <FormCard>
              <SectionTitle>Poll Type</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {POLL_TYPES.map(pt => {
                  const allowed = canCreatePollType(tier, pt.value);
                  const selected = type === pt.value;
                  return (
                    <button key={pt.value} onClick={() => allowed && handleTypeChange(pt.value)} style={{ border: `1.5px solid ${selected ? '#6C5CE7' : '#e8e8ee'}`, borderRadius: 12, padding: '12px 8px', cursor: allowed ? 'pointer' : 'not-allowed', background: selected ? '#f0eeff' : '#fff', opacity: allowed ? 1 : 0.5, transition: 'all .15s', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{POLL_TYPE_ICONS[pt.value]}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: selected ? '#6C5CE7' : '#444' }}>{pt.label}</div>
                      {!allowed && <div style={{ fontSize: 9, color: '#a855f7', marginTop: 3, fontWeight: 600 }}>Premium</div>}
                    </button>
                  );
                })}
              </div>
            </FormCard>

            {/* Rating scale */}
            {type === 'rating' && (
              <FormCard>
                <SectionTitle>Rating Scale</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[{ label: 'Min', key: 'min' }, { label: 'Max', key: 'max' }, { label: 'Step', key: 'step' }].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9898a8', marginBottom: 5 }}>{f.label}</label>
                      <input type="number" style={{ width: '100%', background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={ratingScale[f.key]} onChange={e => setRatingScale(prev => ({ ...prev, [f.key]: Math.max(1, parseInt(e.target.value) || 1) }))} />
                    </div>
                  ))}
                </div>
              </FormCard>
            )}

            {/* Options */}
            {showOptions && (
              <FormCard>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><SectionTitle>Answer Options ({options.length}/{maxOpts})</SectionTitle></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {options.map((opt, i) => (
                    <div key={opt.id}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#9898a8', minWidth: 20 }}>{i + 1}.</span>
                        <input style={{ flex: 1, background: opt.text ? '#fff' : '#f7f7fb', border: `1px solid ${opt.text ? '#d4ccf0' : '#e8e8ee'}`, borderRadius: 9, padding: '10px 13px', fontSize: 14, color: '#111', outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s', boxSizing: 'border-box' }} placeholder={`Option ${i + 1}...`} value={opt.text} onChange={e => updateOption(i, e.target.value)} maxLength={MAX_OPTION_LENGTH} />
                        {options.length > 2 && <button onClick={() => removeOption(i)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: '#ef4444', fontSize: 14, flexShrink: 0 }}>✕</button>}
                      </div>
                      {showOptImg && (
                        <div style={{ marginTop: 8, marginLeft: 28 }}>
                          <p style={{ fontSize: 11, color: '#9898a8', marginBottom: 5 }}>Option image {type === 'comparison' ? '(required)' : '(optional)'}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <MediaPicker onPicked={url => setOptMedia(prev => ({ ...prev, [opt.id]: url }))} currentImage={optMedia[opt.id]} />
                            {canUseAI && (
                              <AiImageButton
                                onGenerate={() => handleGenerateOptionImage(opt.id, opt.text)}
                                loading={generatingImageForOption === opt.id}
                                disabled={!opt.text.trim()}
                                label="✨ AI"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {options.length < maxOpts && <button onClick={addOption} style={{ marginTop: 12, background: 'transparent', border: '1.5px dashed #d4ccf0', borderRadius: 9, padding: '10px', width: '100%', color: '#6C5CE7', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add option</button>}
              </FormCard>
            )}

            {/* Category & Tags */}
            <FormCard>
              <SectionTitle>Category & Tags</SectionTitle>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6b7b', marginBottom: 6 }}>Category</label>
              <select style={{ width: '100%', background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 9, padding: '10px 12px', fontSize: 14, color: '#111', outline: 'none', marginBottom: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {category === 'other' && <input style={{ width: '100%', background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 9, padding: '10px 12px', fontSize: 14, color: '#111', outline: 'none', marginBottom: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Enter custom category" value={customCat} onChange={e => setCustomCat(e.target.value)} />}
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6b7b', marginBottom: 6 }}>Tags (max {MAX_TAGS})</label>
              <TagInput tags={tags} onChangeTags={setTags} maxTags={MAX_TAGS} />
            </FormCard>

            {/* Publish button */}
            {progress > 0 && (
              <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: '#9898a8', fontWeight: 600 }}><span>Publishing...</span><span>{progress}%</span></div>
                <div style={{ height: 6, background: '#f0f0f5', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#6C5CE7,#a855f7)', borderRadius: 99, transition: 'width .4s ease' }} /></div>
              </div>
            )}
            <button onClick={handlePublish} disabled={publishing} style={{ width: '100%', background: publishing ? '#e8e8ee' : 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: publishing ? '#aaa' : '#fff', border: 'none', borderRadius: 14, padding: '15px', fontSize: 15, fontWeight: 800, cursor: publishing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{publishing ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Publishing...</> : isEditing ? 'Update Poll' : 'Publish Poll'}</button>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#9898a8', marginTop: 8 }}>⚡ Instant — your poll goes live immediately</p>
          </div>

          {/* Right: settings sidebar */}
          <div style={{ position: 'sticky', top: 80 }}>
            <FormCard>
              <SectionTitle>Poll Settings</SectionTitle>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6b7b', marginBottom: 6 }}>Visibility</label><select style={{ width: '100%', background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={visibility} onChange={e => setVisibility(e.target.value)}>{VISIBILITY_OPTIONS.map(v => <option key={v.value} value={v.value} disabled={!canUseVisibility(tier, v.value)}>{v.label}{!canUseVisibility(tier, v.value) ? ' (Premium)' : ''}</option>)}</select></div>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6b7b', marginBottom: 6 }}>Duration</label><select style={{ width: '100%', background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={durationMs ?? ''} onChange={e => setDurationMs(e.target.value ? parseInt(e.target.value) : null)}>{DURATION_OPTIONS.map(o => <option key={o.label} value={o.value ?? ''}>{o.label}</option>)}</select></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #f4f4f6' }}>
                <div><p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>Anonymous voting</p><p style={{ fontSize: 11, color: '#9898a8', margin: '2px 0 0' }}>Hide voter identities</p></div>
                <Toggle value={anonymous && visibility !== 'private'} onChange={v => setAnonymous(v)} />
              </div>
            </FormCard>

            {/* Targeting section */}
            {renderTargeting()}

            {/* Usage */}
            <FormCard>
              <SectionTitle>Monthly Usage</SectionTitle>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9898a8', marginBottom: 8 }}><span>{user.pollsThisMonth || 0} used</span><span>{getMonthlyPollLimit(tier) === Infinity ? '∞' : getMonthlyPollLimit(tier)} total</span></div>
              <div style={{ height: 6, background: '#f0f0f5', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}><div style={{ height: '100%', width: `${usagePct}%`, background: usagePct >= 90 ? '#ef4444' : 'linear-gradient(90deg,#6C5CE7,#a855f7)', borderRadius: 99 }} /></div>
              <p style={{ fontSize: 11, color: pollsLeft <= 0 ? '#ef4444' : '#9898a8', margin: 0, fontWeight: pollsLeft <= 0 ? 700 : 400 }}>{pollsLeft <= 0 ? 'Limit reached — ' : `${pollsLeft} polls remaining · `}{tier === 'free' && <a href="/upgrade" style={{ color: '#6C5CE7', fontWeight: 600 }}>Upgrade for more</a>}</p>
            </FormCard>

            {/* Premium upsell */}
            {tier === 'free' && (
              <div style={{ background: 'linear-gradient(135deg,#f0eeff,#fce8ff)', border: '1px solid #ddd6fe', borderRadius: 16, padding: '18px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, margin: 0 }}>⭐</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#5b21b6', marginTop: 8, marginBottom: 4 }}>Unlock Premium</p>
                <p style={{ fontSize: 11, color: '#7c3aed', marginBottom: 14, lineHeight: 1.5 }}>Unlimited polls, AI images, targeting, private polls & advanced analytics.</p>
                <a href="/upgrade" style={{ display: 'block', background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 10, padding: '9px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Upgrade Now →</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Country picker modal */}
      {showCountryPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 24, maxWidth: 500, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Select Countries</h3>
            <input type="text" placeholder="Search..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #e8e8ee', borderRadius: 10, marginBottom: 16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{filteredCountries.map(country => (<label key={country.code} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}><input type="checkbox" checked={targeting.countries.includes(country.code)} onChange={() => { if (targeting.countries.includes(country.code)) setTargeting(prev => ({ ...prev, countries: prev.countries.filter(c => c !== country.code) })); else setTargeting(prev => ({ ...prev, countries: [...prev.countries, country.code] })); }} /><span>{country.name}</span></label>))}</div>
            <button onClick={() => setShowCountryPicker(false)} style={{ marginTop: 20, width: '100%', background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width: 768px) {
          .create-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}