'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function RestockItems({ refreshSignal }) {
  const [restockItems, setRestockItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRestockItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dynamic-tables/items/restock');
      setRestockItems(Array.isArray(res.data) ? res.data : []);
    } catch(e) {
      console.error('Error fetching restock items:', e);
      setRestockItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchRestockItems();
    
    // Fetch on refreshSignal change
    if (refreshSignal !== undefined) {
      fetchRestockItems();
    }
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchRestockItems, 15000);
    return () => clearInterval(interval);
  }, [refreshSignal]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#888', fontFamily: "'Space Mono', monospace" }}>
        Loading restock items...
      </div>
    );
  }

  if (!restockItems || restockItems.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#888', fontFamily: "'Space Mono', monospace" }}>
        All items are well-stocked!
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', borderRadius: 8 }}>
          <AlertTriangle size={20} color='#ff6b6b' />
          <span style={{ fontSize: 12, color: '#ff6b6b', fontWeight: 600 }}>
            {restockItems.length} item{restockItems.length !== 1 ? 's' : ''} need restocking
          </span>
        </div>
        <button
          onClick={() => fetchRestockItems()}
          style={{
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            color: '#e8ff47',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#e8ff47'; e.currentTarget.style.background = 'rgba(232, 255, 71, 0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.background = 'transparent'; }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          color: '#f0f0f0'
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222', background: '#0a0a0a' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#e8ff47', textTransform: 'uppercase', fontSize: 11 }}>Item Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#e8ff47', textTransform: 'uppercase', fontSize: 11 }}>Current Stock</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#e8ff47', textTransform: 'uppercase', fontSize: 11 }}>Low Stock Threshold</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#e8ff47', textTransform: 'uppercase', fontSize: 11 }}>Restock Needed</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#e8ff47', textTransform: 'uppercase', fontSize: 11 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {restockItems.map((item, idx) => {
              const urgency = item.currentQuantity === 0 ? 'critical' : item.needsRestock > item.lowStockThreshold * 0.5 ? 'high' : 'medium';
              const statusColor = urgency === 'critical' ? '#ff4444' : urgency === 'high' ? '#ff9147' : '#ffc247';
              
              return (
                <tr
                  key={item._id}
                  style={{
                    borderBottom: '1px solid #1a1a1a',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(232, 255, 71, 0.02)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(232, 255, 71, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(232, 255, 71, 0.02)'}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: 600 }}>{item.itemName}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: item.currentQuantity === 0 ? '#ff4444' : '#f0f0f0' }}>
                      {item.currentQuantity}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>
                    {item.lowStockThreshold}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: `${statusColor}20`,
                      border: `1px solid ${statusColor}`,
                      borderRadius: 4,
                      color: statusColor,
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      +{item.needsRestock}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      background: urgency === 'critical' ? 'rgba(255, 68, 68, 0.1)' : urgency === 'high' ? 'rgba(255, 145, 71, 0.1)' : 'rgba(255, 194, 71, 0.1)',
                      border: `1px solid ${statusColor}`,
                      borderRadius: 4,
                      color: statusColor,
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {urgency === 'critical' ? '🔴 Critical' : urgency === 'high' ? '🟠 High' : '🟡 Medium'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
