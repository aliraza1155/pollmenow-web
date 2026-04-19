// src/components/PollCard.jsx
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/utils';
import { PremiumBadge, VerifiedBadge } from './UI';

export default function PollCard({ poll }) {
  const totalVotes = poll.totalVotes || 0;
  const firstTwoOptions = poll.options?.slice(0, 2) || [];

  const getPercent = (votes) => totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

  // Safely format the creation date
  let formattedDate = 'Unknown date';
  if (poll.createdAt) {
    const date = poll.createdAt instanceof Date ? poll.createdAt : new Date(poll.createdAt);
    if (!isNaN(date.getTime())) {
      formattedDate = formatDate(date, 'short');
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
      {/* Creator info */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {poll.creator.profileImage ? (
            <img src={poll.creator.profileImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm bg-primary/10 text-primary">
              {poll.creator.name?.[0] || 'U'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="font-medium text-gray-900">{poll.creator.name}</span>
            {poll.creator.verified && <VerifiedBadge size={14} />}
            {poll.meta?.isPremium && <PremiumBadge size={14} />}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{totalVotes} votes</span>
          </div>
        </div>
      </div>

      {/* Question */}
      <Link to={`/poll/${poll.id}`} className="block">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-primary transition">
          {poll.question}
        </h3>
      </Link>

      {/* Options preview (first two options) */}
      <div className="space-y-2 mb-4">
        {firstTwoOptions.map((opt) => {
          const percent = getPercent(opt.votes || 0);
          return (
            <div key={opt.id}>
              <div className="flex justify-between text-sm mb-0.5">
                <span className="text-gray-700 truncate">{opt.text}</span>
                {totalVotes > 0 && <span className="text-gray-500 text-xs">{Math.round(percent)}%</span>}
              </div>
              {totalVotes > 0 && (
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                </div>
              )}
            </div>
          );
        })}
        {poll.options?.length > 2 && (
          <p className="text-xs text-gray-400">+{poll.options.length - 2} more options</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Link to={`/poll/${poll.id}`} className="flex-1">
          <button className="w-full bg-primary/10 text-primary py-1.5 rounded-lg text-sm font-medium hover:bg-primary/20 transition">
            Vote
          </button>
        </Link>
        <button
          onClick={() => navigator.share?.({ url: `${window.location.origin}/poll/${poll.id}`, title: poll.question })}
          className="px-3 py-1.5 text-gray-500 hover:text-primary transition text-sm"
        >
          Share
        </button>
      </div>
    </div>
  );
}