// src/contexts/AccountContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const AccountContext = createContext();

export function AccountProvider({ children }) {
  const { user, refreshUser: refreshAuthUser } = useAuth();
  const [activeAccount, setActiveAccount] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  // Function to load user data from Firestore (used both on mount and after refresh)
  const loadUserData = async () => {
    if (!user) {
      setActiveAccount(null);
      setOrganizations([]);
      return;
    }
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const data = userDoc.data();
    const memberships = data?.memberships || {};
    const orgs = Object.entries(memberships).map(([id, membership]) => ({
      id,
      name: membership.name,
      role: membership.role,
    }));
    setOrganizations(orgs);
    let active = data?.activeAccount;
    if (!active || (active !== 'personal' && !memberships[active])) {
      active = 'personal';
    }
    setActiveAccount(active);
  };

  // Initial load when user changes
  useEffect(() => {
    loadUserData();
  }, [user]);

  const switchAccount = async (accountId) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { activeAccount: accountId });
    await refreshAuthUser();   // refresh AuthContext
    await loadUserData();      // refresh AccountContext
  };

  // Expose a refresh function that can be called from components (e.g., after accepting an invitation)
  const refreshUser = async () => {
    await loadUserData();
  };

  return (
    <AccountContext.Provider value={{ activeAccount, organizations, switchAccount, refreshUser }}>
      {children}
    </AccountContext.Provider>
  );
}

export const useAccount = () => useContext(AccountContext);