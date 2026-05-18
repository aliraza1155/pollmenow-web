// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Menu, X, User, LogOut, LayoutDashboard,
  PlusCircle, Search, Bell, Users, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { useTheme } from '../App';
import AccountSwitcher from './AccountSwitcher';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Navbar() {
  const { user } = useAuth();
  const { organizations } = useAccount();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const navLinks = [
    { label: 'Home',    href: '/',        exact: true },
    { label: 'Explore', href: '/explore' },
    { label: 'Search',  href: '/search',  icon: Search },
  ];

  const isActive = (path, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const hasOrganizations = organizations && organizations.length > 0;
  const showAccountSwitcher = hasOrganizations && user?.type === 'individual';

  // ── Shared nav link classes ──
  const navLinkClass = (path, exact) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(path, exact)
        ? 'text-primary bg-primary/10 dark:bg-primary/15'
        : 'text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-white/5'
    }`;

  // ── Theme toggle button ──
  const ThemeToggle = ({ className = '' }) => (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-2 rounded-lg transition-all duration-200 ${className}
        text-gray-500 dark:text-gray-400
        hover:text-primary dark:hover:text-primary
        hover:bg-gray-100 dark:hover:bg-white/8
        border border-transparent
        hover:border-gray-200 dark:hover:border-white/10`}
    >
      {isDark
        ? <Sun size={17} className="transition-transform duration-300 rotate-0" />
        : <Moon size={17} className="transition-transform duration-300 rotate-0" />
      }
    </button>
  );

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 dark:bg-[rgba(15,17,32,0.97)] backdrop-blur-lg shadow-sm border-b border-gray-100 dark:border-white/7'
          : 'bg-white/80 dark:bg-[rgba(8,9,26,0.85)] backdrop-blur-sm border-b border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            PollMeNow
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => (
            <Link key={link.label} to={link.href} className={navLinkClass(link.href, link.exact)}>
              {link.icon ? <link.icon className="w-4 h-4 inline mr-1" /> : null}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop right section */}
        <div className="hidden md:flex items-center gap-2">
          {/* Theme toggle */}
          <ThemeToggle />

          {user ? (
            <>
              {showAccountSwitcher && <AccountSwitcher />}

              {/* Notification bell */}
              <Link
                to="/notifications"
                className="relative p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-gray-50 dark:hover:bg-white/5 transition"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Dashboard */}
              <Link
                to="/dashboard"
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-gray-50 dark:hover:bg-white/5 transition"
              >
                <LayoutDashboard size={18} />
              </Link>

              {/* Create */}
              <Link
                to="/create"
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:opacity-90 flex items-center gap-1"
              >
                <PlusCircle size={16} />
                Create
              </Link>

              {/* User menu */}
              <div className="relative group">
                <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 transition border border-transparent dark:border-white/8">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                    {user.name?.[0] || user.email?.[0] || 'U'}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate hidden lg:inline">
                    {user.name || user.email}
                  </span>
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0f1120] rounded-xl shadow-lg border border-gray-100 dark:border-white/8 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link
                    to={`/profile/${user.uid}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <User size={14} /> Profile
                  </Link>
                  {hasOrganizations && (
                    <Link
                      to="/team"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <Users size={14} /> Team Management
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-white/5 w-full text-left"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary transition"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-sm hover:shadow-md hover:opacity-90 transition-all"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-gray-100 dark:border-white/7 bg-white dark:bg-[#0f1120] shadow-lg overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {showAccountSwitcher && (
                <div className="px-3 py-2">
                  <AccountSwitcher />
                </div>
              )}

              {user && (
                <Link
                  to="/notifications"
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <span className="flex items-center gap-2">
                    <Bell size={18} /> Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`px-3 py-2.5 rounded-lg text-base font-medium transition ${
                    isActive(link.href, link.exact)
                      ? 'bg-primary/10 dark:bg-primary/15 text-primary'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="h-px bg-gray-100 dark:bg-white/7 my-1" />

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    <LayoutDashboard size={18} /> Dashboard
                  </Link>
                  <Link
                    to="/create"
                    className="px-3 py-2.5 rounded-lg bg-primary text-white font-semibold text-center"
                  >
                    + Create Poll
                  </Link>
                  <Link
                    to={`/profile/${user.uid}`}
                    className="px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    <User size={18} /> Profile
                  </Link>
                  {hasOrganizations && (
                    <Link
                      to="/team"
                      className="px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                    >
                      <Users size={18} /> Team Management
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-white/5 text-left flex items-center gap-2"
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-semibold text-center"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}