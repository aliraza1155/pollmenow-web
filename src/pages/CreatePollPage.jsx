// src/pages/CreatePollPage.jsx – Fully responsive, same logic & features
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { doc, addDoc, collection, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CATEGORIES, POLL_TYPES, VISIBILITY_OPTIONS, DURATION_OPTIONS, MAX_TITLE_LENGTH, MAX_OPTION_LENGTH, MAX_TAGS } from '../lib/constants';
import { canCreatePollType, canUseVisibility, getMaxOptions, getMonthlyPollLimit, hasTargeting, canUseAIFeatures, canUseAIPollGeneration } from '../lib/tierUtils';
import { generatePollSuggestions, generatePollFromURL, generateAndUploadImage, getDetailedPrompt } from '../lib/ai';
import { uploadToFirebaseStorage } from '../lib/upload';
import MediaPicker from '../components/MediaPicker';
import TagInput from '../components/TagInput';

// Basic country list – replace with your full list if needed
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
];

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
  return <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">{children}</p>;
}

function FormCard({ children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl p-5 mb-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={`w-10 h-5.5 rounded-full relative cursor-pointer transition-colors duration-200 flex-shrink-0 ${
        value ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-gray-200'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-200 ${
          value ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </div>
  );
}

function AiImageButton({ onGenerate, loading, disabled, label = '✨ AI' }) {
  return (
    <button
      type="button"
      onClick={onGenerate}
      disabled={loading || disabled}
      className={`bg-gradient-to-r from-primary to-secondary text-white border-none rounded-lg px-3 py-1.5 text-[11px] font-semibold inline-flex items-center gap-1 ${
        loading || disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      }`}
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

  // === Core form state (unchanged) ===
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
  const [isMultiOptionRating, setIsMultiOptionRating] = useState(false);
  const [targeting, setTargeting] = useState({ enabled: false, ageRange: [18, 65], genders: [], countries: [] });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [mediaChoice, setMediaChoice] = useState('question');
  const [isComparison, setIsComparison] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [aiLoading, setAiLoading] = useState({ question: false, poll: false });
  const [aiTopic, setAiTopic] = useState('');
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [generatingImageForOptions, setGeneratingImageForOptions] = useState({});
  const [questionImageKey, setQuestionImageKey] = useState(0);
  const [optionImageKeys, setOptionImageKeys] = useState({});
  const [selectedImageStyle, setSelectedImageStyle] = useState('auto');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');

  // AI generation modals
  const [showAIOptionsModal, setShowAIOptionsModal] = useState(false);
  const [aiTempOptionsCount, setAiTempOptionsCount] = useState(4);
  const [showUrlInputModal, setShowUrlInputModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');
  const [showUrlOptionsModal, setShowUrlOptionsModal] = useState(false);
  const [urlTempType, setUrlTempType] = useState('quick');
  const [urlTempOptionsCount, setUrlTempOptionsCount] = useState(4);

  // Prompt Editor
  const [promptEditorVisible, setPromptEditorVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [editingTarget, setEditingTarget] = useState(null);
  const [editorStyle, setEditorStyle] = useState('auto');
  const [fetchingDetailedPrompt, setFetchingDetailedPrompt] = useState(false);
  const [detailedPromptCache, setDetailedPromptCache] = useState({});

  const tier = user?.tier || 'free';
  const canUseTargeting = hasTargeting(tier);
  const canUseAI = canUseAIPollGeneration(tier);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const getAllOptionTexts = () => options.map(opt => opt.text).filter(t => t.trim());

  // ========== Prompt editor helpers (unchanged) ==========
  const openPromptEditor = async (target) => {
    if (!canUseAI) {
      showToast('error', 'AI image generation requires Premium.');
      return;
    }
    let subject = '';
    let style = selectedImageStyle;
    let cacheKey = '';
    if (target.type === 'question') {
      if (!question.trim()) { showToast('error', 'Enter a question first.'); return; }
      subject = question;
      cacheKey = 'question';
    } else if (target.type === 'option') {
      if (!target.optionText.trim()) { showToast('error', 'Enter option text first.'); return; }
      subject = target.optionText;
      cacheKey = `option_${target.optionId}`;
    }

    setEditingTarget(target);
    setPromptEditorVisible(true);
    setFetchingDetailedPrompt(true);

    if (detailedPromptCache[cacheKey]) {
      const cached = detailedPromptCache[cacheKey];
      setEditingPrompt(cached);
      setOriginalPrompt(cached);
      setEditorStyle(style);
      setFetchingDetailedPrompt(false);
      return;
    }

    try {
      const allOptions = getAllOptionTexts();
      const detailed = await getDetailedPrompt(
        subject,
        target.type === 'question' ? 'poll_question' : 'poll_option',
        style,
        question,
        allOptions,
        target.type === 'option' ? target.index : undefined,
        target.type === 'option' ? target.total : undefined,
        type
      );
      setEditingPrompt(detailed);
      setOriginalPrompt(detailed);
      setEditorStyle(style);
      setDetailedPromptCache(prev => ({ ...prev, [cacheKey]: detailed }));
    } catch (err) {
      console.error(err);
      setEditingPrompt(subject);
      setOriginalPrompt(subject);
      showToast('error', 'Could not generate detailed prompt, using raw text.');
    } finally {
      setFetchingDetailedPrompt(false);
    }
  };

  const confirmImageGeneration = async () => {
    if (!editingTarget) return;
    const target = editingTarget;
    setPromptEditorVisible(false);
    setAiLoading(prev => (target.type === 'question' ? { ...prev, question: true } : prev));
    if (target.type === 'option') {
      setGeneratingImageForOptions(prev => ({ ...prev, [target.optionId]: true }));
    }
    try {
      const allOptions = getAllOptionTexts();
      const isCustomPrompt = editingPrompt !== originalPrompt;
      let permanentUrl;
      if (target.type === 'question') {
        permanentUrl = await generateAndUploadImage(
          editingPrompt,
          `polls/${user.uid}/questions`,
          'poll_question',
          editorStyle,
          question,
          allOptions,
          undefined,
          allOptions.length,
          type,
          isCustomPrompt
        );
        setQMedia(permanentUrl);
        setQuestionImageKey(prev => prev + 1);
        setMediaChoice('question');
        showToast('success', 'Question image generated and uploaded!');
      } else {
        permanentUrl = await generateAndUploadImage(
          editingPrompt,
          `polls/${user.uid}/options`,
          'poll_option',
          editorStyle,
          question,
          allOptions,
          target.index,
          target.total,
          type,
          isCustomPrompt
        );
        setOptMedia(prev => ({ ...prev, [target.optionId]: permanentUrl }));
        setOptionImageKeys(prev => ({ ...prev, [target.optionId]: (prev[target.optionId] || 0) + 1 }));
        showToast('success', 'Option image generated and uploaded!');
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Image generation failed.');
    } finally {
      if (target.type === 'question') {
        setAiLoading(prev => ({ ...prev, question: false }));
      } else {
        setGeneratingImageForOptions(prev => ({ ...prev, [target.optionId]: false }));
      }
    }
  };

  // Image generation handlers
  const handleGenerateQuestionImage = () => {
    if (!canUseAI) { showToast('error', 'AI image generation requires Premium.'); return; }
    if (!question.trim()) { showToast('error', 'Enter a question first.'); return; }
    openPromptEditor({ type: 'question' });
  };

  const handleGenerateOptionImage = (optionId, optionText, optionIndex, totalOptions) => {
    if (!canUseAI) { showToast('error', 'AI image generation requires Premium.'); return; }
    if (!optionText.trim()) { showToast('error', 'Enter option text first.'); return; }
    openPromptEditor({
      type: 'option',
      optionId,
      optionText,
      index: optionIndex,
      total: totalOptions,
    });
  };

  // Auto‑set mediaChoice for comparison
  useEffect(() => {
    const isComp = type === 'comparison';
    setIsComparison(isComp);
    if (isComp) setMediaChoice('options');
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
      if (d.type === 'rating' && d.options && d.options.length > 0) {
        setIsMultiOptionRating(true);
      }
      setIsEditing(true);
    };
    load().catch(console.error);
  }, [editId, user, navigate, canUseTargeting]);

  const handleTypeChange = (t) => {
    setType(t);
    if (t === 'yesno') setOptions([{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }]);
    else if (t === 'rating') {
      if (isMultiOptionRating) setOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
      else setOptions([]);
    } else setOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
  };

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

  // AI topic generation (modal)
  const openAIOptionsModal = () => {
    if (!canUseAI) { showToast('error', 'AI generation requires Premium.'); return; }
    if (!aiTopic.trim()) { showToast('error', 'Enter a topic first.'); return; }
    let defaultCount = options.length;
    if (type === 'quick' && defaultCount < 2) defaultCount = 4;
    if (type === 'yesno') defaultCount = 2;
    if (type === 'comparison') defaultCount = 2;
    if (type === 'live') defaultCount = 2;
    setAiTempOptionsCount(defaultCount);
    setShowAIOptionsModal(true);
  };

  const handleAIGenerate = async () => {
    setShowAIOptionsModal(false);
    setAiLoading(prev => ({ ...prev, poll: true }));
    try {
      const res = await generatePollSuggestions(aiTopic.trim(), aiTempOptionsCount, type);
      setQuestion(res.question || '');
      if (res.options) {
        let newOptions = res.options.map((text, i) => ({ id: i.toString(), text }));
        if (newOptions.length < aiTempOptionsCount) {
          const fallbacks = ['Another option', 'One more', 'Last option'];
          newOptions.push(...fallbacks.slice(0, aiTempOptionsCount - newOptions.length).map((t, idx) => ({ id: (newOptions.length + idx).toString(), text: t })));
        }
        setOptions(newOptions);
      }
      showToast('success', 'AI poll generated!');
    } catch (err) {
      showToast('error', 'AI generation failed.');
    } finally {
      setAiLoading(prev => ({ ...prev, poll: false }));
    }
  };

  // URL generation (two‑step)
  const openUrlInputModal = () => {
    if (!canUseAI) { showToast('error', 'AI generation requires Premium.'); return; }
    setPendingUrl('');
    setShowUrlInputModal(true);
  };

  const proceedToUrlOptions = () => {
    if (!pendingUrl.trim()) { showToast('error', 'Please enter a URL'); return; }
    setShowUrlInputModal(false);
    let defaultCount = options.length;
    if (defaultCount < 2) defaultCount = 4;
    setUrlTempOptionsCount(defaultCount);
    setUrlTempType(type);
    setShowUrlOptionsModal(true);
  };

  const handleGenerateFromURL = async () => {
    setShowUrlOptionsModal(false);
    setAiLoading(prev => ({ ...prev, poll: true }));
    try {
      const res = await generatePollFromURL(pendingUrl, urlTempOptionsCount, urlTempType);
      setQuestion(res.question || '');
      setOptions((res.options || []).map((t, i) => ({ id: i.toString(), text: t })));
      if (urlTempType !== type) {
        setType(urlTempType);
        if (urlTempType === 'yesno') setOptions([{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }]);
      }
      showToast('success', 'Poll generated from URL!');
    } catch (err) {
      showToast('error', err.message || 'Failed to generate from URL');
    } finally {
      setAiLoading(prev => ({ ...prev, poll: false }));
      setPendingUrl('');
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
    if (type === 'rating' && !isMultiOptionRating && ratingScale.min >= ratingScale.max) {
      showToast('error', 'Min rating must be less than max.');
      return false;
    }
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
        ...(type === 'rating'
          ? { scale: ratingScale, options: isMultiOptionRating ? optsWithMedia : [], isMultiOptionRating }
          : { options: optsWithMedia }),
      });

      if (scheduleEnabled && tier === 'premium' && !isEditing) {
        if (!scheduledStart) { showToast('error', 'Please set a start date/time'); setPublishing(false); return; }
        pollData.status = 'scheduled';
        pollData.scheduledStart = Timestamp.fromDate(new Date(scheduledStart));
        if (scheduledEnd) pollData.scheduledEnd = Timestamp.fromDate(new Date(scheduledEnd));
        pollData.createdAt = null;
      } else {
        pollData.status = 'active';
        pollData.createdAt = serverTimestamp();
      }

      if (isEditing) {
        await updateDoc(doc(db, 'polls', editId), { ...pollData, updatedAt: serverTimestamp() });
        showToast('success', 'Poll updated!');
        navigate(`/poll/${editId}`);
      } else {
        const ref_ = await addDoc(collection(db, 'polls'), pollData);
        if (!scheduleEnabled || tier !== 'premium') {
          await updateDoc(doc(db, 'users', user.uid), {
            pollsThisMonth: (user.pollsThisMonth || 0) + 1,
            pollsCreated: (user.pollsCreated || 0) + 1,
            updatedAt: serverTimestamp(),
          });
          await refreshUser();
        }
        setProgress(100);
        if (visibility === 'private' && accessCode) showToast('success', `Poll published! Access code: ${accessCode}`);
        else showToast('success', 'Poll published!');
        navigate(`/poll/${ref_.id}`);
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to publish.');
    } finally {
      setPublishing(false);
      setProgress(0);
    }
  };

  // Helper components for targeting and country picker (unchanged logic)
  const renderTargeting = () => {
    if (!canUseTargeting) return null;
    const filteredCountries = COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));
    return (
      <FormCard>
        <SectionTitle>🎯 Audience Targeting</SectionTitle>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 m-0">Target specific audience</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Show this poll only to selected demographics</p>
          </div>
          <Toggle value={targeting.enabled} onChange={(v) => setTargeting(prev => ({ ...prev, enabled: v }))} />
        </div>
        {targeting.enabled && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="mb-3">
              <label className="text-[11px] font-bold text-gray-500 block mb-1">Age range</label>
              <div className="flex gap-2 items-center">
                <input type="number" value={targeting.ageRange[0]} onChange={e => setTargeting(prev => ({ ...prev, ageRange: [parseInt(e.target.value) || 18, prev.ageRange[1]] }))} className="w-[70px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs" />
                <span>to</span>
                <input type="number" value={targeting.ageRange[1]} onChange={e => setTargeting(prev => ({ ...prev, ageRange: [prev.ageRange[0], parseInt(e.target.value) || 65] }))} className="w-[70px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs" />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[11px] font-bold text-gray-500 block mb-1">Genders</label>
              <div className="flex gap-3">
                {['Male', 'Female', 'Other'].map(g => (
                  <label key={g} className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={targeting.genders.includes(g)} onChange={(e) => { if (e.target.checked) setTargeting(prev => ({ ...prev, genders: [...prev.genders, g] })); else setTargeting(prev => ({ ...prev, genders: prev.genders.filter(x => x !== g) })); }} />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1">Countries</label>
              <button onClick={() => { setCountrySearch(''); setShowCountryPicker(true); }} className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 cursor-pointer">
                {targeting.countries.length === 0 ? 'Select countries' : `${targeting.countries.length} country(s) selected`}
              </button>
              {targeting.countries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {targeting.countries.map(code => {
                    const country = COUNTRIES.find(c => c.code === code);
                    return (
                      <span key={code} className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] flex items-center gap-1">
                        {country?.name || code}
                        <button onClick={() => setTargeting(prev => ({ ...prev, countries: prev.countries.filter(c => c !== code) }))} className="border-none bg-transparent cursor-pointer text-red-500 text-sm">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </FormCard>
    );
  };

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <p className="text-lg font-bold">Sign in to create polls</p>
      <a href="/login" className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-6 py-3 font-semibold shadow hover:shadow-md transition">Sign in</a>
    </div>
  );

  const pollsLeft = getMonthlyPollLimit(tier) - (user.pollsThisMonth || 0);
  const usagePct = Math.min(100, ((user.pollsThisMonth || 0) / getMonthlyPollLimit(tier)) * 100);
  const showOptions = type !== 'yesno' && (type !== 'rating' || isMultiOptionRating);
  const showOptImg = type === 'comparison' || type === 'live' || (mediaChoice === 'options' && showOptions);
  const showQuestionMedia = mediaChoice === 'question' && !isComparison;

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition";
  const textareaClass = "w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-semibold text-gray-800 resize-y min-h-[80px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-fade-up">
          <div className={`rounded-xl px-4 py-3 shadow-lg ${toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {toast.msg}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-7 lg:py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 m-0">{isEditing ? 'Edit Poll' : 'Create a New Poll'}</h1>
          <p className="text-sm text-gray-400 mt-1">{isEditing ? 'Update your poll details below.' : 'Fill in the details, or let AI generate a poll for you.'}</p>
        </div>

        {/* Responsive layout: left column (full width on mobile) + right sidebar (below on mobile) */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left column – main form */}
          <div className="flex-1">
            {/* AI Generator Card */}
            <FormCard>
              <SectionTitle>✦ AI Generate (Optional)</SectionTitle>
              <div className="flex flex-wrap gap-2 mb-2">
                <input
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="e.g. remote work trends 2026..."
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && openAIOptionsModal()}
                />
                <button
                  onClick={openAIOptionsModal}
                  disabled={aiLoading.poll}
                  className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-1.5 ${
                    aiLoading.poll ? 'bg-gray-200 text-gray-500' : 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm hover:shadow'
                  }`}
                >
                  {aiLoading.poll ? <><div className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> Generating</> : '✦ Generate'}
                </button>
                <button
                  onClick={openUrlInputModal}
                  disabled={aiLoading.poll}
                  className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-1.5 ${
                    aiLoading.poll ? 'bg-gray-200 text-gray-500' : 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm hover:shadow'
                  }`}
                >
                  🌐 From URL
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Image Style:</span>
                <select
                  value={selectedImageStyle}
                  onChange={e => setSelectedImageStyle(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs"
                >
                  <option value="auto">Auto</option>
                  <option value="photorealistic">Photorealistic</option>
                  <option value="illustration">Illustration</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="abstract">Abstract</option>
                  <option value="vintage">Vintage</option>
                </select>
                <span className="text-[11px] text-gray-400 ml-1">Applies to all AI‑generated images</span>
              </div>
              {!canUseAI && <p className="text-[11px] text-gray-400 mt-2">AI generation requires Premium. <a href="/upgrade" className="text-primary font-semibold">Upgrade →</a></p>}
            </FormCard>

            {/* Poll Type */}
            <FormCard>
              <SectionTitle>Poll Type</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                {POLL_TYPES.map(pt => {
                  const allowed = canCreatePollType(tier, pt.value);
                  const selected = type === pt.value;
                  return (
                    <button
                      key={pt.value}
                      onClick={() => allowed && handleTypeChange(pt.value)}
                      className={`border rounded-xl py-3 text-center transition ${
                        selected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
                      } ${allowed ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      <div className="text-xl mb-1">{POLL_TYPE_ICONS[pt.value]}</div>
                      <div className={`text-[11px] font-bold ${selected ? 'text-primary' : 'text-gray-700'}`}>{pt.label}</div>
                      {!allowed && <div className="text-[9px] text-secondary font-semibold mt-1">Premium</div>}
                    </button>
                  );
                })}
              </div>
            </FormCard>

            {/* Question */}
            <FormCard>
              <SectionTitle>Poll Question *</SectionTitle>
              <textarea
                className={textareaClass}
                placeholder="What would you like to ask?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                maxLength={MAX_TITLE_LENGTH}
              />
              <div className="flex justify-between mt-1.5">
                <p className="text-[11px] text-gray-400">Be clear and concise</p>
                <p className={`text-[11px] ${question.length > MAX_TITLE_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>{question.length}/{MAX_TITLE_LENGTH}</p>
              </div>
            </FormCard>

            {/* Media Choice */}
            {!isComparison && (
              <FormCard>
                <SectionTitle>Media placement</SectionTitle>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="mediaChoice" value="question" checked={mediaChoice === 'question'} onChange={() => setMediaChoice('question')} />
                    <span>Question image</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="mediaChoice" value="options" checked={mediaChoice === 'options'} onChange={() => setMediaChoice('options')} />
                    <span>Option images</span>
                  </label>
                </div>
              </FormCard>
            )}

            {/* Question Media */}
            {showQuestionMedia && (
              <FormCard>
                <SectionTitle>Question image</SectionTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <MediaPicker key={questionImageKey} onPicked={setQMedia} currentImage={qMedia} />
                  {canUseAI && (
                    <AiImageButton onGenerate={handleGenerateQuestionImage} loading={aiLoading.question} disabled={!question.trim()} label="Generate with AI" />
                  )}
                </div>
              </FormCard>
            )}

            {/* Rating Options */}
            {type === 'rating' && (
              <FormCard>
                <div className="flex justify-between items-center mb-2">
                  <SectionTitle>Rating Options</SectionTitle>
                  <label className="flex items-center gap-2 text-xs">
                    <span>Rate multiple items</span>
                    <input type="checkbox" checked={isMultiOptionRating} onChange={e => { setIsMultiOptionRating(e.target.checked); if (e.target.checked && options.length === 0) setOptions([{ id: '1', text: '' }, { id: '2', text: '' }]); else if (!e.target.checked) setOptions([]); }} />
                  </label>
                </div>
                {!isMultiOptionRating ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[{ label: 'Min', key: 'min' }, { label: 'Max', key: 'max' }, { label: 'Step', key: 'step' }].map(f => (
                      <div key={f.key}>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">{f.label}</label>
                        <input type="number" className={inputClass} value={ratingScale[f.key]} onChange={e => setRatingScale(prev => ({ ...prev, [f.key]: Math.max(1, parseInt(e.target.value) || 1) }))} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Add options below – each will have its own rating.</p>
                )}
              </FormCard>
            )}

            {/* Options */}
            {showOptions && (
              <FormCard>
                <div className="flex justify-between items-center mb-3">
                  <SectionTitle>Answer Options ({options.length}/{maxOpts})</SectionTitle>
                </div>
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <div key={opt.id}>
                      <div className="flex gap-2 items-center flex-wrap">
                        <span className="text-sm font-bold text-gray-400 min-w-[20px]">{i + 1}.</span>
                        <input
                          className={`flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary ${
                            opt.text ? 'border-primary/30' : 'border-gray-200'
                          }`}
                          placeholder={`Option ${i + 1}...`}
                          value={opt.text}
                          onChange={e => updateOption(i, e.target.value)}
                          maxLength={MAX_OPTION_LENGTH}
                        />
                        {options.length > 2 && (
                          <button onClick={() => removeOption(i)} className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-500 flex items-center justify-center">✕</button>
                        )}
                      </div>
                      {showOptImg && (
                        <div className="mt-2 ml-7">
                          <p className="text-[11px] text-gray-400 mb-1">Option image {type === 'comparison' ? '(required)' : '(optional)'}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <MediaPicker key={optionImageKeys[opt.id] || 0} onPicked={url => setOptMedia(prev => ({ ...prev, [opt.id]: url }))} currentImage={optMedia[opt.id]} />
                            {canUseAI && (
                              <AiImageButton
                                onGenerate={() => handleGenerateOptionImage(opt.id, opt.text, i, options.length)}
                                loading={!!generatingImageForOptions[opt.id]}
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
                {options.length < maxOpts && (
                  <button onClick={addOption} className="mt-3 w-full border border-dashed border-primary/30 rounded-lg py-2 text-primary text-sm font-semibold hover:bg-primary/5 transition">
                    + Add option
                  </button>
                )}
              </FormCard>
            )}

            {/* Category & Tags */}
            <FormCard>
              <SectionTitle>Category & Tags</SectionTitle>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Category</label>
              <select
                className={inputClass + " mb-3"}
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {category === 'other' && (
                <input className={inputClass + " mb-3"} placeholder="Enter custom category" value={customCat} onChange={e => setCustomCat(e.target.value)} />
              )}
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tags (max {MAX_TAGS})</label>
              <TagInput tags={tags} onChangeTags={setTags} maxTags={MAX_TAGS} />
            </FormCard>

            {/* Scheduling (Premium only) */}
            {tier === 'premium' && !isEditing && (
              <FormCard>
                <SectionTitle>⏱️ Scheduling</SectionTitle>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 m-0">Schedule for later</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Auto‑publish at specified time</p>
                  </div>
                  <Toggle value={scheduleEnabled} onChange={setScheduleEnabled} />
                </div>
                {scheduleEnabled && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Start date & time *</label>
                      <input type="datetime-local" className={inputClass} value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">End date (optional)</label>
                      <input type="datetime-local" className={inputClass} value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} />
                    </div>
                  </div>
                )}
              </FormCard>
            )}

            {/* ===== MOBILE: Show sidebar content (settings, targeting, usage, upgrade) before publish button ===== */}
            <div className="lg:hidden">
              {/* Poll Settings */}
              <FormCard>
                <SectionTitle>Poll Settings</SectionTitle>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Visibility</label>
                  <select className={inputClass} value={visibility} onChange={e => setVisibility(e.target.value)}>
                    {VISIBILITY_OPTIONS.map(v => (
                      <option key={v.value} value={v.value} disabled={!canUseVisibility(tier, v.value)}>
                        {v.label}{!canUseVisibility(tier, v.value) ? ' (Premium)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Duration</label>
                  <select className={inputClass} value={durationMs ?? ''} onChange={e => setDurationMs(e.target.value ? parseInt(e.target.value) : null)}>
                    {DURATION_OPTIONS.map(o => <option key={o.label} value={o.value ?? ''}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 m-0">Anonymous voting</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Hide voter identities</p>
                  </div>
                  <Toggle value={anonymous && visibility !== 'private'} onChange={v => setAnonymous(v)} />
                </div>
              </FormCard>

              {/* Targeting (if available) */}
              {renderTargeting()}

              {/* Monthly Usage */}
              <FormCard>
                <SectionTitle>Monthly Usage</SectionTitle>
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>{user.pollsThisMonth || 0} used</span>
                  <span>{getMonthlyPollLimit(tier) === Infinity ? '∞' : getMonthlyPollLimit(tier)} total</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${usagePct >= 90 ? 'bg-red-500' : 'bg-gradient-to-r from-primary to-secondary'}`} style={{ width: `${usagePct}%` }} />
                </div>
                <p className={`text-[11px] ${pollsLeft <= 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                  {pollsLeft <= 0 ? 'Limit reached — ' : `${pollsLeft} polls remaining · `}
                  {tier === 'free' && <a href="/upgrade" className="text-primary font-semibold">Upgrade for more</a>}
                </p>
              </FormCard>

              {/* Premium upsell (free tier only) */}
              {tier === 'free' && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-primary/20 rounded-2xl p-4 text-center">
                  <p className="text-2xl">⭐</p>
                  <p className="text-sm font-extrabold text-indigo-800 mt-2 mb-1">Unlock Premium</p>
                  <p className="text-xs text-purple-700 mb-3 leading-relaxed">Unlimited polls, AI images, targeting, private polls & advanced analytics.</p>
                  <a href="/upgrade" className="block bg-gradient-to-r from-primary to-secondary text-white rounded-xl py-2 text-sm font-bold shadow hover:shadow-md transition">Upgrade Now →</a>
                </div>
              )}
            </div>

            {/* Progress & Publish button */}
            {progress > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
                <div className="flex justify-between text-xs text-gray-400 font-semibold mb-2">
                  <span>Publishing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white rounded-xl py-3.5 text-base font-extrabold shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {publishing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing...</>
              ) : (
                isEditing ? 'Update Poll' : (scheduleEnabled ? 'Schedule Poll' : 'Publish Poll')
              )}
            </button>
            <p className="text-center text-[11px] text-gray-400 mt-2">⚡ Instant — your poll goes live immediately</p>
          </div>

          {/* Right sidebar – desktop only (sticky) */}
          <div className="hidden lg:block lg:sticky lg:top-20 space-y-4">
            <FormCard>
              <SectionTitle>Poll Settings</SectionTitle>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Visibility</label>
                <select className={inputClass} value={visibility} onChange={e => setVisibility(e.target.value)}>
                  {VISIBILITY_OPTIONS.map(v => (
                    <option key={v.value} value={v.value} disabled={!canUseVisibility(tier, v.value)}>
                      {v.label}{!canUseVisibility(tier, v.value) ? ' (Premium)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Duration</label>
                <select className={inputClass} value={durationMs ?? ''} onChange={e => setDurationMs(e.target.value ? parseInt(e.target.value) : null)}>
                  {DURATION_OPTIONS.map(o => <option key={o.label} value={o.value ?? ''}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800 m-0">Anonymous voting</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Hide voter identities</p>
                </div>
                <Toggle value={anonymous && visibility !== 'private'} onChange={v => setAnonymous(v)} />
              </div>
            </FormCard>

            {renderTargeting()}

            <FormCard>
              <SectionTitle>Monthly Usage</SectionTitle>
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{user.pollsThisMonth || 0} used</span>
                <span>{getMonthlyPollLimit(tier) === Infinity ? '∞' : getMonthlyPollLimit(tier)} total</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full ${usagePct >= 90 ? 'bg-red-500' : 'bg-gradient-to-r from-primary to-secondary'}`} style={{ width: `${usagePct}%` }} />
              </div>
              <p className={`text-[11px] ${pollsLeft <= 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                {pollsLeft <= 0 ? 'Limit reached — ' : `${pollsLeft} polls remaining · `}
                {tier === 'free' && <a href="/upgrade" className="text-primary font-semibold">Upgrade for more</a>}
              </p>
            </FormCard>

            {tier === 'free' && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-primary/20 rounded-2xl p-4 text-center">
                <p className="text-2xl">⭐</p>
                <p className="text-sm font-extrabold text-indigo-800 mt-2 mb-1">Unlock Premium</p>
                <p className="text-xs text-purple-700 mb-3 leading-relaxed">Unlimited polls, AI images, targeting, private polls & advanced analytics.</p>
                <a href="/upgrade" className="block bg-gradient-to-r from-primary to-secondary text-white rounded-xl py-2 text-sm font-bold shadow hover:shadow-md transition">Upgrade Now →</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals (unchanged) */}
      {/* AI Options Modal (Topic) */}
      {showAIOptionsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-extrabold text-center mb-4">AI Poll Generation</h3>
            <p className="text-sm mb-2">Topic: <strong>{aiTopic}</strong></p>
            <p className="text-sm mb-2">Poll type: <strong>{POLL_TYPES.find(t => t.value === type)?.label}</strong></p>
            <label className="block text-sm font-semibold mb-1">Number of options (2-6):</label>
            <input type="number" min="2" max="6" value={aiTempOptionsCount} onChange={e => setAiTempOptionsCount(Math.min(6, Math.max(2, parseInt(e.target.value) || 2)))} className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-5" />
            <div className="flex gap-2">
              <button onClick={() => setShowAIOptionsModal(false)} className="flex-1 border border-gray-300 bg-white rounded-lg py-2 text-sm cursor-pointer">Cancel</button>
              <button onClick={handleAIGenerate} className="flex-1 bg-gradient-to-r from-primary to-secondary text-white rounded-lg py-2 text-sm font-bold cursor-pointer">Generate</button>
            </div>
          </div>
        </div>
      )}

      {/* URL Input Modal */}
      {showUrlInputModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-extrabold text-center mb-4">Generate Poll from URL</h3>
            <input type="url" placeholder="https://example.com/article" value={pendingUrl} onChange={e => setPendingUrl(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-5" />
            <div className="flex gap-2">
              <button onClick={() => setShowUrlInputModal(false)} className="flex-1 border border-gray-300 bg-white rounded-lg py-2 text-sm cursor-pointer">Cancel</button>
              <button onClick={proceedToUrlOptions} className="flex-1 bg-gradient-to-r from-primary to-secondary text-white rounded-lg py-2 text-sm font-bold cursor-pointer">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* URL Options Modal */}
      {showUrlOptionsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-extrabold text-center mb-4">Configure Your Poll</h3>
            <p className="text-sm mb-2 break-all">URL: <strong>{pendingUrl.substring(0, 60)}...</strong></p>
            <label className="block text-sm font-semibold mb-1">Poll type:</label>
            <select value={urlTempType} onChange={e => setUrlTempType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-4">
              {POLL_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
            </select>
            <label className="block text-sm font-semibold mb-1">Number of options (2-6):</label>
            <input type="number" min="2" max="6" value={urlTempOptionsCount} onChange={e => setUrlTempOptionsCount(Math.min(6, Math.max(2, parseInt(e.target.value) || 2)))} className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-5" />
            <div className="flex gap-2">
              <button onClick={() => setShowUrlOptionsModal(false)} className="flex-1 border border-gray-300 bg-white rounded-lg py-2 text-sm cursor-pointer">Back</button>
              <button onClick={handleGenerateFromURL} className="flex-1 bg-gradient-to-r from-primary to-secondary text-white rounded-lg py-2 text-sm font-bold cursor-pointer">Generate</button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Editor Modal */}
      {promptEditorVisible && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-extrabold text-center mb-2">✏️ Edit Image Prompt</h3>
            <p className="text-xs text-gray-500 text-center mb-4">
              You can modify the prompt to add details like “include NVIDIA logo”, “show a Windows flag”, or specify a particular style.
            </p>
            {fetchingDetailedPrompt ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                <p>Generating detailed prompt...</p>
              </div>
            ) : (
              <>
                <label className="block text-sm font-semibold mb-1">Image prompt (for DALL‑E):</label>
                <textarea value={editingPrompt} onChange={e => setEditingPrompt(e.target.value)} rows={5} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4" />
                <label className="block text-sm font-semibold mb-1">Image Style:</label>
                <select value={editorStyle} onChange={e => setEditorStyle(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-5">
                  <option value="auto">Auto</option>
                  <option value="photorealistic">Photorealistic</option>
                  <option value="illustration">Illustration</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="abstract">Abstract</option>
                  <option value="vintage">Vintage</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setPromptEditorVisible(false)} className="flex-1 border border-gray-300 bg-white rounded-lg py-2 text-sm cursor-pointer">Cancel</button>
                  <button
                    onClick={async () => {
                      if (!editingTarget) return;
                      const cacheKey = editingTarget.type === 'question' ? 'question' : `option_${editingTarget.optionId}`;
                      setDetailedPromptCache(prev => {
                        const newCache = { ...prev };
                        delete newCache[cacheKey];
                        return newCache;
                      });
                      setFetchingDetailedPrompt(true);
                      try {
                        const allOptions = getAllOptionTexts();
                        const detailed = await getDetailedPrompt(
                          editingTarget.type === 'question' ? question : editingTarget.optionText,
                          editingTarget.type === 'question' ? 'poll_question' : 'poll_option',
                          editorStyle,
                          question,
                          allOptions,
                          editingTarget.type === 'option' ? editingTarget.index : undefined,
                          editingTarget.type === 'option' ? editingTarget.total : undefined,
                          type
                        );
                        setEditingPrompt(detailed);
                        setOriginalPrompt(detailed);
                        setDetailedPromptCache(prev => ({ ...prev, [cacheKey]: detailed }));
                      } catch (err) {
                        showToast('error', 'Failed to regenerate prompt');
                      } finally {
                        setFetchingDetailedPrompt(false);
                      }
                    }}
                    className="bg-primary/10 text-primary rounded-lg py-2 text-sm font-semibold px-3 cursor-pointer"
                  >
                    🔄 Regenerate
                  </button>
                  <button onClick={confirmImageGeneration} className="flex-1 bg-gradient-to-r from-primary to-secondary text-white rounded-lg py-2 text-sm font-bold cursor-pointer">Generate Image</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Country picker modal */}
      {showCountryPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-auto">
            <h3 className="text-xl font-extrabold mb-4">Select Countries</h3>
            <input type="text" placeholder="Search..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-4" />
            <div className="space-y-2">
              {COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).map(country => (
                <label key={country.code} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={targeting.countries.includes(country.code)} onChange={() => {
                    if (targeting.countries.includes(country.code))
                      setTargeting(prev => ({ ...prev, countries: prev.countries.filter(c => c !== country.code) }));
                    else
                      setTargeting(prev => ({ ...prev, countries: [...prev.countries, country.code] }));
                  }} />
                  <span>{country.name}</span>
                </label>
              ))}
            </div>
            <button onClick={() => setShowCountryPicker(false)} className="w-full bg-gradient-to-r from-primary to-secondary text-white rounded-lg py-2 mt-5 font-bold">Done</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-up { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        .animate-fade-up { animation: fade-up 0.2s ease-out; }
      `}</style>
    </div>
  );
}