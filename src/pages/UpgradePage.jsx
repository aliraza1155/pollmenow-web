// src/pages/UpgradePage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { callFunction } from '../lib/firebase';
import { hasPremiumAnalytics } from '../lib/tierUtils';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Plan definitions
const ALL_PLANS = {
  premium_monthly: { id: 'premium_monthly', name: 'Premium', price: 9.99, interval: 'month', tier: 'premium', yearlyId: 'premium_yearly' },
  premium_yearly:  { id: 'premium_yearly',  name: 'Premium', price: 99.99, interval: 'year', tier: 'premium', monthlyId: 'premium_monthly' },
  org_monthly:     { id: 'organization_monthly', name: 'Organization', price: 29.99, interval: 'month', tier: 'organization', yearlyId: 'organization_yearly' },
  org_yearly:      { id: 'organization_yearly',  name: 'Organization', price: 299.99, interval: 'year', tier: 'organization', monthlyId: 'organization_monthly' },
};

const FREE_PLAN = {
  name: 'Free',
  price: 0,
  interval: 'forever',
  tier: 'free',
  features: [
    '5 polls per month',
    '4 options per poll',
    'Public polls only',
    'Basic analytics',
    'Login required to vote',
  ],
};

const PREMIUM_FEATURES = [
  'Unlimited polls',
  '10 options per poll',
  'AI poll generation & images',
  'Private / Friends‑only polls',
  'Advanced analytics & exports',
  'No login required for voters',
  'Priority support',
  'Custom branding',
];

const ORG_FEATURES = [
  'All Premium features',
  'Team management (admins, poll managers)',
  'Advanced targeting (age, gender, country)',
  'Organization branding & white‑label',
  'Priority placement & custom domain',
  'API access & webhooks',
  'Dedicated account manager',
  '99.9% SLA guarantee',
];

// Trust badges
const TRUST_ITEMS = [
  { icon: '🔒', label: 'SSL Secure' },
  { icon: '💳', label: 'All major cards' },
  { icon: '🔄', label: 'Cancel anytime' },
  { icon: '✓', label: 'Stripe verified' },
];

function PaymentForm({ plan, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/upgrade-success` },
        redirect: 'if_required',
      });
      if (error) {
        alert(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        alert('Payment successful! Upgrading account...');
        onSuccess();
      }
    } catch (err) {
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-gray-100">
      <h3 className="text-lg font-bold mb-4">Complete Payment for {plan.name}</h3>
      <PaymentElement />
      <button
        type="submit"
        disabled={loading}
        className="pmn-btn-primary w-full justify-center mt-4"
        style={{ background: loading ? '#e8e8ee' : 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: loading ? '#aaa' : '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Processing...' : `Pay $${plan.price}`}
      </button>
    </form>
  );
}

export default function UpgradePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentTier = user?.tier || 'free';
  const isCurrentPlan = (planTier) => planTier === currentTier;

  const handleSelectPlan = async (plan) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isCurrentPlan(plan.tier)) {
      alert('You are already on this plan.');
      return;
    }
    setSelectedPlan(plan);
    setLoading(true);
    try {
      const result = await callFunction('createPaymentIntent', {
        amount: plan.price,
        currency: 'usd',
        metadata: { planId: plan.id, userId: user.uid },
      });
      setClientSecret(result.clientSecret);
    } catch (err) {
      console.error(err);
      alert('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await refreshUser();
    navigate('/dashboard');
  };

  if (!user) {
    return <div className="text-center py-20">Please login to upgrade</div>;
  }

  // Determine which plan to show based on toggle
  const monthlyPlan = ALL_PLANS.premium_monthly;
  const yearlyPlan = ALL_PLANS.premium_yearly;
  const monthlyOrg = ALL_PLANS.org_monthly;
  const yearlyOrg = ALL_PLANS.org_yearly;
  const activePremium = yearly ? yearlyPlan : monthlyPlan;
  const activeOrg = yearly ? yearlyOrg : monthlyOrg;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h1>
          <p className="text-gray-500 mt-2">Start free. Scale as you grow. No hidden fees.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
            <span className={`text-sm font-semibold ${!yearly ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
            <button
              onClick={() => setYearly(!yearly)}
              className="relative w-10 h-5 rounded-full transition-colors duration-300 bg-gray-200"
              style={{ background: yearly ? 'linear-gradient(135deg,#6C5CE7,#a855f7)' : '#e8e8ee' }}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${yearly ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            <span className={`text-sm font-semibold ${yearly ? 'text-gray-900' : 'text-gray-400'}`}>Yearly</span>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">Save ~20%</span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Free plan */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
            <h3 className="text-xl font-bold">{FREE_PLAN.name}</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900">Free</p>
            <p className="text-sm text-gray-500 mt-1">forever</p>
            <ul className="mt-6 space-y-3">
              {FREE_PLAN.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            {isCurrentPlan('free') ? (
              <span className="mt-6 inline-block w-full text-center text-sm font-semibold text-gray-500 border border-gray-200 rounded-lg py-2">Current plan</span>
            ) : (
              <button
                onClick={() => navigate('/register')}
                className="mt-6 w-full border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Get started
              </button>
            )}
          </div>

          {/* Premium plan */}
          <div className="bg-white border-2 border-purple-500 rounded-2xl p-6 shadow-md relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most popular</div>
            <h3 className="text-xl font-bold">{activePremium.name}</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900">${activePremium.price}</p>
            <p className="text-sm text-gray-500 mt-1">/{activePremium.interval}</p>
            <ul className="mt-6 space-y-3">
              {PREMIUM_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            {isCurrentPlan('premium') ? (
              <span className="mt-6 inline-block w-full text-center text-sm font-semibold text-gray-500 border border-gray-200 rounded-lg py-2">Current plan</span>
            ) : (
              <button
                onClick={() => handleSelectPlan(activePremium)}
                disabled={loading}
                className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Upgrade
              </button>
            )}
          </div>

          {/* Organization plan */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
            <h3 className="text-xl font-bold">{activeOrg.name}</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900">${activeOrg.price}</p>
            <p className="text-sm text-gray-500 mt-1">/{activeOrg.interval}</p>
            <ul className="mt-6 space-y-3">
              {ORG_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            {isCurrentPlan('organization') ? (
              <span className="mt-6 inline-block w-full text-center text-sm font-semibold text-gray-500 border border-gray-200 rounded-lg py-2">Current plan</span>
            ) : (
              <button
                onClick={() => handleSelectPlan(activeOrg)}
                disabled={loading}
                className="mt-6 w-full border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Contact sales
              </button>
            )}
          </div>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap justify-center gap-8 border-t border-gray-100 pt-8 mb-8">
          {TRUST_ITEMS.map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Payment form (shown after selecting a paid plan) */}
        {clientSecret && selectedPlan && (
          <div className="max-w-md mx-auto mt-6 bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
              <PaymentForm plan={selectedPlan} onSuccess={handlePaymentSuccess} />
            </Elements>
            <button
              onClick={() => { setSelectedPlan(null); setClientSecret(null); }}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700 w-full text-center"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}