// src/pages/UserProfilePage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';
import { isFollowing, followUser, unfollowUser } from '../lib/follow';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import PollCard from '../components/PollCard';
import Card from '../components/Card';
import Button from '../components/Button';
import { formatDate } from '../lib/utils';

export default function UserProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { user: profile, loading: profileLoading } = useUser(id);
  const [polls, setPolls] = useState([]);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  useEffect(() => {
    const fetchPolls = async () => {
      if (!profile) return;
      setPollsLoading(true);
      try {
        const visibilityFilter = user && user.uid === id ? ['public', 'friends', 'private'] : ['public'];
        const q = query(
          collection(db, 'polls'),
          where('creator.id', '==', id),
          where('visibility', 'in', visibilityFilter),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        setPolls(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setPollsLoading(false);
      }
    };
    fetchPolls();
  }, [profile, user, id]);

  useEffect(() => {
    const checkFollow = async () => {
      if (user && profile && user.uid !== id) {
        const following = await isFollowing(id, user.uid);
        setIsFollowingUser(following);
      }
    };
    checkFollow();
  }, [user, profile, id]);

  const handleFollowToggle = async () => {
    if (!user) return;
    setFollowingLoading(true);
    try {
      if (isFollowingUser) {
        await unfollowUser(id, user.uid);
        setIsFollowingUser(false);
      } else {
        await followUser(id, user.uid);
        setIsFollowingUser(true);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setFollowingLoading(false);
    }
  };

  if (profileLoading) return <div className="text-center py-20">Loading profile...</div>;
  if (!profile) return <div className="text-center py-20">User not found</div>;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold">
                {profile.profileImage ? <img src={profile.profileImage} className="w-full h-full rounded-full object-cover" /> : profile.name?.[0] || 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <p className="text-gray-500">@{profile.username}</p>
                <p className="text-sm text-gray-400">Joined {formatDate(profile.createdAt)}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-6 text-sm">
              <div><span className="font-semibold">{profile.followersCount || 0}</span> followers</div>
              <div><span className="font-semibold">{profile.followingCount || 0}</span> following</div>
              <div><span className="font-semibold">{profile.pollsCreated || 0}</span> polls</div>
            </div>
          </div>
          {user && user.uid !== id && (
            <Button onClick={handleFollowToggle} variant={isFollowingUser ? 'secondary' : 'primary'} loading={followingLoading}>
              {isFollowingUser ? 'Unfollow' : 'Follow'}
            </Button>
          )}
        </div>
      </Card>

      <h2 className="text-xl font-bold mt-8 mb-4">Polls by {profile.name}</h2>
      {pollsLoading ? (
        <div className="text-center py-10">Loading polls...</div>
      ) : polls.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No polls created yet</div>
      ) : (
        <div className="space-y-4">
          {polls.map(poll => <PollCard key={poll.id} poll={poll} />)}
        </div>
      )}
    </div>
  );
}