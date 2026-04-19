// src/pages/ResetPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Button from '../components/Button';
import Card from '../components/Card';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (error) {
      let message = 'Failed to send reset email';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card>
          <h1 className="text-2xl font-bold text-center mb-4">Check your email</h1>
          <p className="text-gray-600 text-center mb-6">
            We've sent password reset instructions to <strong>{email}</strong>.
          </p>
          <Link to="/login" className="block text-center text-primary hover:underline">
            Back to login
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <Card>
        <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
        <p className="text-gray-500 text-center text-sm mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Send Reset Link
          </Button>
        </form>
        <p className="text-center text-sm mt-4">
          Remember your password?{' '}
          <Link to="/login" className="text-primary font-semibold">
            Login
          </Link>
        </p>
      </Card>
    </div>
  );
}


