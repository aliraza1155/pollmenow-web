import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserNotificationSettings, updateUserNotificationSettings, requestWebNotificationPermission } from '../lib/notifications';
import { Bell, Volume2, Zap, Star, Users, Trophy, MessageCircle, Check } from 'lucide-react';

const SETTINGS_CATEGORIES = [
  { key: 'important', label: 'Important', icon: Star, color: '#f59e0b' },
  { key: 'votes', label: 'Votes', icon: Check, color: '#4cd964' },
  { key: 'followers', label: 'Followers', icon: Users, color: '#ff9500' },
  { key: 'achievements', label: 'Achievements', icon: Trophy, color: '#ffcc00' },
  { key: 'discussions', label: 'Discussions', icon: MessageCircle, color: '#6ef3ff' },
];

const DELIVERY_SETTINGS = [
  { key: 'sound', label: 'Sound', icon: Volume2 },
  { key: 'popup', label: 'Browser Popups', icon: Bell },
];

export default function NotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const s = await getUserNotificationSettings(user.uid);
      setSettings(s);
      setLoading(false);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermissionGranted(Notification.permission === 'granted');
      }
    };
    load();
  }, [user]);

  const toggleSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(key);
    try {
      await updateUserNotificationSettings(user.uid, newSettings);
    } catch (err) {
      console.error(err);
      // revert
      setSettings(settings);
    } finally {
      setSaving(null);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestWebNotificationPermission();
    setPermissionGranted(granted);
    if (granted && !settings.popup) {
      toggleSetting('popup', true);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Bell size={20} className="text-primary" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Notification Settings</h3>
      </div>

      {/* Browser permission banner */}
      {typeof window !== 'undefined' && 'Notification' in window && !permissionGranted && (
        <div className="mb-5 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
            🔔 Enable browser notifications to never miss important updates.
          </p>
          <button
            onClick={handleRequestPermission}
            className="bg-amber-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-amber-600 transition"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {/* Categories */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notify me about</p>
        <div className="space-y-3">
          {SETTINGS_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isEnabled = settings[cat.key] !== false;
            return (
              <label key={cat.key} className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Icon size={18} style={{ color: cat.color }} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting(cat.key, !isEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    isEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
            );
          })}
        </div>
      </div>

      {/* Delivery */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Delivery</p>
        <div className="space-y-3">
          {DELIVERY_SETTINGS.map(item => {
            const Icon = item.icon;
            const isEnabled = settings[item.key] !== false;
            return (
              <label key={item.key} className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting(item.key, !isEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    isEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}