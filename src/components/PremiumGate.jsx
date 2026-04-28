// src/components/PremiumGate.jsx
import { Link } from 'react-router-dom';

/**
 * PremiumGate component – wraps content that requires Premium or Org tier.
 * Shows a blurred overlay with upgrade button if user does not have access.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The premium content to lock.
 * @param {boolean} props.hasAccess - Whether the user has access (tier check).
 * @param {string} props.featureName - Name of the locked feature (for display).
 * @param {string} [props.message] - Optional custom message.
 */
export default function PremiumGate({ children, hasAccess, featureName, message }) {
  if (hasAccess) {
    return <>{children}</>;
  }

  const defaultMessage = message || `${featureName} is a Premium feature. Upgrade to unlock.`;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ filter: 'blur(4px)', opacity: 0.6, pointerEvents: 'none' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.85)',
        borderRadius: 'inherit',
        zIndex: 10,
      }}>
        <div style={{
          background: '#fff',
          padding: '20px 28px',
          borderRadius: 20,
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          maxWidth: '80%',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#111' }}>Premium Feature</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666' }}>{defaultMessage}</p>
          <Link
            to="/upgrade"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg,#6C5CE7,#a855f7)',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 30,
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: 14,
            }}
          >
            Upgrade to Premium
          </Link>
        </div>
      </div>
    </div>
  );
}