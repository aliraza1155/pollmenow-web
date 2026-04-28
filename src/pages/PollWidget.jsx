// src/pages/PollWidget.jsx – Modern, responsive, engaging poll widget
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Check, Share2, Copy, ExternalLink } from 'lucide-react';

export default function PollWidget() {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch poll and listen for real‑time updates
  useEffect(() => {
    if (!id) return;
    const pollRef = doc(db, 'polls', id);
    const unsubscribe = onSnapshot(pollRef, (docSnap) => {
      if (docSnap.exists()) {
        setPoll({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
      } else {
        setError('Poll not found');
        setLoading(false);
      }
    }, (err) => {
      console.error(err);
      setError('Failed to load poll');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // Check if already voted via localStorage
  useEffect(() => {
    if (poll && !voted) {
      const votedKey = `voted_${id}`;
      if (localStorage.getItem(votedKey)) {
        setVoted(true);
      }
    }
  }, [poll, id, voted]);

  const handleVote = async () => {
    if (!selectedOption) {
      setError('Please select an option');
      return;
    }
    const votedKey = `voted_${id}`;
    if (localStorage.getItem(votedKey)) {
      setError('You have already voted in this poll');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const pollRef = doc(db, 'polls', id);
      await updateDoc(pollRef, {
        [`options.${selectedOption}.votes`]: increment(1),
        totalVotes: increment(1),
      });
      localStorage.setItem(votedKey, 'true');
      setVoted(true);
    } catch (err) {
      console.error(err);
      setError('Vote failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/poll/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: poll?.question || 'Vote on this poll',
          url: url,
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeWidget = () => {
    window.close();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading poll...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={closeWidget}
            className="bg-primary text-white px-5 py-2 rounded-full text-sm font-semibold shadow hover:shadow-md transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!poll) return null;

  const totalVotes = poll.totalVotes || 0;
  const isExpired = poll.endsAt && new Date(poll.endsAt) < new Date();
  const canVote = !voted && !isExpired;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={closeWidget}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with close button */}
          <div className="relative px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={closeWidget}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">
                P
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">PollMeNow</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6">
            {/* Question */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
              {poll.question}
            </h2>
            {poll.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-5">{poll.description}</p>
            )}

            {/* Expired notice */}
            {isExpired && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-center gap-2">
                <span className="text-amber-600">⏰</span>
                <span className="text-sm text-amber-800 font-medium">This poll has ended</span>
              </div>
            )}

            {/* Vote options or results */}
            {!canVote ? (
              // Results view
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Results</p>
                  <p className="text-xs text-gray-500">{totalVotes.toLocaleString()} votes</p>
                </div>
                <div className="space-y-3">
                  {poll.options.map((opt, idx) => {
                    const percent = totalVotes > 0 ? ((opt.votes || 0) / totalVotes) * 100 : 0;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-800 dark:text-gray-200">{opt.text}</span>
                          <span className="font-semibold text-primary">{Math.round(percent)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {voted && !isExpired && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2 text-green-700 text-sm">
                    <Check size={16} />
                    Thank you for voting!
                  </div>
                )}
              </div>
            ) : (
              // Voting form
              <>
                <div className="space-y-3 mb-6">
                  {poll.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${
                        selectedOption === idx
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="option"
                        value={idx}
                        checked={selectedOption === idx}
                        onChange={() => setSelectedOption(idx)}
                        className="w-4 h-4 text-primary focus:ring-primary mr-3"
                      />
                      <span className="text-gray-800 dark:text-gray-200">{opt.text}</span>
                    </label>
                  ))}
                </div>
                {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                <button
                  onClick={handleVote}
                  disabled={submitting || !selectedOption}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Voting...
                    </>
                  ) : (
                    'Cast Vote'
                  )}
                </button>
              </>
            )}

            {/* Footer actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-3 justify-between items-center">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition"
              >
                {copied ? (
                  <><Check size={16} /> Copied!</>
                ) : (
                  <><Share2 size={16} /> Share this poll</>
                )}
              </button>
              <a
                href={`/poll/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Open in app <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}