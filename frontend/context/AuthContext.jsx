'use client';

import React, { createContext, useContext } from 'react';
import { useSaas } from './SaasContext';

const AuthContext = createContext(null);

// Backward compatibility wrapper that uses SaasContext
export const AuthProvider = ({ children }) => {
  return <>{children}</>;
};

export const useAuth = () => {
  return useSaas();
};

export default AuthContext;
