'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useSaas } from '@/context/SaasContext';

export default function Signup() {
  const { loginCompany } = useSaas();
  const router = useRouter();
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'', industry:'', phone:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/saas/company/signup', form);
      loginCompany(res.data.company, res.data.token, []);
      router.push('/app/dashboard');
    } catch(e) {
      setError(e.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center',
      justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:440, background:'#0f0f0f', border:'1px solid #1f1f1f',
        borderRadius:16, padding:36 }}>
        <Link href="/" style={{ fontFamily:"'Space Mono', monospace", fontSize:14, fontWeight:700,
          color:'#e8ff47', textDecoration:'none', display:'block', marginBottom:24 }}>← zacnos inventory</Link>
        <h1 style={{ fontFamily:"'Space Mono', monospace", fontSize:22, fontWeight:800,
          color:'#f0f0f0', marginBottom:6 }}>Create your account</h1>
        <p style={{ fontSize:13, color:'#555', marginBottom:28 }}>Start your 14-day free trial. No credit card required.</p>

        {error && <div style={{ background:'rgba(255,68,68,0.1)', border:'1px solid rgba(255,68,68,0.2)',
          borderRadius:8, padding:'10px 14px', color:'#ff6666', fontSize:12, marginBottom:16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {[
            { key:'name', label:'Company Name', placeholder:'e.g. Nnamdi Stores Ltd', required:true },
            { key:'email', label:'Email Address', placeholder:'company@email.com', required:true, type:'email' },
            { key:'phone', label:'Phone Number', placeholder:'+234 ...' },
            { key:'industry', label:'Industry', placeholder:'e.g. Retail, Distribution...' },
            { key:'password', label:'Password', placeholder:'Min 6 characters', required:true, type:'password' },
            { key:'confirm', label:'Confirm Password', placeholder:'Repeat password', required:true, type:'password' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, fontFamily:"'Space Mono', monospace", textTransform:'uppercase',
                letterSpacing:'0.08em', color:'#555', display:'block', marginBottom:5 }}>{field.label}</label>
              <input type={field.type||'text'} value={form[field.key]} onChange={handleChange(field.key)}
                placeholder={field.placeholder} required={field.required}
                style={{ width:'100%', background:'#161616', border:'1px solid #2a2a2a', borderRadius:8,
                  padding:'10px 12px', color:'#f0f0f0', fontSize:13, outline:'none', boxSizing:'border-box',
                  fontFamily:"'DM Sans', sans-serif" }}
                onFocus={e => e.target.style.borderColor='#e8ff47'}
                onBlur={e => e.target.style.borderColor='#2a2a2a'} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'13px', borderRadius:8, border:'none', background:'#e8ff47',
              color:'#000', fontWeight:800, fontSize:14, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop:8, display:'flex', alignItems:'center',
              justifyContent:'center', gap:8 }}>
            {loading ? '⏳ Creating account...' : 'Create Account & Start Trial →'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:12, color:'#444', marginTop:20 }}>
          Already have an account? <Link href="/login" style={{ color:'#e8ff47', textDecoration:'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
