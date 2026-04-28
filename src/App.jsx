// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

// Page wrapper with smooth animations
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

// Protected route (requires login)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Organization-only route
const OrganizationRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!user || user.type !== 'organization') return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
        <Route path="/poll/:id" element={<PageWrapper><PollPage /></PageWrapper>} />
        <Route path="/privacy" element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
        <Route path="/terms" element={<PageWrapper><TermsOfService /></PageWrapper>} />
        <Route path="/contact" element={<PageWrapper><ContactPage /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/reset-password" element={<PageWrapper><ResetPassword /></PageWrapper>} />
        <Route path="/verify-email" element={<PageWrapper><VerifyEmail /></PageWrapper>} />

        {/* Protected routes */}
        <Route path="/create" element={<ProtectedRoute><PageWrapper><CreatePollPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/profile/:id?" element={<ProtectedRoute><PageWrapper><ProfilePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/search" element={<PageWrapper><SearchPage /></PageWrapper>} />
        <Route path="/upgrade" element={<ProtectedRoute><PageWrapper><UpgradePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/poll/analytics/:id" element={<ProtectedRoute><PageWrapper><PollAnalyticsPage /></PageWrapper></ProtectedRoute>} />

        {/* Public explore page */}
        <Route path="/explore" element={<PageWrapper><ExplorePage /></PageWrapper>} />

        {/* Organization only */}
        <Route path="/team" element={<OrganizationRoute><PageWrapper><TeamManagementPage /></PageWrapper></OrganizationRoute>} />

        {/* 404 - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <AppRoutes />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}