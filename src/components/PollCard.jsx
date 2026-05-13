// src/components/PollCard.jsx – with manual scroll buttons and snap carousel
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/utils';
import { VerifiedBadge, PremiumBadge } from './UI';
import { BarChart3, Eye, Share2, Users, Clock, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

export default function PollCard({ poll, showDetailedStats = false }) {
  const scrollContainerRef = useRef(null);
  const totalVotes = poll.totalVotes || 0;
  const totalViews = poll.totalViews || 0;
  const isExpired = poll.endsAt && new Date(poll.endsAt) < new Date();
  const isLive = poll.meta?.isLive;
  const getPercent = (votes) => (totalVotes > 0 ? (votes / totalVotes) * 100 : 0);

  // Safe date formatting
  let formattedDate = 'Unknown date';
  if (poll.createdAt) {
    const date = poll.createdAt instanceof Date ? poll.createdAt : new Date(poll.createdAt);
    if (!isNaN(date.getTime())) {
      formattedDate = formatDate(date, 'short');
    }
  }

  // Detect if any option has media (image)
  const hasOptionMedia = poll.options?.some(opt => opt.mediaUrl);
  // Use carousel for comparison/live OR if any option has media
  const useCarousel = (poll.type === 'comparison' || poll.type === 'live') || hasOptionMedia;

  // Determine if we have at least 2 options (otherwise scroll buttons not needed)
  const optionsCount = poll.options?.length || 0;
  const showScrollButtons = useCarousel && optionsCount > 1;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Type badge styling
  const getTypeBadge = (type) => {
    const types = {
      quick: { label: '⚡ Quick Poll', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      yesno: { label: '✅ Yes/No', color: 'bg-green-50 text-green-700 border-green-200' },
      rating: { label: '⭐ Rating', color: 'bg-orange-50 text-orange-700 border-orange-200' },
      comparison: { label: '⚖ Comparison', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      live: { label: '🔴 Live', color: 'bg-red-50 text-red-700 border-red-200' }
    };
    return types[type] || types.quick;
  };

  const typeBadge = getTypeBadge(poll.type);

  const renderOptions = () => {
    if (poll.type === 'rating') {
      const avg = poll.averageRating || 0;
      return (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className={`text-lg ${i <= Math.round(avg) ? 'text-amber-500' : 'text-gray-200'}`}>★</span>
          ))}
          {totalVotes > 0 && (
            <span className="text-xs text-gray-500 ml-2">({avg.toFixed(1)})</span>
          )}
        </div>
      );
    }

    if (useCarousel) {
      return (
        <div className="relative">
          {/* Scroll buttons */}
          {showScrollButtons && (
            <>
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow-md hover:bg-white transition"
                aria-label="Scroll left"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow-md hover:bg-white transition"
                aria-label="Scroll right"
              >
                <ChevronRightIcon size={20} className="text-gray-600" />
              </button>
            </>
          )}
          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'thin' }}
          >
            {poll.options.map((opt) => {
              const pct = getPercent(opt.votes || 0);
              return (
                <div
                  key={opt.id}
                  className="flex-shrink-0 w-36 sm:w-44 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition snap-start"
                >
                  {opt.mediaUrl ? (
                    <div className="w-full h-28 sm:h-32 overflow-hidden bg-gray-100">
                      <img
                        src={opt.mediaUrl}
                        alt={opt.text}
                        className="w-full h-full object-cover hover:scale-105 transition duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-28 sm:h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-gray-400 text-sm">
                      No image
                    </div>
                  )}
                  <div className="p-2 text-center">
                    <p className="text-xs font-medium text-gray-800 line-clamp-2">{opt.text}</p>
                    {totalVotes > 0 && (
                      <p className="text-xs font-bold text-primary mt-1">{pct.toFixed(0)}%</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else {
      // Standard bar display (max 3 options with bars)
      const topOptions = poll.options?.slice(0, 3) || [];
      return (
        <div className="space-y-2">
          {topOptions.map((opt, idx) => {
            const percent = getPercent(opt.votes || 0);
            const isLast = idx === topOptions.length - 1 && poll.options?.length > 3;
            return (
              <div key={opt.id} className="relative">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700 truncate flex-1 mr-2">{opt.text}</span>
                  {totalVotes > 0 && (
                    <span className="text-primary font-semibold">{percent.toFixed(0)}%</span>
                  )}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {isLast && (
                  <p className="text-xs text-gray-400 mt-1">
                    +{poll.options.length - 3} more options
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Poll Type Badge & Status */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${typeBadge.color}`}>
          {typeBadge.label}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {isExpired && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Ended</span>
          )}
          {poll.accessCode && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Private</span>
          )}
        </div>
      </div>

      {/* Question Section */}
      <Link to={`/poll/${poll.id}`} className="block px-4 pb-2">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-primary transition">
          {poll.question}
        </h3>
      </Link>

      {/* Question Image (only if no option carousel) */}
      {poll.questionMedia && !useCarousel && (
        <div className="px-4 mb-3">
          <img
            src={poll.questionMedia.url}
            alt="Poll question"
            className="w-full h-32 sm:h-40 object-cover rounded-xl border border-gray-100"
          />
        </div>
      )}

      {/* Options Display */}
      <div className="px-4 pb-3">
        {renderOptions()}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {totalVotes.toLocaleString()} votes
          </span>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {totalViews?.toLocaleString() || 0} views
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formattedDate}
          </span>
        </div>
        {showDetailedStats && (
          <Link to={`/poll/analytics/${poll.id}`} className="text-xs text-primary hover:underline">
            Details
          </Link>
        )}
      </div>

      {/* Creator Info & Actions */}
      <div className="p-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <Link to={`/profile/${poll.creator.id}`} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
            {poll.creator.profileImage ? (
              <img src={poll.creator.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              (poll.creator.name?.[0] || 'U').toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900 truncate">{poll.creator.name}</span>
              {poll.creator.verified && <VerifiedBadge size={12} />}
              {(poll.creator.tier === 'premium' || poll.creator.tier === 'organization') && (
                <PremiumBadge size={12} />
              )}
            </div>
            <p className="text-xs text-gray-400">@{poll.creator.username || 'creator'}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={`/poll/${poll.id}`}
            className="flex items-center gap-1 bg-gradient-to-r from-primary to-secondary text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition"
          >
            Vote <ChevronRight size={12} />
          </Link>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  url: `${window.location.origin}/poll/${poll.id}`,
                  title: poll.question
                });
              } else {
                navigator.clipboard.writeText(`${window.location.origin}/poll/${poll.id}`);
              }
            }}
            className="p-1.5 text-gray-400 hover:text-primary transition rounded-full hover:bg-gray-100"
            title="Share"
          >
            <Share2 size={14} />
          </button>
        </div>
      </div>

      {/* Branding */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
        <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <BarChart3 size={10} />
          PollMeNow — Powered by AI
        </span>
      </div>
    </div>
  );
}