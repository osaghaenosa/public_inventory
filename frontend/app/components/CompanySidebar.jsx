'use client';

import React from 'react';
import { useSaas } from '@/context/SaasContext';
import toast from 'react-hot-toast';
import { LayoutDashboard, Package, Users, ClipboardList, Sparkles, Settings } from 'lucide-react';

export default function CompanySidebar({ 
  activeTab, 
  setActiveTab, 
  databases, 
  activeDatabase, 
  selectDatabase, 
  sidebarOpen 
}) {
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
