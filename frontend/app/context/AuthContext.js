'use client';

import React, { createContext, useContext } from 'react';
import { useSaas } from './SaasContext';

const AuthContext = createContext(null);

// Shim: existing inventory components call useAuth() — we map it to SaasContext
export const AuthProvider = ({ children }) => <>{children}</>;

export const useAuth = () => {
  const saas = useSaas();
  // Return a user-like object from either the logged-in user or the company
  const user = saas.user || (saas.company ? {
    _id: saas.company.id,
    name: saas.company.name,
    email: saas.company.email,
    role: 'admin'
  } : null);

  return {
    user,
    token: saas.userToken || saas.companyToken,
    login: saas.loginUser,
    logout: saas.logout,
    loading: saas.loading
  };
};
