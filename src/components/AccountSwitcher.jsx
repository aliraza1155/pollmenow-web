// src/components/AccountSwitcher.jsx
import { useState } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, User, Building2 } from 'lucide-react';

export default function AccountSwitcher() {
  const { user } = useAuth();
  const { activeAccount, organizations, switchAccount } = useAccount();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const getDisplayName = () => {
    if (activeAccount === 'personal') return user.name || 'Personal';
    const org = organizations.find(o => o.id === activeAccount);
    return org?.name || 'Organization';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
      >
        <span className="text-sm font-medium">{getDisplayName()}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg z-50 min-w-[200px]">
          <div className="py-1">
            <button
              onClick={() => { switchAccount('personal'); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 ${activeAccount === 'personal' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <User size={16} /> Personal Account
            </button>
            {organizations.map(org => (
              <button
                key={org.id}
                onClick={() => { switchAccount(org.id); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 ${activeAccount === org.id ? 'bg-primary/10 text-primary' : ''}`}
              >
                <Building2 size={16} /> {org.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}