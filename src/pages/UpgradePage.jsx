// src/pages/UpgradePage.jsx – dark/light mode aware
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { callFunction } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const ALL_PLANS = {
  premium_monthly: { id:'premium_monthly',  name:'Premium',      price:9.99,   interval:'month', tier:'premium',      yearlyId:'premium_yearly'      },
  premium_yearly:  { id:'premium_yearly',   name:'Premium',      price:99.99,  interval:'year',  tier:'premium',      monthlyId:'premium_monthly'    },
  org_monthly:     { id:'organization_monthly', name:'Organization', price:29.99, interval:'month', tier:'organization', yearlyId:'organization_yearly' },
  org_yearly:      { id:'organization_yearly',  name:'Organization', price:299.99,interval:'year',  tier:'organization', monthlyId:'organization_monthly'},
};

const FREE_FEATURES = [
  '5 polls per month',
  '4 options per poll',
  'Public polls only',
  'Basic analytics',
  'Login required to vote',
];

const PREMIUM_FEATURES = [
  'Unlimited polls',
  '10 options per poll',
  'AI poll generation & images',
  'Private / Friends-only polls',
  'Advanced analytics & exports',
  'No login required for voters',
  'Priority support',
  'Custom branding',
];

const ORG_FEATURES = [
  'All Premium features',
  'Team management (admins, poll managers)',
  'Advanced targeting (age, gender, country)',
  'Organization branding & white-label',
  'Priority placement & custom domain',
  'API access & webhooks',
  'Dedicated account manager',
  '99.9% SLA guarantee',
];

const TRUST_ITEMS = [
  { icon:'🔒', label:'SSL Secure'       },
  { icon:'💳', label:'All major cards'  },
  { icon:'🔄', label:'Cancel anytime'   },
  { icon:'✓',  label:'Stripe verified'  },
];

// ── Payment form ──────────────────────────────────────────────
function PaymentForm({ plan, onSuccess, showToast }) {
  const stripe   = useStripe();
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
      if (error)                                    showToast('error', error.message);
      else if (paymentIntent.status === 'succeeded') { showToast('success', 'Payment successful! Upgrading account…'); onSuccess(); }
    } catch { showToast('error', 'Payment failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-gray-100 dark:border-white/8">
      <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-[#f0f0ff]">
        Complete Payment for {plan.name}
      </h3>
      <PaymentElement />
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl py-3 font-bold shadow-md hover:shadow-lg hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? 'Processing…' : `Pay $${plan.price}`}
      </button>
    </form>
  );
}

// ── Feature list ──────────────────────────────────────────────
function FeatureList({ features, accent = false }) {
  return (
    <ul className="mt-6 space-y-3 flex-1">
      {features.map(f => (
        <li key={f} className="flex items-start gap-2.5 text-sm">
          <span className={`flex-shrink-0 mt-0.5 ${accent ? 'text-primary' : 'text-green-500 dark:text-green-400'}`}>✓</span>
          <span className="text-gray-600 dark:text-gray-400">{f}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function UpgradePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [yearly,       setYearly]       = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };
  const currentTier   = user?.tier || 'free';
  const isCurrentPlan = (tier) => tier === currentTier;

  const activePremium = yearly ? ALL_PLANS.premium_yearly  : ALL_PLANS.premium_monthly;
  const activeOrg     = yearly ? ALL_PLANS.org_yearly      : ALL_PLANS.org_monthly;

  const handleSelectPlan = async (plan) => {
    if (!user)                    { navigate('/login'); return; }
    if (isCurrentPlan(plan.tier)) { showToast('info', 'You are already on this plan.'); return; }
    setSelectedPlan(plan);
    setLoading(true);
    try {
      const result = await callFunction('createPaymentIntent', { amount: plan.price, currency: 'usd', metadata: { planId: plan.id, userId: user.uid } });
      setClientSecret(result.clientSecret);
    } catch (err) { showToast('error', 'Failed to initialize payment. Please try again.'); }
    finally { setLoading(false); }
  };

  const handlePaymentSuccess = async () => {
    await new Promise(r => setTimeout(r, 3000));
    await refreshUser();
    showToast('success', 'Upgrade complete! You now have premium features.');
    navigate('/dashboard');
  };

  if (!user) return <div className="text-center py-20 text-gray-500 dark:text-gray-400">Please login to upgrade</div>;

  // ── Shared card class ──
  const cardCls = 'bg-white dark:bg-[#0f1120] rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm flex flex-col hover:shadow-md dark:hover:shadow-black/30 transition';

  return (
    <div className="min-h-screen bg-white dark:bg-[#08091a]">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
            className="fixed top-20 right-4 z-50 max-w-sm w-full"
          >
            <div className={`rounded-xl px-4 py-3 shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-50 dark:bg-green-400/12 border border-green-200 dark:border-green-400/25 text-green-800 dark:text-green-300'
                : toast.type === 'error'
                ? 'bg-red-50 dark:bg-red-400/12 border border-red-200 dark:border-red-400/25 text-red-800 dark:text-red-300'
                : 'bg-blue-50 dark:bg-blue-400/12 border border-blue-200 dark:border-blue-400/25 text-blue-800 dark:text-blue-300'
            }`}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[#f0f0ff]">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Start free. Scale as you grow. No hidden fees.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-3 bg-white dark:bg-[#0f1120] border border-gray-200 dark:border-white/12 rounded-full px-5 py-2.5 shadow-sm">
            <span className={`text-sm font-semibold ${!yearly ? 'text-gray-900 dark:text-[#f0f0ff]' : 'text-gray-400 dark:text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              className="relative w-10 h-5 rounded-full transition-colors duration-300"
              style={{ background: yearly ? 'linear-gradient(135deg,#6C5CE7,#a855f7)' : undefined }}
              aria-label="Toggle billing period"
            >
              <span
                className="absolute inset-0 rounded-full bg-gray-200 dark:bg-white/15 transition-colors duration-300"
                style={{ background: yearly ? 'linear-gradient(135deg,#6C5CE7,#a855f7)' : undefined }}
              />
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${yearly ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
            <span className={`text-sm font-semibold ${yearly ? 'text-gray-900 dark:text-[#f0f0ff]' : 'text-gray-400 dark:text-gray-500'}`}>
              Yearly
            </span>
            <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-400/12 px-2 py-0.5 rounded-full font-semibold">
              Save ~20%
            </span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 items-stretch">

          {/* ── Free ── */}
          <div className={cardCls}>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#f0f0ff]">Free</h3>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-[#f0f0ff]">$0</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">/ forever</span>
              </div>
            </div>
            <FeatureList features={FREE_FEATURES} />
            {isCurrentPlan('free') ? (
              <span className="mt-6 inline-block w-full text-center text-sm font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/12 rounded-xl py-2.5">
                Current plan
              </span>
            ) : (
              <Link
                to="/register"
                className="mt-6 block w-full text-center border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition"
              >
                Get started
              </Link>
            )}
          </div>

          {/* ── Premium ── */}
          <div className="relative bg-white dark:bg-[#0f1120] rounded-2xl border-2 border-primary p-6 shadow-lg flex flex-col">
            {/* Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-4 py-1 rounded-full shadow-sm whitespace-nowrap">
              Most popular
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#f0f0ff]">{activePremium.name}</h3>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-[#f0f0ff]">${activePremium.price}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">/ {activePremium.interval}</span>
              </div>
            </div>
            <FeatureList features={PREMIUM_FEATURES} accent />
            {isCurrentPlan('premium') ? (
              <span className="mt-6 inline-block w-full text-center text-sm font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/12 rounded-xl py-2.5">
                Current plan
              </span>
            ) : (
              <button
                onClick={() => handleSelectPlan(activePremium)}
                disabled={loading}
                className="mt-6 w-full bg-gradient-to-r from-primary to-secondary text-white rounded-xl py-2.5 text-sm font-bold shadow-md hover:shadow-lg hover:opacity-90 transition disabled:opacity-50"
              >
                Upgrade to Premium
              </button>
            )}
          </div>

          {/* ── Organization ── */}
          <div className={cardCls}>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#f0f0ff]">{activeOrg.name}</h3>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-[#f0f0ff]">${activeOrg.price}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">/ {activeOrg.interval}</span>
              </div>
            </div>
            <FeatureList features={ORG_FEATURES} />
            {isCurrentPlan('organization') ? (
              <span className="mt-6 inline-block w-full text-center text-sm font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/12 rounded-xl py-2.5">
                Current plan
              </span>
            ) : (
              <button
                onClick={() => handleSelectPlan(activeOrg)}
                disabled={loading}
                className="mt-6 w-full bg-gradient-to-r from-primary to-secondary text-white rounded-xl py-2.5 text-sm font-bold shadow-md hover:shadow-lg hover:opacity-90 transition disabled:opacity-50"
              >
                Upgrade to Organization
              </button>
            )}
          </div>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap justify-center gap-8 border-t border-gray-100 dark:border-white/8 pt-8 mb-10">
          {TRUST_ITEMS.map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* FAQ teaser */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Have questions?{' '}
            <Link to="/faq" className="text-primary font-semibold hover:underline">View our FAQ</Link>
            {' '}or{' '}
            <Link to="/contact" className="text-primary font-semibold hover:underline">contact us</Link>.
          </p>
        </div>

        {/* Payment form (shown after selecting a paid plan) */}
        {clientSecret && selectedPlan && (
          <div className="max-w-md mx-auto mt-10 bg-white dark:bg-[#0f1120] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-lg">
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: { colorPrimary: '#6C5CE7' },
                },
              }}
            >
              <PaymentForm plan={selectedPlan} onSuccess={handlePaymentSuccess} showToast={showToast} />
            </Elements>
            <button
              onClick={() => { setSelectedPlan(null); setClientSecret(null); }}
              className="mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 w-full text-center transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}