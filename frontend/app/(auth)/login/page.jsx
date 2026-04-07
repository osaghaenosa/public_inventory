'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useSaas } from '@/context/SaasContext';

export default function CompanyLogin() {
  const { loginCompany } = useSaas();
  const router = useRouter();
  const [form, setForm] = useState({ email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/saas/company/login', form);
      loginCompany(res.data.company, res.data.token, res.data.databases);
      router.push('/app/dashboard');
    } catch(e) {
      setError(e.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center',
      justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400, background:'#0f0f0f', border:'1px solid #1f1f1f',
        borderRadius:16, padding:36 }}>
        <Link href="/" style={{ fontFamily:"'Space Mono', monospace", fontSize:14, fontWeight:700,
          color:'#e8ff47', textDecoration:'none', display:'block', marginBottom:24 }}>← zacnos inventory</Link>
        <h1 style={{ fontFamily:"'Space Mono', monospace", fontSize:22, fontWeight:800, color:'#f0f0f0', marginBottom:6 }}>Welcome back</h1>
        <p style={{ fontSize:13, color:'#555', marginBottom:28 }}>Sign in to your company account</p>

        {error && <div style={{ background:'rgba(255,68,68,0.1)', border:'1px solid rgba(255,68,68,0.2)',
          borderRadius:8, padding:'10px 14px', color:'#ff6666', fontSize:12, marginBottom:16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {[
            { key:'email', label:'Company Email', placeholder:'company@email.com', type:'email' },
            { key:'password', label:'Password', placeholder:'Your password', type:'password' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom:16 }}>
              <label style={{ fontSize:10, fontFamily:"'Space Mono', monospace", textTransform:'uppercase',
                letterSpacing:'0.08em', color:'#555', display:'block', marginBottom:5 }}>{field.label}</label>
              <input type={field.type} value={form[field.key]} onChange={e => setForm(p=>({...p,[field.key]:e.target.value}))}
                placeholder={field.placeholder} required
                style={{ width:'100%', background:'#161616', border:'1px solid #2a2a2a', borderRadius:8,
                  padding:'11px 12px', color:'#f0f0f0', fontSize:13, outline:'none', boxSizing:'border-box' }}
                onFocus={e => e.target.style.borderColor='#e8ff47'}
                onBlur={e => e.target.style.borderColor='#2a2a2a'} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'12px', borderRadius:8, border:'none', background:'#e8ff47',
              color:'#000', fontWeight:800, fontSize:14, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop:8 }}>
            {loading ? '⏳ Signing in...' : 'Sign In →'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:12, color:'#444', marginTop:20 }}>
          Don&apos;t have an account? <Link href="/signup" style={{ color:'#e8ff47', textDecoration:'none' }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
