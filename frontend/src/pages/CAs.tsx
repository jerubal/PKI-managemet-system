import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import api from '../services/api';

interface CaResponse {
  id: number;
  alias: string;
  commonName: string;
  type: string;
  parentAlias?: string;
}

interface KeyPair {
  id: number;
  alias: string;
  algorithm: string;
  keySize: string;
  type: string;
}

export const CAs: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [cas, setCas] = useState<CaResponse[]>([]);
  const [keys, setKeys] = useState<KeyPair[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'root' | 'intermediate'>('root');
  
  const [caAlias, setCaAlias] = useState('');
  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [country, setCountry] = useState('ET');
  const [parentAlias, setParentAlias] = useState('');
  const [selectedRootKeyId, setSelectedRootKeyId] = useState('');
  const [selectedSubKeyId, setSelectedSubKeyId] = useState('');
  const [creating, setCreating] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCa, setSelectedCa] = useState<CaResponse | null>(null);

  const fetchCas = async () => {
    try {
      const response = await api.get('/api/ca');
      setCas(response.data);
    } catch (e: any) {
      showToast('Failed to load CA Directory', 'error');
    }
  };

  const fetchKeys = async () => {
    try {
      const response = await api.get('/api/keys');
      setKeys(response.data);
    } catch (e) {}
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchCas(), fetchKeys()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRootCa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRootKeyId) {
      showToast('Please select a cryptographic key pair', 'error');
      return;
    }
    setCreating(true);
    try {
      const dnString = `CN=${commonName}, O=${organization}, C=${country}`;
      await api.post('/api/ca/root', {
        alias: caAlias,
        dn: dnString,
        keyId: parseInt(selectedRootKeyId, 10),
      });
      showToast(`Root CA '${caAlias}' initialized successfully`, 'success');
      setCaAlias('');
      setCommonName('');
      setOrganization('');
      setSelectedRootKeyId('');
      fetchCas();
    } catch (err: any) {
      showToast(err.response?.data || 'Failed to initialize Root CA', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateIntermediateCa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentAlias) {
      showToast('Please select a parent CA', 'error');
      return;
    }
    if (!selectedSubKeyId) {
      showToast('Please select a cryptographic key pair', 'error');
      return;
    }
    setCreating(true);
    try {
      const dnString = `CN=${commonName}, O=${organization}, C=${country}`;
      await api.post('/api/ca/hsm/intermediate', {
        alias: caAlias,
        dn: dnString,
        parentAlias: parentAlias,
        keyId: parseInt(selectedSubKeyId, 10),
      });
      showToast(`Intermediate CA '${caAlias}' initialized successfully under parent '${parentAlias}'`, 'success');
      setCaAlias('');
      setCommonName('');
      setOrganization('');
      setParentAlias('');
      setSelectedSubKeyId('');
      fetchCas();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data || 'Failed to initialize Intermediate CA', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadCert = async (ca: CaResponse) => {
    try {
      const response = await api.get(`/api/ca/${ca.id}/certificate`);
      const element = document.createElement('a');
      const file = new Blob([response.data], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${ca.alias}.crt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showToast(`Downloaded public certificate for ${ca.alias}`, 'success');
    } catch (e: any) {
      showToast('Failed to download certificate file', 'error');
    }
  };

  const openDeleteModal = (ca: CaResponse) => {
    setSelectedCa(ca);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCa = async () => {
    if (!selectedCa) return;
    try {
      await api.delete(`/api/ca/${selectedCa.id}`);
      showToast(`CA ${selectedCa.alias} has been removed from keystore`, 'success');
      fetchCas();
    } catch (e: any) {
      showToast('CA removal failed', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedCa(null);
    }
  };

  const renderHierarchyNode = (ca: CaResponse, level: number = 0) => {
    return (
      <div key={ca.id} style={{ marginLeft: `${level * 24}px`, marginTop: '0.75rem', borderLeft: level > 0 ? '1px dashed var(--border-color)' : 'none', paddingLeft: level > 0 ? '12px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '0.375rem', backgroundColor: ca.type === 'ROOT' ? '#F8FAFC' : '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>{ca.type === 'ROOT' ? '👑' : '⛓️'}</span>
            <div>
              <strong style={{ color: '#0F172A' }}>{ca.alias}</strong>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.125rem' }}>
                Subject: {ca.commonName} &bull; Type: {ca.type}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDownloadCert(ca)}>
              Export CRT
            </button>
            {user?.roles.includes('ROLE_SUPER_ADMIN') && (
              <button className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openDeleteModal(ca)}>
                Delete
              </button>
            )}
          </div>
        </div>
        {cas.filter((child) => child.parentAlias === ca.alias).map((child) => renderHierarchyNode(child, level + 1))}
      </div>
    );
  };

  const rootCas = cas.filter((c) => c.type === 'ROOT' || !c.parentAlias);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const isSuperAdmin = user?.roles.includes('ROLE_SUPER_ADMIN') || false;
  const isAdmin = user?.roles.includes('ROLE_ADMIN') || false;

  return (
    <div>
      <div className="grid-2">
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>CA Initialization Panel</h3>
          
          <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'root' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                borderBottom: activeTab === 'root' ? '2px solid var(--color-interactive)' : 'none',
                backgroundColor: 'transparent',
                color: activeTab === 'root' ? 'var(--color-interactive)' : '#64748B',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('root')}
            >
              Root CA
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'intermediate' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                borderBottom: activeTab === 'intermediate' ? '2px solid var(--color-interactive)' : 'none',
                backgroundColor: 'transparent',
                color: activeTab === 'intermediate' ? 'var(--color-interactive)' : '#64748B',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('intermediate')}
            >
              Issuing CA
            </button>
          </div>

          {activeTab === 'root' && (
            <>
              {!isSuperAdmin ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#EF4444', fontSize: '0.875rem' }}>
                  Root Trust Anchor CA initialization requires Super Admin credentials/privileges.
                </div>
              ) : (
                <form onSubmit={handleCreateRootCa}>
                  <div className="form-group">
                    <label>CA Keystore Alias</label>
                    <input
                      type="text"
                      value={caAlias}
                      onChange={(e) => setCaAlias(e.target.value)}
                      placeholder="e.g., insa-root-ca-alias"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Select Cryptographic Key Pair</label>
                    <select value={selectedRootKeyId} onChange={(e) => setSelectedRootKeyId(e.target.value)} required>
                      <option value="">-- Choose Key Pair --</option>
                      {keys.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.alias} ({k.algorithm} &bull; {k.keySize} &bull; {k.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Common Name (CN)</label>
                    <input
                      type="text"
                      value={commonName}
                      onChange={(e) => setCommonName(e.target.value)}
                      placeholder="e.g., INSA ROOT Root CA Authority"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Organization (O)</label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g., INSA Authority"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Country (C)</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g., ET"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={creating}>
                    {creating ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : 'Initialize Root Trust Anchor'}
                  </button>
                </form>
              )}
            </>
          )}

          {activeTab === 'intermediate' && (
            <>
              {!isAdmin ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#EF4444', fontSize: '0.875rem' }}>
                  Subordinate Issuing CA initialization requires Admin credentials/privileges.
                </div>
              ) : (
                <form onSubmit={handleCreateIntermediateCa}>
                  <div className="form-group">
                    <label>Select Parent Trust Anchor CA</label>
                    <select value={parentAlias} onChange={(e) => setParentAlias(e.target.value)} required>
                      <option value="">-- Choose Parent CA --</option>
                      {cas.map((c) => (
                        <option key={c.id} value={c.alias}>
                          {c.alias} ({c.commonName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Select Cryptographic Key Pair</label>
                    <select value={selectedSubKeyId} onChange={(e) => setSelectedSubKeyId(e.target.value)} required>
                      <option value="">-- Choose Key Pair --</option>
                      {keys.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.alias} ({k.algorithm} &bull; {k.keySize} &bull; {k.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>CA Keystore Alias</label>
                    <input
                      type="text"
                      value={caAlias}
                      onChange={(e) => setCaAlias(e.target.value)}
                      placeholder="e.g., insa-intermediate-ca-alias"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Common Name (CN)</label>
                    <input
                      type="text"
                      value={commonName}
                      onChange={(e) => setCommonName(e.target.value)}
                      placeholder="e.g., INSA Issuing CA Authority"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Organization (O)</label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g., INSA Authority"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Country (C)</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g., ET"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={creating}>
                    {creating ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : 'Initialize Issuing CA'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Certificate Authority Trust Path Hierarchy</h3>
          <div className="scrollable-list" style={{ maxHeight: '500px' }}>
            {cas.length === 0 ? (
              <div style={{ color: '#64748B', textAlign: 'center', padding: '2rem' }}>No active CA Trust Anchors configured.</div>
            ) : (
              rootCas.map((root) => renderHierarchyNode(root))
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        title="Confirm CA Deletion"
        body={
          <p>
            Are you sure you want to delete CA <strong>{selectedCa?.alias}</strong>? This will permanently invalidate all trust paths descending from this authority.
          </p>
        }
        confirmText="Yes, Delete CA"
        cancelText="Cancel"
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCa}
        confirmValidationText={selectedCa?.alias}
      />
    </div>
  );
};
