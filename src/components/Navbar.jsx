// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Menu, X, User, LogOut, LayoutDashboard, PlusCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  // Static links (always visible)
  const staticLinks = [
    { label: 'Home', href: '/', isRoute: true },
    { label: 'Features', href: '#features', isRoute: false },
    { label: 'Pricing', href: '#pricing', isRoute: false },
    { label: 'Contact', href: '/contact', isRoute: true },
  ];

  // Dynamic links based on auth
  const authLinks = user
    ? [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Create Poll', href: '/create', icon: PlusCircle },
        { label: 'Profile', href: `/profile/${user.uid}`, icon: User },
      ]
    : [
        { label: 'Login', href: '/login', isRoute: true },
        { label: 'Register', href: '/register', isRoute: true },
      ];

  const allLinks = [...staticLinks, ...authLinks];

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100'
          : 'bg-white/70 backdrop-blur-md'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-md group-hover:shadow-primary/30 transition-shadow">
            <BarChart3 className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            PollMeNow
          </span>
        </Link>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-6">
          {staticLinks.map((link) =>
            link.isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                className="relative text-sm text-gray-600 hover:text-primary transition-colors font-medium group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="relative text-sm text-gray-600 hover:text-primary transition-colors font-medium group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
            )
          )}

          {/* Auth-specific desktop links */}
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <Link
                to="/create"
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors"
              >
                <PlusCircle size={16} />
                Create
              </Link>
              <Link
                to={`/profile/${user.uid}`}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors"
              >
                <User size={16} />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:shadow-primary/25 transition-shadow"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-4"
        >
          {staticLinks.map((link) =>
            link.isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm text-gray-700 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-gray-700 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            )
          )}

          {user ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm text-gray-700 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/create"
                className="text-sm text-gray-700 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Create Poll
              </Link>
              <Link
                to={`/profile/${user.uid}`}
                className="text-sm text-gray-700 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                className="text-sm text-red-500 font-medium text-left"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-gray-700 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-full text-sm font-semibold text-center"
                onClick={() => setMobileOpen(false)}
              >
                Get started
              </Link>
            </>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
}