'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSaas } from '@/context/SaasContext';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AllTables from '@/components/AllTables';
import AdminStats from '@/components/AdminStats';
import ActivityLog from '@/components/ActivityLog';
import AIAnalysis from '@/components/AIAnalysis';
import WorkerManagement from '@/components/WorkerManagement';
import DatabaseSettings from '@/components/DatabaseSettings';
import { LayoutDashboard, Package, Users, ClipboardList, Sparkles, Settings, Menu, X, Building2 } from 'lucide-react';

// Sidebar Component
function CompanySidebar({ activeTab, setActiveTab, databases, activeDatabase, selectDatabase, sidebarOpen }) {
  const { company } = useSaas();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', Icon: Package },
    { id: 'workers', label: 'Workers', Icon: Users },
    { id: 'activity', label: 'Activity', Icon: ClipboardList },
    { id: 'ai', label: 'AI Analysis', Icon: Sparkles },
    { id: 'settings', label: 'Settings', Icon: Settings }
  ];

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      width: sidebarOpen ? 280 : 0,
      height: '100vh',
      background: '#0a0a0a',
      borderRight: '1px solid #1a1a1a',
      zIndex: 200,
      transition: 'width 0.3s ease',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1, overflowY: 'auto', width: 280 }}>
        {/* Company Header */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid #1a1a1a',
          background: 'rgba(232, 255, 71, 0.05)',
          width: 280,
          boxSizing: 'border-box'
        }}>
          <div style={{
            fontSize: 14,
            fontFamily: "'Space Mono', monospace",
            fontWeight: 800,
            color: '#e8ff47',
            marginBottom: 4
          }}>
            {company?.name || 'Company'}
          </div>
          <div style={{
            fontSize: 11,
            color: '#666',
            marginBottom: 12
          }}>
            Account Dashboard
          </div>

          {/* Database Selector */}
          <select
            value={activeDatabase?._id || ''}
            onChange={e => {
              const selected = databases.find(d => d._id === e.target.value);
              if (selected) {
                selectDatabase(selected);
                toast.success(`Switched to ${selected.name} successfully`);
              }
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'rgba(232, 255, 71, 0.1)',
              border: '1px solid rgba(232, 255, 71, 0.3)',
              borderRadius: 6,
              color: '#e8ff47',
              fontSize: 11,
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          >
            <option value="">All Databases</option>
            {databases && databases.map(db => (
              <option key={db._id} value={db._id}>
                {db.icon} {db.name}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '12px 8px', width: 280, boxSizing: 'border-box' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: activeTab === item.id ? 'rgba(232, 255, 71, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: 8,
                color: activeTab === item.id ? '#e8ff47' : '#888',
                fontSize: 13,
                fontWeight: activeTab === item.id ? 600 : 500,
                cursor: 'pointer',
                marginBottom: 6,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              onMouseEnter={e => {
                if (activeTab !== item.id) {
                  e.target.style.background = 'rgba(232, 255, 71, 0.08)';
                  e.target.style.color = '#999';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== item.id) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#888';
                }
              }}
            >
              <item.Icon size={18} style={{ flexShrink: 0 }} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Database Info Footer */}
      {activeDatabase && (
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid #1a1a1a',
          background: 'rgba(0, 0, 0, 0.5)',
          fontSize: 10,
          color: '#666',
          width: 280,
          boxSizing: 'border-box'
        }}>
          <div style={{ marginBottom: 4 }}>
            <strong style={{ color: '#888' }}>Selected:</strong>
          </div>
          <div style={{
            background: 'rgba(232, 255, 71, 0.08)',
            padding: '6px 8px',
            borderRadius: 4,
            color: '#aaa',
            fontFamily: "'Space Mono', monospace",
            wordBreak: 'break-word'
          }}>
            {activeDatabase.name}
          </div>
        </div>
      )}
    </aside>
  );
}

export default function CompanyDashboard() {
  const { company, databases, activeDatabase, selectDatabase, updateDatabases, logout, companyToken, isSubscriptionActive } = useSaas();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [showAddDb, setShowAddDb] = useState(false);
  const [newDb, setNewDb] = useState({ name:'', description:'', color:'#e8ff47', icon:'📦' });
  const [dbError, setDbError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(!company?.onboarding_dismissed);
  const [creatingDb, setCreatingDb] = useState(false);

  useEffect(() => {
    if (!company) { router.push('/login'); return; }
    setShowOnboarding(!company.onboarding_dismissed);
  }, [company]);

  const handleAddDatabase = async e => {
    e.preventDefault(); setDbError(''); setCreatingDb(true);
    try {
      const res = await api.post('/api/saas/company/databases', newDb, {
        headers: { Authorization: `Bearer ${companyToken}` }
      });
      const updated = [...databases, res.data];
      updateDatabases(updated);
      setShowAddDb(false);
      setNewDb({ name:'', description:'', color:'#e8ff47', icon:'📦' });
      toast.success(`Database "${newDb.name}" created!`);
    } catch(e) { 
      setDbError(e.response?.data?.message || 'Failed to create database');
      toast.error('Could not create database'); 
    } finally { setCreatingDb(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background:'#080808', color:'#f0f0f0', fontFamily:"'DM Sans', sans-serif" }}>
      {/* Left Sidebar */}
      <CompanySidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        databases={databases}
        activeDatabase={activeDatabase}
        selectDatabase={selectDatabase}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', marginLeft: sidebarOpen ? '280px' : '0px', transition: 'margin-left 0.3s ease' }}>
        {/* Top Bar with Toggle */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(8, 8, 8, 0.97)',
          borderBottom: '1px solid #1a1a1a',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 20px',
          height: '56px',
          width: '100%'
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: 20,
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              width: '40px',
              height: '40px'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(232, 255, 71, 0.1)';
              e.currentTarget.style.color = '#e8ff47';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#888';
            }}
            title={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div style={{ fontSize: 13, color: '#666' }}>|</div>
          
          <span style={{ fontFamily:"'Space Mono', monospace", fontSize:14, fontWeight:700, color:'#e8ff47' }}>
            zacnos inventory
          </span>
          
          <div style={{ flex: 1 }} />
          
          <button onClick={() => setShowAddDb(true)}
            style={{ background:'#e8ff47', border:'none', borderRadius:7, color:'#000',
              fontSize:12, fontWeight: 700, cursor:'pointer', padding:'6px 16px', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.target.style.opacity = '1'; }}>
            + Create Database
          </button>

          <button onClick={() => { logout(); router.push('/'); }}
            style={{ background:'none', border:'1px solid #222', borderRadius:7, color:'#555',
              fontSize:12, cursor:'pointer', padding:'6px 12px', transition: 'all 0.2s', marginLeft: '8px' }}
            onMouseEnter={e => { e.target.style.borderColor = '#e8ff47'; e.target.style.color = '#e8ff47'; }}
            onMouseLeave={e => { e.target.style.borderColor = '#222'; e.target.style.color = '#555'; }}>
            Logout
          </button>
        </div>

        {/* Main Content Scroll Area */}
        <main style={{ flex: 1, overflow: 'auto', width: '100%' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
            {databases.length === 0 ? (
              <div style={{ padding:60, textAlign:'center', marginTop:40, background:'#0a0a0a', border:'1px dashed #333', borderRadius:16 }}>
                <div style={{ marginBottom:16, display: 'flex', justifyContent: 'center' }}>
                  <Building2 size={48} color='#e8ff47' />
                </div>
                <h2 style={{ fontFamily:"'Space Mono', monospace", color:'#f0f0f0', marginBottom:8 }}>Welcome to your workspace</h2>
                <p style={{ color:'#888', marginBottom:24, maxWidth:400, margin:'0 auto 24px' }}>It looks like you don't have any databases attached to your company yet. Create your first database to get started.</p>
                <button onClick={() => setShowAddDb(true)} style={{ padding:'10px 20px', borderRadius:8, border:'none', background:'#e8ff47', color:'#000', fontWeight:800, fontSize:13, cursor:'pointer' }}>
                  + Create a Database
                </button>
              </div>
            ) : (
              <>
                {/* Add database modal dialog */}
                {showAddDb && (
                  <div style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ background:'#111', border: '2px solid #e8ff47', padding:24, borderRadius:12, maxWidth:500, width:'90%', boxShadow:'0 10px 40px rgba(0,0,0,0.5)' }}>
                      <h3 style={{ margin:'0 0 16px 0', fontSize:16, fontFamily:"'Space Mono', monospace", color: '#e8ff47' }}>
                        New Inventory Database
                      </h3>
                      {dbError && <div style={{ color:'#ff6666', fontSize:12, marginBottom:12, background:'rgba(255,68,68,0.1)',
                        padding:'8px 12px', borderRadius:6, border:'1px solid rgba(255,68,68,0.2)' }}>{dbError}</div>}
                      <form onSubmit={handleAddDatabase}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:12, marginBottom:16 }}>
                          {[
                            { key:'name', label:'Database Name', placeholder:'e.g. Branch 2 Stock' },
                            { key:'description', label:'Description', placeholder:'Optional description' },
                            { key:'icon', label:'Icon (emoji)', placeholder:'📦' },
                          ].map(f => (
                            <div key={f.key}>
                              <div style={{ fontSize:10, fontFamily:"'Space Mono', monospace", textTransform:'uppercase', color:'#444', marginBottom:5 }}>{f.label}</div>
                              <input value={newDb[f.key]} onChange={e => setNewDb(p=>({...p,[f.key]:e.target.value}))}
                                placeholder={f.placeholder} required={f.key==='name'} disabled={creatingDb}
                                style={{ width:'100%', background:'#161616', border:'1px solid #2a2a2a', borderRadius:8,
                                  padding:'9px 12px', color:'#f0f0f0', fontSize:13, outline:'none', boxSizing:'border-box' }}
                                onFocus={e=>e.target.style.borderColor='#e8ff47'}
                                onBlur={e=>e.target.style.borderColor='#2a2a2a'} />
                            </div>
                          ))}
                          <div>
                            <div style={{ fontSize:10, fontFamily:"'Space Mono', monospace", textTransform:'uppercase', color:'#444', marginBottom:5 }}>Accent Color</div>
                            <input type="color" value={newDb.color} onChange={e => setNewDb(p=>({...p,color:e.target.value}))} disabled={creatingDb}
                              style={{ width:'100%', height:42, background:'#161616', border:'1px solid #2a2a2a', borderRadius:8, cursor:'pointer', padding:4 }} />
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                          <button type="button" onClick={() => { setShowAddDb(false); setDbError(''); }}  disabled={creatingDb}
                            style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #222', background:'transparent', color:'#666', fontSize:12, cursor:'pointer', opacity: creatingDb ? 0.5 : 1 }}>
                            Cancel
                          </button>
                          <button type="submit" disabled={creatingDb} style={{ padding:'9px 20px', borderRadius:8, border:'none', background: creatingDb ? '#999' : '#e8ff47', color:'#000', fontWeight:800, fontSize:12, cursor: creatingDb ? 'not-allowed' : 'pointer' }}>
                            {creatingDb ? 'Creating...' : 'Create Database'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {activeTab === 'dashboard' && (
                  <div>
                    <div style={{ marginBottom:20 }}>
                      <h1 style={{ fontFamily:"'Space Mono', monospace", fontSize:20, fontWeight:800, color:'#f0f0f0' }}>Dashboard</h1>
                      <p style={{ fontSize:12, color:'#444', marginTop:3 }}>{activeDatabase?.name} · Live overview</p>
                    </div>
                    <AdminStats refreshSignal={refreshSignal} activeDatabase={activeDatabase} />
                  </div>
                )}
                {activeTab === 'inventory' && (
                  <div>
                    <div style={{ marginBottom:20 }}>
                      <h1 style={{ fontFamily:"'Space Mono', monospace", fontSize:20, fontWeight:800, color:'#f0f0f0' }}>Inventory</h1>
                      <p style={{ fontSize:12, color:'#444', marginTop:3 }}>{activeDatabase?.name}</p>
                    </div>
                    <AllTables refreshSignal={refreshSignal} activeDatabase={activeDatabase} />
                  </div>
                )}
                {activeTab === 'workers' && <WorkerManagement />}
                {activeTab === 'activity' && <ActivityLog isAdmin={true} activeDatabase={activeDatabase} />}
                {activeTab === 'ai' && <AIAnalysis activeDatabase={activeDatabase} />}
                {activeTab === 'settings' && <DatabaseSettings database={activeDatabase} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
