'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Search, AlertCircle } from 'lucide-react';

// ── Auto Input with local filtering ──
function AutoInput({ value, onChange, options = [], placeholder, required, onFocus: onFocusProp }) {
  const [show, setShow] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (v) => {
    onChange(v);
    const q = v.toLowerCase();
    const f = options.filter((o) => {
      const num = o.item_number?.toString().toLowerCase() || '';
      const name = o.item_name?.toString().toLowerCase() || '';
      return num.includes(q) || name.includes(q);
    });
    setFiltered(f);
    setShow(f.length > 0);
  };

  const handleFocus = () => {
    if (onFocusProp) onFocusProp();
    const f = value.trim()
      ? options.filter((o) => {
          const num = o.item_number?.toString().toLowerCase() || '';
          const name = o.item_name?.toString().toLowerCase() || '';
          const q = value.toLowerCase();
          return num.includes(q) || name.includes(q);
        })
      : options;
    setFiltered(f);
    setShow(f.length > 0);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: '#161616',
          border: '1px solid #2a2a2a',
          borderRadius: 6,
          color: '#f0f0f0',
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {show && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            zIndex: 9999,
            maxHeight: 220,
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {filtered.map((item, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item.item_number || item.item_name);
                setShow(false);
              }}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: 13,
                color: '#f0f0f0',
                borderBottom: idx < filtered.length - 1 ? '1px solid #222' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2a2a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>{item.item_name || item.item_number}</span>
              {item.item_number && (
                <span style={{ color: '#555', fontSize: 11 }}>{item.item_number}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DynamicTableDataGrid({ schema, refreshSignal }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const isItemField = (colName) => {
    const lower = colName.toLowerCase();
    return lower.includes('item name') || lower.includes('item number') || lower.includes('item');
  };

  const isQuantityField = (colName) => {
    const lower = colName.toLowerCase();
    return (
      lower.includes('quantity') ||
      lower.includes('sold') ||
      lower.includes('remove') ||
      lower.includes('amount')
    );
  };

  // Fetch all items on mount
  useEffect(() => {
    const fetchAllItems = async () => {
      setItemsLoading(true);
      try {
        console.log('💾 Fetching all items from backend...');
        const res = await api.get('/dynamic-tables/items/suggest', {
          params: { query: '' },
        });
        console.log('✅ Items fetched:', res.data?.length, 'items');
        if (Array.isArray(res.data)) {
          setAllItems(res.data);
        }
      } catch (e) {
        console.error('❌ Error fetching items:', e.message);
      } finally {
        setItemsLoading(false);
      }
    };
    fetchAllItems();
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dynamic-tables/rows/${schema._id}`);
      setRows(res.data);
    } catch (e) {
      console.error('Error fetching rows', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [schema._id, refreshSignal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/dynamic-tables/rows/${schema._id}`, form);
      setForm({});
      setShowForm(false);
      fetchRows();
    } catch (e) {
      setError(e.response?.data?.message || 'Error saving record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rowId) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.delete(`/dynamic-tables/rows/${schema._id}/${rowId}`);
      fetchRows();
    } catch (e) {
      alert('Error deleting record');
    }
  };

  const filteredRows = rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return schema.columns.some((col) => {
      const val = row.data[col.name];
      return val && val.toString().toLowerCase().includes(query);
    });
  });

  const baseInputStyle = {
    width: '100%',
    padding: '8px 12px',
    background: '#161616',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    color: '#f0f0f0',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const renderField = (col) => {
    if (col.type === 'formula') return null;

    const itemField = isItemField(col.name);
    const value = form[col.name] || '';

    return (
      <div key={col.name} style={{ marginBottom: 16 }}>
        <label
          style={{
            fontSize: 11,
            color: '#888',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 6,
            letterSpacing: '0.05em',
          }}
        >
          {col.name} {col.required && '*'}
        </label>

        {/* Number input */}
        {col.type === 'number' && (
          <input
            type="number"
            value={value}
            onChange={(e) => setForm((prev) => ({ ...prev, [col.name]: e.target.value }))}
            required={col.required}
            disabled={saving}
            style={baseInputStyle}
          />
        )}

        {/* Date input */}
        {col.type === 'date' && (
          <input
            type="date"
            value={value}
            onChange={(e) => setForm((prev) => ({ ...prev, [col.name]: e.target.value }))}
            required={col.required}
            disabled={saving}
            style={baseInputStyle}
          />
        )}

        {/* Item field with AutoInput dropdown */}
        {col.type !== 'number' && col.type !== 'date' && itemField && (
          <AutoInput
            value={value}
            onChange={(v) => setForm((prev) => ({ ...prev, [col.name]: v }))}
            options={allItems}
            placeholder="e.g. ITM-001"
            required={col.required}
          />
        )}

        {/* Regular text input */}
        {col.type !== 'number' && col.type !== 'date' && !itemField && (
          <input
            type="text"
            value={value}
            onChange={(e) => setForm((prev) => ({ ...prev, [col.name]: e.target.value }))}
            required={col.required}
            disabled={saving}
            style={baseInputStyle}
          />
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Debug Panel */}
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          padding: 12,
          marginBottom: 12,
          borderRadius: 6,
          fontSize: 11,
          color: '#888',
        }}
      >
        <div>✓ Cached Items: {allItems.length} {itemsLoading && '(loading...)'}</div>
        <div>Schema: {schema.name}</div>
        <div>Item Fields: {schema.columns.filter((c) => isItemField(c.name)).map((c) => c.name).join(', ')}</div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              background: '#161616',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              color: '#f0f0f0',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666',
            }}
          />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px',
            background: '#e8ff47',
            border: 'none',
            borderRadius: 6,
            color: '#000',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + New Record
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div
          style={{
            background: '#0f0f0f',
            border: '2px solid #e8ff47',
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8ff47' }}>New Record</h3>
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 20,
              }}
            >
              ×
            </button>
          </div>

          {error && (
            <div
              style={{
                color: '#ff6666',
                fontSize: 12,
                marginBottom: 12,
                background: 'rgba(255, 68, 68, 0.1)',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255, 68, 68, 0.2)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 20,
              }}
            >
              {schema.columns.map((col) => renderField(col))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm({});
                  setError('');
                }}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #222',
                  background: 'transparent',
                  color: '#666',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 20px',
                  background: saving ? '#999' : '#e8ff47',
                  border: 'none',
                  borderRadius: 6,
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1a1a1a',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Loading...</div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No records</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1a1a', background: '#080808' }}>
                  {schema.columns
                    .filter((c) => c.type !== 'formula')
                    .map((col) => (
                      <th
                        key={col.name}
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#888',
                        }}
                      >
                        {col.name}
                      </th>
                    ))}
                  <th
                    style={{
                      padding: 12,
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#888',
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row._id} style={{ borderBottom: '1px solid #0a0a0a' }}>
                    {schema.columns
                      .filter((c) => c.type !== 'formula')
                      .map((col) => (
                        <td
                          key={col.name}
                          style={{ padding: 12, fontSize: 12, color: '#ccc' }}
                        >
                          {row.data[col.name]?.toString()}
                        </td>
                      ))}
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => handleDelete(row._id)}
                        style={{
                          padding: '4px 10px',
                          background: '#ef4444',
                          border: 'none',
                          borderRadius: 4,
                          color: '#fff',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
