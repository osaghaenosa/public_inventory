'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Search, AlertCircle } from 'lucide-react';

export default function DynamicTableDataGrid({ schema, refreshSignal }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const [itemDetails, setItemDetails] = useState({});
  const [quantityWarnings, setQuantityWarnings] = useState({});
  const [allItems, setAllItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const dropdownRefs = useRef({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(e.target)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dynamic-tables/rows/${schema._id}`);
      setRows(res.data);
      console.log('📊 Schema columns:', schema.columns.map(c => ({ name: c.name, isItem: isItemField(c.name) })));
    } catch (e) {
      console.error('Error fetching rows', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all inventory items once on component mount
  const fetchAllItems = async () => {
    setItemsLoading(true);
    try {
      console.log('💾 Fetching all inventory items...');
      const res = await api.get('/dynamic-tables/items/suggest', {
        params: { query: '' } // Empty query returns all items
      });
      console.log('✅ All items fetched:', res.data);
      if (Array.isArray(res.data)) {
        setAllItems(res.data);
      }
    } catch (e) {
      console.error('❌ Error fetching all items:', e.message);
      setAllItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllItems();
  }, []);

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
      setSuggestions({});
      setItemDetails({});
      setQuantityWarnings({});
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

  const fetchSuggestions = async (colName, inputValue) => {
    try {
      console.log('� Filtering suggestions for:', colName, 'with query:', inputValue);
      
      // Filter from cached items locally
      let filtered = allItems;
      if (inputValue && inputValue.trim()) {
        const queryLower = inputValue.toLowerCase();
        filtered = allItems.filter(item => {
          const nameMatch = item.item_name?.toString().toLowerCase().includes(queryLower);
          const numberMatch = item.item_number?.toString().toLowerCase().includes(queryLower);
          return nameMatch || numberMatch;
        });
      }
      
      console.log('📦 Filtered suggestions:', filtered);
      const transformed = filtered
        .map((item) => ({
          item_name: item.item_name || '',
          item_number: item.item_number || '',
          display: item.item_name || item.item_number || '',
        }))
        .filter((item) => item.display)
        .slice(0, 10); // Limit to 10 items
      
      console.log('✅ Transformed suggestions:', transformed);
      setSuggestions((prev) => ({ ...prev, [colName]: transformed }));
    } catch (e) {
      console.error('❌ Suggestion filtering error:', e.message);
    }
  };

  const handleFieldInput = async (colName, value) => {
    setForm((prev) => ({ ...prev, [colName]: value }));

    if (isItemField(colName)) {
      setOpenDropdown(colName);
      await fetchSuggestions(colName, value);

      if (value.length > 0) {
        try {
          const itemRes = await api.get('/dynamic-tables/items/detail', {
            params: { itemName: value },
          });
          if (itemRes.data) {
            setItemDetails((prev) => ({ ...prev, [colName]: itemRes.data }));
          }
        } catch (e) {}
      }
    }

    if (isQuantityField(colName) && value) {
      const itemKey = Object.keys(form).find((k) => isItemField(k));
      if (itemKey && itemDetails[itemKey]) {
        const detail = itemDetails[itemKey];
        const numValue = Number(value);
        if (numValue > detail.quantity) {
          setQuantityWarnings((prev) => ({
            ...prev,
            [colName]: `⚠️ Only ${detail.quantity} ${detail.itemName} available`,
          }));
        } else {
          setQuantityWarnings((prev) => ({ ...prev, [colName]: '' }));
        }
      }
    }
  };

  const handleItemSelect = (colName, item) => {
    setForm((prev) => ({ ...prev, [colName]: item.item_name || item.item_number }));
    setOpenDropdown(null);

    api
      .get('/dynamic-tables/items/detail', {
        params: { itemName: item.item_name || item.item_number },
      })
      .then((res) => {
        if (res.data) setItemDetails((prev) => ({ ...prev, [colName]: res.data }));
      })
      .catch(() => {});
  };

  const handleInputFocus = async (colName) => {
    if (isItemField(colName)) {
      console.log('🎯 Focus on item field:', colName);
      setOpenDropdown(colName);
      await fetchSuggestions(colName, form[colName] || '');
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
    const warning = quantityWarnings[col.name];
    const isOpen = openDropdown === col.name;
    const colSuggestions = suggestions[col.name] || [];

    if (itemField) {
      console.log(`🔍 Rendering item field: ${col.name} | isOpen: ${isOpen} | suggestions: ${colSuggestions.length}`);
    }

    return (
      <div
        key={col.name}
        style={{ marginBottom: 16, position: 'relative' }}
        ref={(el) => {
          if (itemField) dropdownRefs.current[col.name] = el;
        }}
      >
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

        {/* ── Number input ── */}
        {col.type === 'number' && (
          <input
            type="number"
            value={form[col.name] || ''}
            onChange={(e) => handleFieldInput(col.name, e.target.value)}
            required={col.required}
            disabled={saving}
            style={{
              ...baseInputStyle,
              background: warning ? 'rgba(255, 107, 107, 0.1)' : '#161616',
              border: warning ? '1px solid #ff6b6b' : '1px solid #2a2a2a',
            }}
          />
        )}

        {/* ── Date input ── */}
        {col.type === 'date' && (
          <input
            type="date"
            value={form[col.name] || ''}
            onChange={(e) => handleFieldInput(col.name, e.target.value)}
            required={col.required}
            disabled={saving}
            style={baseInputStyle}
          />
        )}

        {/* ── Item field with custom dropdown ── */}
        {col.type !== 'number' && col.type !== 'date' && itemField && (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. ITM-001"
              value={form[col.name] || ''}
              onChange={(e) => handleFieldInput(col.name, e.target.value)}
              onFocus={() => handleInputFocus(col.name)}
              required={col.required}
              disabled={saving}
              autoComplete="off"
              style={baseInputStyle}
            />

            {/* Custom styled dropdown */}
            {isOpen && colSuggestions.length > 0 && (
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
                {colSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      // preventDefault stops the input losing focus before click fires
                      e.preventDefault();
                      handleItemSelect(col.name, item);
                    }}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#f0f0f0',
                      borderBottom:
                        idx < colSuggestions.length - 1 ? '1px solid #222' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = '#2a2a2a')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    <span>{item.item_name}</span>
                    {item.item_number && (
                      <span style={{ color: '#555', fontSize: 11 }}>
                        {item.item_number}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Regular text input (non-item) ── */}
        {col.type !== 'number' && col.type !== 'date' && !itemField && (
          <input
            type="text"
            value={form[col.name] || ''}
            onChange={(e) => handleFieldInput(col.name, e.target.value)}
            required={col.required}
            disabled={saving}
            style={baseInputStyle}
          />
        )}

        {/* ── Quantity warning ── */}
        {warning && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 6,
              color: '#ff6b6b',
              fontSize: 11,
            }}
          >
            <AlertCircle size={14} />
            {warning}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* ── Debug Panel ── */}
      <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: 12, marginBottom: 12, borderRadius: 6, fontSize: 11, color: '#888' }}>
        <div>Cached Items: {allItems.length} {itemsLoading && '(loading...)'}</div>
        <div>openDropdown: {openDropdown || 'none'}</div>
        <div>suggestions keys: {Object.keys(suggestions).join(', ') || 'empty'}</div>
        {openDropdown && <div style={{ color: '#e8ff47' }}>✓ Dropdown open for: {openDropdown}, items: {suggestions[openDropdown]?.length || 0}</div>}
      </div>
      {/* ── Toolbar ── */}
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

      {/* ── New Record Form ── */}
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
                  setSuggestions({});
                  setQuantityWarnings({});
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

      {/* ── Data Table ── */}
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