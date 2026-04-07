'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const SaasContext = createContext(null);

export const SaasProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [activeDatabase, setActiveDatabase] = useState(null);
  const [companyToken, setCompanyToken] = useState(null);
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('saas_company');
    const storedDbs = localStorage.getItem('saas_databases');
    const storedDb = localStorage.getItem('saas_active_db');
    const storedUser = localStorage.getItem('saas_user');
    const storedToken = localStorage.getItem('saas_token');
    const storedUserToken = localStorage.getItem('saas_user_token');

    if (stored) try { setCompany(JSON.parse(stored)); } catch {}
    if (storedDbs) try { setDatabases(JSON.parse(storedDbs)); } catch {}
    if (storedDb) try { setActiveDatabase(JSON.parse(storedDb)); } catch {}
    if (storedUser) try { setUser(JSON.parse(storedUser)); } catch {}
    if (storedToken) {
      setCompanyToken(storedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    if (storedUserToken) {
      setUserToken(storedUserToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedUserToken}`;
    }
    setLoading(false);
  }, []);

  const loginCompany = (companyData, token, dbs) => {
    setCompany(companyData);
    setCompanyToken(token);
    setDatabases(dbs || []);
    const firstDb = dbs?.[0] || null;
    setActiveDatabase(firstDb);
    localStorage.setItem('saas_token', token);
    localStorage.setItem('saas_company', JSON.stringify(companyData));
    localStorage.setItem('saas_databases', JSON.stringify(dbs || []));
    if (firstDb) localStorage.setItem('saas_active_db', JSON.stringify(firstDb));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const loginUser = (userData, token) => {
    setUser(userData);
    setUserToken(token);
    localStorage.setItem('saas_user_token', token);
    localStorage.setItem('saas_user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const selectDatabase = (db) => {
    setActiveDatabase(db);
    localStorage.setItem('saas_active_db', JSON.stringify(db));
  };

  const updateDatabases = (dbs) => {
    setDatabases(dbs);
    localStorage.setItem('saas_databases', JSON.stringify(dbs));
  };

  const dismissOnboarding = () => {
    if (company) {
      const updated = { ...company, onboarding_dismissed: true };
      setCompany(updated);
      localStorage.setItem('saas_company', JSON.stringify(updated));
    }
  };

  const logout = () => {
    setCompany(null);
    setDatabases([]);
    setActiveDatabase(null);
    setUser(null);
    setCompanyToken(null);
    setUserToken(null);
    ['saas_token','saas_company','saas_databases','saas_active_db','saas_user','saas_user_token'].forEach(k => localStorage.removeItem(k));
    delete axios.defaults.headers.common['Authorization'];
  };

  const isSubscriptionActive = () => {
    if (!company) return false;
    const sub = company.subscription;
    if (!sub) return false;
    if (sub.status === 'trial') return sub.trial_ends_at && new Date() < new Date(sub.trial_ends_at);
    if (sub.status === 'active') return sub.expires_at && new Date() < new Date(sub.expires_at);
    return false;
  };

  return (
    <SaasContext.Provider value={{
      company, databases, activeDatabase, companyToken,
      user, userToken, loading,
      loginCompany, loginUser, selectDatabase, updateDatabases,
      dismissOnboarding, logout, isSubscriptionActive
    }}>
      {children}
    </SaasContext.Provider>
  );
};

export const useSaas = () => {
  const context = useContext(SaasContext);
  if (!context) {
    throw new Error('useSaas must be used within SaasProvider');
  }
  return context;
};
