// src/contexts/AccountContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const AccountContext = createContext();

export function AccountProvider({ children }) {
  const { user, refreshUser } = useAuth();
  const [activeAccount, setActiveAccount] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    if (!user) {
      setActiveAccount(null);
      setOrganizations([]);
      return;
    }
    const memberships = user.memberships || {};
    const orgs = Object.entries(memberships).map(([id, data]) => ({
      id,
      name: data.name,
      role: data.role,
    }));
    setOrganizations(orgs);
    let active = user.activeAccount;
    if (!active || (active !== 'personal' && !memberships[active])) {
      active = 'personal';
    }
    setActiveAccount(active);
  }, [user]);

  const switchAccount = async (accountId) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { activeAccount: accountId });
    await refreshUser();
  };

  return (
    <AccountContext.Provider value={{ activeAccount, organizations, switchAccount }}>
      {children}
    </AccountContext.Provider>
  );
}

export const useAccount = () => useContext(AccountContext);