'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useSaas } from '@/context/SaasContext';
import toast from 'react-hot-toast';

export default function WorkerManagement() {
  const { databases } = useSaas();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', database_ids: [] });
  const [saving, setSaving] = useState(false);
  const [dbFilter, setDbFilter] = useState('');
  const [dialog, setDialog] = useState(null);

  const fetchWorkers = () => {
    api.get('/users').then(res => setWorkers(res.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchWorkers(); }, []);

  const createWorker = async e => {
    e.preventDefault();
    if (form.database_ids.length === 0) {
      toast.error('Worker must be assigned to at least one database');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success(`Worker account created for ${form.name}`);
      setForm({ name: '', email: '', password: '', database_ids: [] });
      setShowAdd(false);
      fetchWorkers();
    } catch(e) { toast.error(e.response?.data?.message || 'Failed to create worker'); }
    finally { setSaving(false); }
  };

  const deleteWorker = async (id, name) => {
    setDialog({
      type: 'confirm',
      message: `Are you sure you want to permanently delete worker "${name}"?`,
      onConfirm: async () => {
        setDialog(null);
        try { 
          await api.delete(`/users/${id}`); 
          fetchWorkers(); 
          toast.success(`Worker "${name}" deleted`);
        }
        catch(e) { toast.error('Failed to delete worker'); }
      }
    });
  };

  const toggleDb = (dbId) => {
    setForm(p => ({
      ...p,
      database_ids: p.database_ids.includes(dbId)
        ? p.database_ids.filter(id => id !== dbId)
        : [...p.database_ids, dbId]
    }));
  };

  const filteredWorkers = dbFilter ? workers.filter(w => w.database_ids?.includes(dbFilter)) : workers;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 800, color: '#f0f0f0' }}>Workers</h1>
        <p style={{ fontSize: 12, color: '#444', marginTop: 3 }}>Manage worker accounts for your company</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <select 
          value={dbFilter} 
          onChange={e => setDbFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            color: '#e8ff47',
            fontSize: 13,
            cursor: 'pointer',
            flex: 1,
            maxWidth: 250
          }}
        >
          <option value="">All Databases</option>
          {databases.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <button 
          onClick={() => setShowAdd(!showAdd)}
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
          + New Worker
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#0f0f0f', border: '2px solid #e8ff47', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: '#e8ff47', marginBottom: 16 }}>
            Create Worker Account
          </div>
          <form onSubmit={createWorker}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { key: 'name', label: 'Full Name', placeholder: 'John Doe' },
                { key: 'email', label: 'Email', placeholder: 'worker@email.com', type: 'email' },
                { key: 'password', label: 'Password', placeholder: 'Set a password', type: 'password' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input 
                    type={f.type || 'text'} 
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required
                    disabled={saving}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
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
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Assign to Databases</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                {databases.map(db => (
                  <label key={db._id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={form.database_ids.includes(db._id)}
                      onChange={() => toggleDb(db._id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 12, color: '#e8ff47' }}>{db.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => { setShowAdd(false); }}
                disabled={saving}
                style={{
                  padding: '9px 16px',
                  borderRadius: 6,
                  border: '1px solid #222',
                  background: 'transparent',
                  color: '#666',
                  fontSize: 12,
                  cursor: 'pointer',
                  opacity: saving ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving}
                style={{
                  padding: '9px 20px',
                  borderRadius: 6,
                  border: 'none',
                  background: saving ? '#999' : '#e8ff47',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Creating...' : 'Create Worker'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a', background: '#080808' }}>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888' }}>Name</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888' }}>Email</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888' }}>Databases</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: 20, textAlign: 'center', color: '#888' }}>Loading...</td></tr>
            ) : filteredWorkers.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: 20, textAlign: 'center', color: '#888' }}>No workers yet</td></tr>
            ) : filteredWorkers.map(w => (
              <tr key={w._id} style={{ borderBottom: '1px solid #0a0a0a' }}>
                <td style={{ padding: 12, fontSize: 12, color: '#f0f0f0' }}>{w.name}</td>
                <td style={{ padding: 12, fontSize: 12, color: '#888' }}>{w.email}</td>
                <td style={{ padding: 12, fontSize: 12, color: '#e8ff47' }}>{w.database_ids?.length || 0} assigned</td>
                <td style={{ padding: 12 }}>
                  <button 
                    onClick={() => deleteWorker(w._id, w.name)}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
