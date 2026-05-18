// src/App.jsx – with embedded ThemeContext for dark/light mode
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useContext, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccountProvider } from './contexts/AccountContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PollPage from './pages/PollPage';
import PollAnalyticsPage from './pages/PollAnalyticsPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ContactPage from './pages/ContactPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import CreatePollPage from './pages/CreatePollPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import ExplorePage from './pages/ExplorePage';
import TeamManagementPage from './pages/TeamManagementPage';
import UpgradePage from './pages/UpgradePage';
import NotificationsPage from './pages/NotificationsPage';
import AcceptInvite from './pages/AcceptInvite';
import FAQ from './pages/FAQ';
import Blog from './pages/Blog';
import StatusPage from './pages/StatusPage';
import ReportAbuse from './pages/ReportAbuse';
import Affiliates from './pages/Affiliates';
import CookiePolicy from './pages/CookiePolicy';
import GDPR from './pages/GDPR';

// ─── Theme Context ────────────────────────────────────────────
export const ThemeContext = createContext({
  isDark: true,
  toggle: () => {},
});
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  // Default: dark mode ("Creator Dark" design)
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('pmn-theme');
      if (saved !== null) return saved === 'dark';
    } catch {}
    return true; // dark by default
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('pmn-theme', isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Route helpers ────────────────────────────────────────────
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {children}
  </motion.div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-20 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
        <Route path="/poll/:id" element={<PageWrapper><PollPage /></PageWrapper>} />
        <Route path="/explore" element={<PageWrapper><ExplorePage /></PageWrapper>} />
        <Route path="/search" element={<PageWrapper><SearchPage /></PageWrapper>} />
        <Route path="/privacy" element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
        <Route path="/terms" element={<PageWrapper><TermsOfService /></PageWrapper>} />
        <Route path="/contact" element={<PageWrapper><ContactPage /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/reset-password" element={<PageWrapper><ResetPassword /></PageWrapper>} />
        <Route path="/verify-email" element={<PageWrapper><VerifyEmail /></PageWrapper>} />
        <Route path="/accept-invite" element={<PageWrapper><AcceptInvite /></PageWrapper>} />
        <Route path="/faq" element={<PageWrapper><FAQ /></PageWrapper>} />
        <Route path="/blog" element={<PageWrapper><Blog /></PageWrapper>} />
        <Route path="/status" element={<PageWrapper><StatusPage /></PageWrapper>} />
        <Route path="/report" element={<PageWrapper><ReportAbuse /></PageWrapper>} />
        <Route path="/affiliates" element={<PageWrapper><Affiliates /></PageWrapper>} />
        <Route path="/cookies" element={<PageWrapper><CookiePolicy /></PageWrapper>} />
        <Route path="/gdpr" element={<PageWrapper><GDPR /></PageWrapper>} />

        {/* Protected routes */}
        <Route path="/notifications" element={<ProtectedRoute><PageWrapper><NotificationsPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><PageWrapper><CreatePollPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/profile/:id?" element={<ProtectedRoute><PageWrapper><ProfilePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/upgrade" element={<ProtectedRoute><PageWrapper><UpgradePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/poll/analytics/:id" element={<ProtectedRoute><PageWrapper><PollAnalyticsPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute><PageWrapper><TeamManagementPage /></PageWrapper></ProtectedRoute>} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AccountProvider>
          <div className="min-h-screen flex flex-col bg-[var(--pmn-bg)] text-[var(--pmn-text)] transition-colors duration-200">
            <Navbar />
            <main className="flex-grow">
              <AppRoutes />
            </main>
            <Footer />
          </div>
        </AccountProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}