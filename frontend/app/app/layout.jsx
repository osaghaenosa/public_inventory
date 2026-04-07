'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSaas } from '@/context/SaasContext';

export default function AppLayout({ children, params }) {
  const router = useRouter();
  const { company, loading } = useSaas();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !company) {
      router.push('/login');
    }
  }, [company, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#080808', display:'flex',
        alignItems:'center', justifyContent:'center', color:'#e8ff47',
        fontFamily:"'Space Mono', monospace" }}>
        Loading...
      </div>
    );
  }

  // Show nothing if not authenticated
  if (!company) {
    return null;
  }

  return (
    <div style={{ minHeight:'100vh', background:'#080808', color:'#f0f0f0',
      fontFamily:"'DM Sans', sans-serif" }}>
      {children}
    </div>
  );
}
