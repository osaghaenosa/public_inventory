'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DynamicTableDataGrid from '@/app/components/DynamicTableDataGridV2';

export default function WorkerDashboard() {
  const router = useRouter();
  const [schemas, setSchemas] = useState([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [activeView, setActiveView] = useState('tables');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('saas_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  const fetchSchemas = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dynamic-tables/schemas');
      setSchemas(res.data);
      if (res.data.length > 0) {
        setActiveTabId(res.data[0]._id);
      }
    } catch(e) {
      console.error('Error fetching schemas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSchemas();
    }
  }, [user]);

  const logout = () => {
    localStorage.removeItem('saas_user_token');
    localStorage.removeItem('saas_user');
    router.push('/');
  };

  if (!user) {
    return (
      <div style={{ minHeight:'100vh', background:'#080808', display:'flex',
        alignItems:'center', justifyContent:'center', color:'#e8ff47',
        fontFamily:"'Space Mono', monospace" }}>
        Loading...
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#080808', display:'flex',
        alignItems:'center', justifyContent:'center', color:'#e8ff47',
        fontFamily:"'Space Mono', monospace" }}>
        Loading workspace...
      </div>
    );
  }

  const activeSchema = schemas.find(s => s._id === activeTabId);

  return (
    <div style={{ minHeight:'100vh', background:'#080808', color:'#f0f0f0',
      fontFamily:"'DM Sans', sans-serif" }}>
      {/* Top Navbar */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(8,8,8,0.97)',
        borderBottom:'1px solid #1a1a1a', backdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 24px', height:56 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontFamily:"'Space Mono', monospace", fontSize:14, fontWeight:700, color:'#e8ff47' }}>
            Worker Portal
          </span>
          <span style={{ fontSize:11, color:'#333' }}>|</span>
          <span style={{ fontSize:13, color:'#888' }}>
            {user.name}
          </span>
        </div>
        <button onClick={logout}
          style={{ background:'none', border:'1px solid #222', borderRadius:7, color:'#555',
            fontSize:12, cursor:'pointer', padding:'5px 12px' }}>
          Logout
        </button>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 20px' }}>
        <h1 style={{ fontFamily:"'Space Mono', monospace", fontSize:24, fontWeight:800, color:'#f0f0f0', marginBottom:20 }}>Inventory Tracker</h1>
        
        {schemas.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', background:'#111', borderRadius:12, border:'1px dashed #333' }}>
            <h3 style={{ fontFamily:"'Space Mono', monospace", color:'#fff', margin:0, marginBottom:8 }}>No Tables Found</h3>
            <p style={{ color:'#888', fontSize:13, margin:0 }}>Your administrator has not created any tables yet.</p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a', marginBottom: 20, overflowX: 'auto', gap:4, alignItems: 'center' }}>
              {schemas.map(s => (
                <button key={s._id} onClick={() => setActiveTabId(s._id)} style={{
                  padding: '10px 18px', fontSize: 13, fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  cursor: 'pointer', background: activeTabId === s._id ? '#1a1a1a' : 'transparent',
                  border: 'none', borderBottom: `2px solid ${activeTabId === s._id ? '#e8ff47' : 'transparent'}`,
                  color: activeTabId === s._id ? '#e8ff47' : '#555',
                  transition: 'all 0.2s', whiteSpace: 'nowrap', borderRadius:'6px 6px 0 0'
                }}>
                  {s.name}
                </button>
              ))}
            </div>

            {activeSchema && (
              <DynamicTableDataGrid 
                key={activeSchema._id} 
                schema={activeSchema} 
                refreshSignal={refreshSignal}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
