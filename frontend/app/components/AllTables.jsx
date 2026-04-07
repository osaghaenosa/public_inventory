'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useSaas } from '@/context/SaasContext';
import DynamicTableDataGrid from './DynamicTableDataGrid';
import RestockItems from './RestockItems';
import { Filter, AlertTriangle } from 'lucide-react';

export default function AllTables({ refreshSignal }) {
  const { activeDatabase } = useSaas();
  const [schemas, setSchemas] = useState([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAllDatabases, setShowAllDatabases] = useState(false);
  const [restockCount, setRestockCount] = useState(0);

  const fetchSchemas = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dynamic-tables/schemas');
      let schemas = res.data;
      
      if (activeDatabase && !showAllDatabases) {
        schemas = schemas.filter(s => s.database_id === activeDatabase._id);
      }
      
      setSchemas(schemas);
      if (schemas.length > 0 && (!activeTabId || !schemas.find(s => s._id === activeTabId))) {
        setActiveTabId(schemas[0]._id);
      }
      
      // Fetch restock count
      try {
        const restockRes = await api.get('/dynamic-tables/items/restock');
        setRestockCount((restockRes.data || []).length);
      } catch(e) {}
    } catch(e) { console.error('Error fetching schemas', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSchemas(); }, [activeDatabase, refreshSignal, showAllDatabases]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888', fontFamily: "'Space Mono', monospace" }}>Loading Tables...</div>;
  if (!schemas.length) return <div style={{ padding: 40, textAlign: 'center', color: '#888', fontFamily: "'Space Mono', monospace" }}>No tables found. Go to Settings to create one.</div>;

  const activeSchema = schemas.find(s => s._id === activeTabId);
  const isRestockTab = activeTabId === '__restock__';

  return (
    <div>
      {activeDatabase && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: 12, background: '#0c0c0c', border: '1px solid #222', borderRadius: 8 }}>
          <Filter size={16} color='#e8ff47' />
          <span style={{ fontSize: 12, color: '#888' }}>Viewing:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
            <input type="checkbox" checked={!showAllDatabases} onChange={e => setShowAllDatabases(!e.target.checked)} style={{ cursor: 'pointer' }} />
            <span style={{ fontSize: 12, color: !showAllDatabases ? '#e8ff47' : '#666' }}>This Database Only ({activeDatabase.name})</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
            <input type="checkbox" checked={showAllDatabases} onChange={e => setShowAllDatabases(e.target.checked)} style={{ cursor: 'pointer' }} />
            <span style={{ fontSize: 12, color: showAllDatabases ? '#e8ff47' : '#666' }}>Show All Databases</span>
          </label>
          <span style={{ fontSize: 11, color: '#666', marginLeft: 'auto' }}>Found {schemas.length} table{schemas.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid #222', marginBottom: 20, overflowX: 'auto', gap: 4 }}>
        {schemas.map(s => (
          <button key={s._id} onClick={() => setActiveTabId(s._id)} style={{
            padding: '10px 18px', fontSize: 13, fontFamily: "'Space Mono', monospace", fontWeight: 700,
            cursor: 'pointer', background: activeTabId === s._id ? '#1a1a1a' : 'transparent',
            border: 'none', borderBottom: `2px solid ${activeTabId === s._id ? '#e8ff47' : 'transparent'}`,
            color: activeTabId === s._id ? '#e8ff47' : '#888',
            transition: 'all 0.2s', whiteSpace: 'nowrap', borderRadius: '6px 6px 0 0'
          }}>
            {s.name}
          </button>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', paddingLeft: 12, borderLeft: '1px solid #222' }}>
          <button 
            onClick={() => setActiveTabId('__restock__')} 
            style={{
              padding: '10px 18px', 
              fontSize: 13, 
              fontFamily: "'Space Mono', monospace", 
              fontWeight: 700,
              cursor: 'pointer', 
              background: isRestockTab ? '#1a1a1a' : 'transparent',
              border: 'none', 
              borderBottom: `2px solid ${isRestockTab ? '#ff6b6b' : 'transparent'}`,
              color: isRestockTab ? '#ff6b6b' : restockCount > 0 ? '#ff9147' : '#888',
              transition: 'all 0.2s', 
              whiteSpace: 'nowrap', 
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertTriangle size={14} />
            Restock Items
            {restockCount > 0 && (
              <span style={{
                background: '#ff6b6b',
                color: '#000',
                borderRadius: 12,
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 800,
                marginLeft: 4
              }}>
                {restockCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {isRestockTab ? (
        <RestockItems refreshSignal={refreshSignal} />
      ) : activeSchema ? (
        <DynamicTableDataGrid key={activeSchema._id} schema={activeSchema} refreshSignal={refreshSignal} />
      ) : null}
    </div>
  );
}
