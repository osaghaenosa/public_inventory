'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function renderAnalysis(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.*)/gm, '<span style="color:#e8ff47;font-family:\'Space Mono\',monospace;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-top:12px;margin-bottom:4px;">$1</span>')
    .replace(/^### (.*)/gm, '<span style="color:#f0f0f0;font-weight:600;display:block;margin-top:8px;">$1</span>')
    .replace(/^- /gm, '• ');
}

export default function AdminStats({ refreshSignal, activeDatabase }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  const fetchStats = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/dynamic-tables/stats-chart?range=${timeRange}`),
      api.get('/users'),
      api.get('/activity')
    ]).then(([chartRes, users, activity]) => {
      let chartData = chartRes.data.chartData;
      let activityData = activity.data;
      
      if (activeDatabase) {
        chartData = chartData.filter(item => item.database_id === activeDatabase._id);
        activityData = activityData.filter(item => item.database_id === activeDatabase._id);
      }

      setStats({
        chartData,
        summary: chartRes.data.summary,
        totalWorkers: users.data.length,
        recentActivity: activityData.slice(0, 6)
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [timeRange, activeDatabase]);

  useEffect(() => { fetchStats(); }, [fetchStats, refreshSignal]);

  if (loading && !stats) return <div style={{ padding: 40, textAlign: 'center' }}><span>Loading stats...</span></div>;
  if (!stats) return null;

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {[
          { label: 'Total In-Stock Acquired', value: stats.summary.totalStockValue, cls: 'accent' },
          { label: 'Total Revenue (₦)', value: `₦${stats.summary.totalRevenue.toLocaleString()}`, cls: 'green', small: true },
          { label: 'Total Rows Tracked', value: stats.summary.rowCount, cls: '' },
          { label: 'Total Workers', value: stats.totalWorkers, cls: 'blue' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#0f0f0f',
            border: '1px solid #1a1a1a',
            padding: 16,
            borderRadius: 8,
            borderTop: `3px solid ${{accent: '#e8ff47', green: '#4ade80', blue: '#3b82f6', '': '#666'}[s.cls]}`
          }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>{s.label}</div>
            <div style={{
              fontSize: s.small ? 18 : 24,
              fontWeight: 700,
              color: s.cls === 'accent' ? '#e8ff47' : s.cls === 'green' ? '#4ade80' : s.cls === 'blue' ? '#3b82f6' : '#f0f0f0'
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {stats.chartData && stats.chartData.length > 0 && (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1a1a1a',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24
        }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f0', marginBottom: 8 }}>Inventory Trend</h3>
            <select 
              value={timeRange} 
              onChange={e => setTimeRange(e.target.value)}
              style={{
                padding: '6px 10px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                color: '#e8ff47',
                fontSize: 12
              }}
            >
              <option value="7d">Past 7 days</option>
              <option value="30d">Past 30 days</option>
              <option value="90d">Past 90 days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.chartData}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis dataKey="date" stroke="#666" style={{ fontSize: 12 }} />
              <YAxis stroke="#666" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6 }} />
              <Line type="monotone" dataKey="value" stroke="#e8ff47" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
