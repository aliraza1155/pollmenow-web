// src/pages/PollWidget.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Check } from 'lucide-react';

export default function PollWidget() {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const pollRef = doc(db, 'polls', id);
        const pollSnap = await getDoc(pollRef);
        if (pollSnap.exists()) {
          setPoll({ id: pollSnap.id, ...pollSnap.data() });
        } else {
          setError('Poll not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load poll');
      } finally {
        setLoading(false);
      }
    };
    fetchPoll();
  }, [id]);

  const handleVote = async () => {
    if (!selectedOption) {
      setError('Please select an option');
      return;
    }
    setSubmitting(true);
    try {
      const pollRef = doc(db, 'polls', id);
      // Simple deduplication: store in localStorage
      const votedKey = `voted_${id}`;
      if (localStorage.getItem(votedKey)) {
        setError('You have already voted in this poll');
        setSubmitting(false);
        return;
      }

      await updateDoc(pollRef, {
        [`options.${selectedOption}.votes`]: increment(1),
        totalVotes: increment(1),
      });
      localStorage.setItem(votedKey, 'true');
      setVoted(true);
      // Refresh poll to show updated results
      const updated = await getDoc(pollRef);
      setPoll({ id: updated.id, ...updated.data() });
    } catch (err) {
      console.error(err);
      setError('Vote failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-xl text-white">Loading poll...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-xl text-white text-center">
          <p className="mb-4">{error}</p>
          <button onClick={() => window.close()} className="bg-primary px-4 py-2 rounded">Close</button>
        </div>
      </div>
    );
  }

  const totalVotes = poll.totalVotes || 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden">
        <button
          onClick={() => window.close()}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 z-10"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {poll.question}
          </h2>
          {poll.description && (
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{poll.description}</p>
          )}

          {!voted ? (
            <>
              <div className="space-y-3 mb-6">
                {poll.options.map((opt, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center p-3 border rounded-xl cursor-pointer transition ${
                      selectedOption === idx
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700'
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
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting ? 'Voting...' : 'Vote'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
                <Check size={18} /> Thank you for voting!
              </p>
              <div className="space-y-2">
                {poll.options.map((opt, idx) => {
                  const percent = totalVotes ? ((opt.votes || 0) / totalVotes) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                        <span>{opt.text}</span>
                        <span>{Math.round(percent)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => window.close()}
                className="w-full border border-gray-300 dark:border-gray-600 py-2 rounded-xl mt-4"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}