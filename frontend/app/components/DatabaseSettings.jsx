'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useSaas } from '@/context/SaasContext';
import toast from 'react-hot-toast';

export default function DatabaseSettings({ database }) {
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSchemaId, setEditingSchemaId] = useState(null);
  const [newSchema, setNewSchema] = useState({ name: '', description: '', is_editable: true });
  const [newColumns, setNewColumns] = useState([{ name: 'Item Name', type: 'text', required: true }]);
  const [dialog, setDialog] = useState(null);
  
  const { updateDatabases, selectDatabase } = useSaas();
  const workerLink = typeof window !== 'undefined' ? `${window.location.origin}/worker/${database?._id}/login` : '';
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (workerLink) {
      navigator.clipboard.writeText(workerLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchSchemas = async () => {
    try {
      const res = await api.get('/dynamic-tables/schemas');
      setSchemas(res.data.filter(s => s.database_id === database?._id));
    } catch(e) { setError('Failed to load table schemas'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (database) fetchSchemas();
  }, [database]);

  const handleCreateTable = async (e) => {
    e.preventDefault();
    try {
      await api.post('/dynamic-tables/schemas', {
        name: newSchema.name,
        description: newSchema.description,
        is_editable: newSchema.is_editable,
        columns: newColumns,
        database_id: database._id
      });
      setShowBuilder(false);
      setNewSchema({ name: '', description: '', is_editable: true });
      setNewColumns([{ name: 'Item Name', type: 'text', required: true }]);
      fetchSchemas();
      toast.success('Table created successfully');
    } catch (e) { toast.error('Failed to create table'); }
  };

  const addColumn = () => setNewColumns([...newColumns, { name: '', type: 'text', required: false }]);
  const updateColumn = (index, field, value) => {
    const arr = [...newColumns];
    arr[index][field] = value;
    setNewColumns(arr);
  };
  const removeColumn = (index) => setNewColumns(newColumns.filter((_, i) => i !== index));

  const deleteTable = async (schemaId) => {
    setDialog({
      type: 'confirm',
      message: 'Are you sure you want to delete this table? All rows will be deleted.',
      onConfirm: async () => {
        setDialog(null);
        try {
          await api.delete(`/dynamic-tables/schemas/${schemaId}`);
          fetchSchemas();
          toast.success('Table deleted');
        } catch(e) { toast.error('Failed to delete table'); }
      }
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 800, color: '#f0f0f0' }}>Database Settings</h1>
        <p style={{ fontSize: 12, color: '#444', marginTop: 3 }}>{database?.name} · Configure your database</p>
      </div>

      {/* Worker Link Section */}
      {database && (
        <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', padding: 20, borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', marginBottom: 12 }}>Worker Login Link</div>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Share this link with workers to log in to this database:</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={workerLink}
              readOnly
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#161616',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                color: '#e8ff47',
                fontSize: 12,
                fontFamily: "'Space Mono', monospace",
                outline: 'none'
              }}
            />
            <button
              onClick={copyLink}
              style={{
                padding: '8px 16px',
                background: copied ? '#4ade80' : '#e8ff47',
                border: 'none',
                borderRadius: 6,
                color: '#000',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Tables Section */}
      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', padding: 20, borderRadius: 8, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>Database Tables</div>
          <button
            onClick={() => setShowBuilder(!showBuilder)}
            style={{
              padding: '8px 16px',
              background: '#e8ff47',
              border: 'none',
              borderRadius: 6,
              color: '#000',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + New Table
          </button>
        </div>

        {showBuilder && (
          <form onSubmit={handleCreateTable} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#e8ff47', marginBottom: 12 }}>Create New Table</h4>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Table Name</label>
              <input
                type="text"
                value={newSchema.name}
                onChange={e => setNewSchema({ ...newSchema, name: e.target.value })}
                placeholder="e.g., Product Inventory"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#161616',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  color: '#f0f0f0',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Description</label>
              <input
                type="text"
                value={newSchema.description}
                onChange={e => setNewSchema({ ...newSchema, description: e.target.value })}
                placeholder="Optional description"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#161616',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  color: '#f0f0f0',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Columns</label>
              {newColumns.map((col, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Column name"
                    value={col.name}
                    onChange={e => updateColumn(idx, 'name', e.target.value)}
                    required
                    style={{
                      padding: '8px 12px',
                      background: '#161616',
                      border: '1px solid #2a2a2a',
                      borderRadius: 6,
                      color: '#f0f0f0',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <select
                    value={col.type}
                    onChange={e => updateColumn(idx, 'type', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      background: '#161616',
                      border: '1px solid #2a2a2a',
                      borderRadius: 6,
                      color: '#f0f0f0',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeColumn(idx)}
                    style={{
                      padding: '8px 10px',
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addColumn}
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  border: '1px dashed #2a2a2a',
                  borderRadius: 6,
                  color: '#888',
                  fontSize: 12,
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                + Add Column
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowBuilder(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #2a2a2a',
                  background: 'transparent',
                  color: '#888',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  background: '#e8ff47',
                  border: 'none',
                  borderRadius: 6,
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Create Table
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>Loading...</div>
        ) : schemas.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>No tables yet</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {schemas.map(schema => (
              <div key={schema._id} style={{
                background: '#080808',
                border: '1px solid #1a1a1a',
                padding: 12,
                borderRadius: 6,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>{schema.name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{schema.columns.length} columns</div>
                </div>
                <button
                  onClick={() => deleteTable(schema._id)}
                  style={{
                    padding: '4px 10px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            padding: 24,
            borderRadius: 12,
            maxWidth: 400,
            width: '90%'
          }}>
            <p style={{ color: '#f0f0f0', marginBottom: 16 }}>{dialog.message}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setDialog(null)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #2a2a2a',
                  background: 'transparent',
                  color: '#888',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => dialog.onConfirm()}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
