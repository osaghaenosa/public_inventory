'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function WorkerLogin() {
  const params = useParams();
  const databaseId = params.databaseId;
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbInfo, setDbInfo] = useState(null);

  useEffect(() => {
    // Fetch database and company branding
    axios.get(`/api/saas/public/database-info/${databaseId}`)
      .then(res => setDbInfo(res.data))
      .catch(() => setError('Database not found or inactive.'));
  }, [databaseId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/saas/user/login', {
        email,
        password,
        company_id: dbInfo.company.id,
        database_id: databaseId
      });

      localStorage.setItem('saas_user_token', res.data.token);
      localStorage.setItem('saas_user', JSON.stringify(res.data.user));
      localStorage.setItem('saas_active_db', JSON.stringify(dbInfo.database));

      router.push('/worker/dashboard');
    } catch (e) {
      setError(e.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!dbInfo && !error) {
    return (
      <div style={{ minHeight:'100vh', background:'#080808', color:'#e8ff47', display:'flex',
        alignItems:'center', justifyContent:'center', fontFamily:"'Space Mono', monospace" }}>
        Loading workspace...
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#080808', color:'#f0f0f0', display:'flex',
      alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans', sans-serif", padding:20 }}>
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
        style={{ width:'100%', maxWidth:400, padding:32, background:'#111', border:'1px solid #222',
          borderRadius:16, position:'relative', overflow:'hidden' }}>

        <div style={{ position:'absolute', top:0, right:0, width:100, height:100,
          background:dbInfo?.database?.color||'#e8ff47', filter:'blur(80px)', opacity:0.3 }} />

        {error && (
          <div style={{ background:'rgba(255,68,68,0.1)', color:'#ff6666', padding:'12px 16px',
            borderRadius:8, fontSize:13, marginBottom:24, border:'1px solid rgba(255,68,68,0.3)',
            fontFamily:"'Space Mono', monospace" }}>
            {error}
          </div>
        )}

        {dbInfo ? (
          <>
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                width:56, height:56, borderRadius:16, background:'rgba(255,255,255,0.05)',
                fontSize:24, marginBottom:16, border:`1px solid ${dbInfo.database.color}40` }}>
                {dbInfo.database.icon}
              </div>
              <h1 style={{ fontFamily:"'Space Mono', monospace", fontSize:24, fontWeight:800,
                color:dbInfo.database.color, margin:0 }}>{dbInfo.database.name}</h1>
              <div style={{ fontSize:13, color:'#888', marginTop:8 }}>By {dbInfo.company.name}</div>
            </div>

            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontFamily:"'Space Mono', monospace",
                  textTransform:'uppercase', color:'#555', marginBottom:8 }}>Worker Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:8,
                    padding:'12px 16px', color:'#f0f0f0', outline:'none', transition:'all 0.2s',
                    boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor = dbInfo.database.color}
                  onBlur={e => e.target.style.borderColor = '#333'} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontFamily:"'Space Mono', monospace",
                  textTransform:'uppercase', color:'#555', marginBottom:8 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:8,
                    padding:'12px 16px', color:'#f0f0f0', outline:'none', transition:'all 0.2s',
                    boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor = dbInfo.database.color}
                  onBlur={e => e.target.style.borderColor = '#333'} />
              </div>

              <button type="submit" disabled={loading}
                style={{ marginTop:16, width:'100%', padding:'14px', borderRadius:8, border:'none',
                  background:dbInfo.database.color, color:'#000', fontWeight:800, fontSize:14,
                  cursor:loading?'not-allowed':'pointer', transition:'transform 0.1s' }}
                onMouseDown={e => e.currentTarget.style.transform='scale(0.98)'}
                onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>
                {loading ? 'Logging in...' : 'Access Workspace'}
              </button>
            </form>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}
