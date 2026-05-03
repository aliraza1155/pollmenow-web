import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch, limit } from 'firebase/firestore';
import { formatRelativeTime } from '../lib/utils';
import { Bell, Check, Settings, ChevronRight, Users, Star, Trophy, MessageCircle } from 'lucide-react';
import NotificationSettings from '../components/NotificationSettings';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setNotifications(items);
    });
    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const markAllAsRead = async () => {
    if (!notifications.some(n => !n.read)) return;
    setMarkingAll(true);
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
    setMarkingAll(false);
  };

  const getIcon = (type) => {
    if (type.includes('vote')) return <Check size={16} className="text-green-500" />;
    if (type.includes('follower')) return <Users size={16} className="text-orange-500" />;
    if (type.includes('achievement')) return <Trophy size={16} className="text-yellow-500" />;
    if (type.includes('discussion')) return <MessageCircle size={16} className="text-primary" />;
    return <Bell size={16} className="text-primary" />;
  };

  const getLink = (notif) => {
    if (notif.relatedId) {
      if (notif.type.includes('poll')) return `/poll/${notif.relatedId}`;
      if (notif.type === 'follower_added') return `/profile/${notif.data?.followerId || notif.relatedId}`;
      if (notif.type.includes('discussion')) return `/discussion/${notif.relatedId}`;
    }
    return '/';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Bell size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Sign in to see notifications</h2>
          <Link to="/login" className="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-xl">Sign in</Link>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main notifications list */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Bell size={28} className="text-primary" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{unreadCount} new</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-primary transition"
                >
                  <Settings size={18} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={markingAll}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Check size={14} />
                    {markingAll ? 'Marking...' : 'Mark all read'}
                  </button>
                )}
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-center py-12">
                <Bell size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notifications yet.</p>
                <Link to="/explore" className="text-primary text-sm mt-2 inline-block">Browse polls →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(notif => (
                  <Link
                    key={notif.id}
                    to={getLink(notif)}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                    className={`block bg-white dark:bg-gray-900 rounded-xl border p-4 transition hover:shadow-md ${
                      !notif.read ? 'border-primary/30 bg-primary/5' : 'border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">{getIcon(notif.type)}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{notif.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-2">{formatRelativeTime(notif.createdAt)}</p>
                      </div>
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Settings sidebar (mobile: drawer, desktop: inline) */}
          {showSettings && (
            <div className="md:w-80">
              <NotificationSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}