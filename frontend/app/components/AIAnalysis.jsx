'use client';

import React, { useState } from 'react';
import api from '@/lib/api';

function renderAnalysis(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.*)/gm, '<span style="color:#e8ff47;font-family:\'Space Mono\',monospace;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-top:12px;margin-bottom:4px;">$1</span>')
    .replace(/^# (.*)/gm, '<span style="color:#e8ff47;font-family:\'Space Mono\',monospace;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-top:16px;margin-bottom:8px;">$1</span>')
    .replace(/^### (.*)/gm, '<span style="color:#f0f0f0;font-weight:600;display:block;margin-top:8px;">$1</span>')
    .replace(/^- /gm, '• ')
    .replace(/\n\n/g, '<br/>');
}

export default function AIAnalysis({ activeDatabase }) {
  const [timeRange, setTimeRange] = useState('last_7_days');
  const [context, setContext] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runAnalysis = async (forceRefresh = false, aiMode = true) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/ai/analyze', { 
        timeRange, 
        context, 
        forceRefresh, 
        aiMode,
        database_id: activeDatabase?._id 
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 800, color: '#f0f0f0' }}>
          {activeDatabase ? `Analysis - ${activeDatabase.name}` : 'Database Analysis'}
        </h1>
        <p style={{ fontSize: 12, color: '#444', marginTop: 3 }}>Deep dive into your inventory history with AI insights.</p>
      </div>

      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f0', marginBottom: 16 }}>Analysis Configuration</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Time Period</label>
            <select 
              value={timeRange} 
              onChange={e => { setTimeRange(e.target.value); setResult(null); }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#161616',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                color: '#e8ff47',
                fontSize: 13
              }}
            >
              <option value="last_7_days">Past 7 Days</option>
              <option value="last_30_days">Past 30 Days</option>
              <option value="month_to_date">This Month</option>
              <option value="all_time">All Time</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Context / Instructions (Optional)</label>
            <textarea 
              placeholder="e.g., 'Predict restock dates' or 'Find patterns in sales'"
              value={context} 
              onChange={e => setContext(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#161616',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                color: '#f0f0f0',
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button 
            onClick={() => runAnalysis(false, true)} 
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#e8ff47',
              border: 'none',
              borderRadius: 6,
              color: '#000',
              fontSize: 12,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'Processing...' : '✨ Run AI Analysis'}
          </button>
          
          <button 
            onClick={() => runAnalysis(false, false)} 
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              color: '#888',
              fontSize: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            Simple Summary
          </button>

          {result && result.source === 'ai' && (
            <button 
              onClick={() => runAnalysis(true, true)}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                color: '#e8ff47',
                fontSize: 12,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              ↺ Refresh AI
            </button>
          )}
        </div>
        
        <p style={{ fontSize: 11, color: '#888', marginTop: 12, fontFamily: "'Space Mono', monospace" }}>
          💡 AI results are cached. Use "Refresh AI" if data changed.
        </p>
      </div>

      {error && (
        <div style={{
          background: '#ef4444',
          color: '#fff',
          padding: 16,
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', padding: 24, borderRadius: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f0', marginBottom: 16 }}>Analysis Result</div>
          <div 
            dangerouslySetInnerHTML={{ __html: renderAnalysis(result.analysis) }}
            style={{ color: '#ccc', lineHeight: 1.6, fontSize: 13 }}
          />
          {result.source === 'ai' && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(232, 255, 71, 0.05)', border: '1px solid rgba(232, 255, 71, 0.2)', borderRadius: 6, fontSize: 11, color: '#888' }}>
              ⚡ Powered by AI (cached for 10 minutes)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
