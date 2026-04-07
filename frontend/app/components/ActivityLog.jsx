'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function ActivityLog({ isAdmin = false, activeDatabase = null }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/activity')
      .then(res => {
        let filteredLogs = res.data;
        if (activeDatabase) {
          filteredLogs = filteredLogs.filter(log => log.database_id === activeDatabase._id);
        }
        setLogs(filteredLogs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeDatabase]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getActionColor = (action) => {
    if (action.includes('Added')) return '#4ade80';
    if (action.includes('Updated')) return '#3b82f6';
    if (action.includes('Deleted')) return '#ef4444';
    return '#888';
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 800, color: '#f0f0f0' }}>Activity Log</h1>
        <p style={{ fontSize: 12, color: '#444', marginTop: 3 }}>{isAdmin ? 'All activity across the system' : 'Your personal activity'}</p>
      </div>

      <div style={{ 
        background: '#0f0f0f', 
        border: '1px solid #1a1a1a', 
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a', background: '#080808' }}>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888' }}>Time</th>
              {isAdmin && <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888' }}>Worker</th>}
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888' }}>Action</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 4 : 3} style={{ padding: 20, textAlign: 'center', color: '#888' }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={isAdmin ? 4 : 3} style={{ padding: 20, textAlign: 'center', color: '#888' }}>No activity yet</td></tr>
            ) : logs.map(log => (
              <tr key={log._id} style={{ borderBottom: '1px solid #0a0a0a' }}>
                <td style={{ padding: 12, fontSize: 11, color: '#888', whiteSpace: 'nowrap', fontFamily: "'Space Mono', monospace" }}>
                  {formatTime(log.timestamp)}
                </td>
                {isAdmin && (
                  <td style={{ padding: 12, fontSize: 12, color: '#3b82f6' }}>
                    {log.user_id?.name || '—'}
                  </td>
                )}
                <td style={{ padding: 12, fontSize: 12, color: getActionColor(log.action), fontWeight: 600 }}>
                  {log.action}
                </td>
                <td style={{ padding: 12, fontSize: 11, color: '#888' }}>
                  {log.new_value && typeof log.new_value === 'object' ? (
                    <span>
                      {Object.entries(log.new_value)
                        .filter(([k, v]) => k !== '_id' && k !== '__v' && typeof v !== 'object')
                        .slice(0, 4)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' | ')}
                      {Object.keys(log.new_value).length > 4 ? ' ...' : ''}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
