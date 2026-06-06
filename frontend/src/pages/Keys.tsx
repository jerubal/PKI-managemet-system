import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import api from '../services/api';

interface KeyPair {
  id: number;
  alias: string;
  algorithm: string;
  keySize: string;
  type: string;
  message?: string;
}

export const Keys: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const hasHsmRole = user?.roles.includes('ROLE_ADMIN') || user?.roles.includes('ROLE_SUPER_ADMIN') || user?.roles.includes('ROLE_HSM') || false;
  const [hsmGloballyEnabled, setHsmGloballyEnabled] = useState(true);
  const hasHsmPermission = hasHsmRole && hsmGloballyEnabled;
  const [keys, setKeys] = useState<KeyPair[]>([]);
  const [loading, setLoading] = useState(true);

  const [algorithm, setAlgorithm] = useState('RSA');
  const [keySize, setKeySize] = useState('2048');
  const [alias, setAlias] = useState('');
  const [isHsm, setIsHsm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genPfxPassword, setGenPfxPassword] = useState('');

  const [importAlgorithm, setImportAlgorithm] = useState('RSA');
  const [importKeySize, setImportKeySize] = useState('2048');
  const [importAlias, setImportAlias] = useState('');
  const [importKeyPairPem, setImportKeyPairPem] = useState('');
  const [importing, setImporting] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<KeyPair | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameAlias, setRenameAlias] = useState('');

  const [isExportPfxOpen, setIsExportPfxOpen] = useState(false);
  const [selectedKeyForPfx, setSelectedKeyForPfx] = useState<KeyPair | null>(null);
  const [pfxPassword, setPfxPassword] = useState('');
  const [exportingPfx, setExportingPfx] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    try {
      let privKey = importKeyPairPem;
      
      const privMatch = importKeyPairPem.match(/-----BEGIN[\s\S]+?PRIVATE KEY-----[\s\S]+?-----END[\s\S]+?PRIVATE KEY-----/) ||
                        importKeyPairPem.match(/-----BEGIN[\s\S]+?RSA PRIVATE KEY-----[\s\S]+?-----END[\s\S]+?RSA PRIVATE KEY-----/);
      
      if (privMatch) {
        privKey = privMatch[0];
      }
      
      const response = await api.post('/api/keys/import', {
        alias: importAlias.trim(),
        algorithm: importAlgorithm,
        keySize: importKeySize,
        publicKeyPem: '',
        privateKeyPem: privKey
      });
      showToast(response.data.message || 'Key pair imported successfully', 'success');
      setImportAlias('');
      setImportKeyPairPem('');
      fetchKeys();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Key import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const fetchKeys = async () => {
    try {
      const response = await api.get('/api/keys');
      setKeys(response.data);
    } catch (e: any) {
      showToast('Failed to load keys catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHsmGlobalStatus = async () => {
    try {
      const response = await api.get('/api/hsm/global-status');
      setHsmGloballyEnabled(response.data.enabled);
    } catch (e) {}
  };

  useEffect(() => {
    fetchKeys();
    fetchHsmGlobalStatus();
  }, []);

  const handleAlgorithmChange = (algo: string) => {
    setAlgorithm(algo);
    if (algo === 'RSA') {
      setKeySize('2048');
    } else if (algo === 'EC') {
      setKeySize('secp256r1');
    } else if (algo === 'EdDSA') {
      setKeySize('ed25519');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const endpoint = isHsm ? '/api/keys/generate-hsm' : '/api/keys/generate';
      const response = await api.post(endpoint, {
        algorithm,
        keySize,
        alias: alias.trim() ? alias.trim() : null,
      });
      showToast(response.data.message || 'Key pair generated successfully', 'success');

      // Auto-export files if software key is generated
      if (!isHsm && response.data.id) {
        try {
          const pemResponse = await api.get(`/api/keys/${response.data.id}/export/pem`);
          const pemElement = document.createElement('a');
          const pemFile = new Blob([pemResponse.data], { type: 'text/plain' });
          pemElement.href = URL.createObjectURL(pemFile);
          pemElement.download = `${response.data.alias || alias.trim()}.key`;
          document.body.appendChild(pemElement);
          pemElement.click();
          document.body.removeChild(pemElement);

          const pfxResponse = await api.get(`/api/keys/${response.data.id}/export/pfx`, {
            params: { password: genPfxPassword },
            responseType: 'blob'
          });
          const pfxElement = document.createElement('a');
          pfxElement.href = URL.createObjectURL(pfxResponse.data);
          pfxElement.download = `${response.data.alias || alias.trim()}.pfx`;
          document.body.appendChild(pfxElement);
          pfxElement.click();
          document.body.removeChild(pfxElement);
          showToast('Key pair files (.key and .pfx) downloaded successfully', 'success');
        } catch (err: any) {
          showToast('Auto-export failed: ' + (err.response?.data?.message || err.message), 'error');
        }
      }

      setAlias('');
      setGenPfxPassword('');
      fetchKeys();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Key generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const openDeleteModal = (key: KeyPair) => {
    setSelectedKey(key);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedKey) return;
    try {
      await api.delete(`/api/keys/${selectedKey.id}`);
      showToast(`Key pair ${selectedKey.alias} deleted`, 'success');
      fetchKeys();
    } catch (e: any) {
      showToast('Key deletion failed', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedKey(null);
    }
  };

  const handleExportPem = async (key: KeyPair) => {
    try {
      const response = await api.get(`/api/keys/${key.id}/export/pem`);
      const element = document.createElement('a');
      const file = new Blob([response.data], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${key.alias}.key`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showToast(`Exported private key PEM for ${key.alias}`, 'success');
    } catch (e: any) {
      showToast('PEM export failed', 'error');
    }
  };

  const triggerExportPfx = (key: KeyPair) => {
    setSelectedKeyForPfx(key);
    setPfxPassword('');
    setIsExportPfxOpen(true);
  };

  const openRenameModal = (key: KeyPair) => {
    setSelectedKey(key);
    setRenameAlias(key.alias);
    setIsRenameOpen(true);
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedKey) return;
    try {
      const response = await api.put(`/api/keys/${selectedKey.id}`, {
        algorithm: selectedKey.algorithm,
        keySize: selectedKey.keySize,
        alias: renameAlias.trim() || selectedKey.alias,
      });
      showToast(response.data.message || `Alias updated to ${renameAlias}`, 'success');
      setIsRenameOpen(false);
      setSelectedKey(null);
      fetchKeys();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Rename failed', 'error');
    }
  };

  const handleExportPfxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKeyForPfx) return;
    setExportingPfx(true);
    try {
      const response = await api.get(`/api/keys/${selectedKeyForPfx.id}/export/pfx`, {
        params: { password: pfxPassword },
        responseType: 'blob'
      });
      const element = document.createElement('a');
      element.href = URL.createObjectURL(response.data);
      element.download = `${selectedKeyForPfx.alias}.pfx`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showToast(`Exported PFX for ${selectedKeyForPfx.alias}`, 'success');
      setIsExportPfxOpen(false);
    } catch (err: any) {
      showToast('PFX export failed', 'error');
    } finally {
      setExportingPfx(false);
    }
  };

  return (
    <div>
      <div className="grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 className="card-title">Key Pair Generator</h3>
            <form onSubmit={handleGenerate}>
                <div className="form-group">
                <label>Alias / Label Indicator</label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="e.g., insa-web-server-key"
                  required
                />
              </div>
              <div className="form-group">
                <label>Cryptographic Algorithm</label>
                <select value={algorithm} onChange={(e) => handleAlgorithmChange(e.target.value)}>
                  <option value="RSA">RSA</option>
                  <option value="EC">ECC</option>
                  <option value="EdDSA">EdDSA</option>
                </select>
              </div>

              <div className="form-group">
                <label>Key Size / Curve Selection</label>
                {algorithm === 'RSA' && (
                  <select value={keySize} onChange={(e) => setKeySize(e.target.value)}>
                    <option value="2048">2048-bit</option>
                    <option value="3072">3072-bit</option>
                    <option value="4048">4048-bit</option>
                  </select>
                )}
                {algorithm === 'EC' && (
                  <select value={keySize} onChange={(e) => setKeySize(e.target.value)}>
                    <option value="secp256r1">secp256r1</option>
                    <option value="secp384r1">secp384r1</option>
                  </select>
                )}
                {algorithm === 'EdDSA' && (
                  <select value={keySize} onChange={(e) => setKeySize(e.target.value)}>
                    <option value="ed25519">Ed25519</option>
                  </select>
                )}
              </div>

            

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="isHsm"
                  checked={isHsm}
                  disabled={!hasHsmPermission}
                  onChange={(e) => setIsHsm(e.target.checked)}
                  style={{ width: 'auto', cursor: hasHsmPermission ? 'pointer' : 'not-allowed' }}
                />
                <label htmlFor="isHsm" style={{ marginBottom: 0, cursor: hasHsmPermission ? 'pointer' : 'not-allowed', color: hasHsmPermission ? 'inherit' : '#94A3B8' }}>
                  Hardware Security Module (HSM) Token Binding 
                  {!hsmGloballyEnabled && <span style={{ fontSize: '0.75rem', color: '#EF4444', marginLeft: '0.25rem' }}>(Disabled by Super Admin)</span>}
                  {hsmGloballyEnabled && !hasHsmRole && <span style={{ fontSize: '0.75rem', color: '#EF4444', marginLeft: '0.25rem' }}>(Requires HSM Role)</span>}
                </label>
              </div>

              {!isHsm && (
                <div className="form-group" style={{ animation: 'slide-in 0.2s ease-out' }}>
                  <label>PFX Export Password</label>
                  <input
                    type="password"
                    value={genPfxPassword}
                    onChange={(e) => setGenPfxPassword(e.target.value)}
                    placeholder="Enter password to encrypt PFX file"
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={generating}>
                {generating ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div> : 'Generate Key Pair'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="card-title">Import Cryptographic Key Pair</h3>
            <form onSubmit={handleImport}>
              <div className="form-group">
                <label>Cryptographic Algorithm</label>
                <select value={importAlgorithm} onChange={(e) => setImportAlgorithm(e.target.value)}>
                  <option value="RSA">RSA</option>
                  <option value="EC">ECC</option>
                  <option value="EdDSA">EdDSA</option>
                </select>
              </div>

              <div className="form-group">
                <label>Key Size</label>
                {importAlgorithm === 'RSA' && (
                  <select value={importKeySize} onChange={(e) => setImportKeySize(e.target.value)}>
                    <option value="2048">2048-bit</option>
                    <option value="3072">3072-bit</option>
                    <option value="4048">4048-bit</option>
                  </select>
                )}
                {importAlgorithm === 'EC' && (
                  <select value={importKeySize} onChange={(e) => setImportKeySize(e.target.value)}>
                    <option value="secp256r1">secp256r1</option>
                    <option value="secp384r1">secp384r1</option>
                  </select>
                )}
                {importAlgorithm === 'EdDSA' && (
                  <select value={importKeySize} onChange={(e) => setImportKeySize(e.target.value)}>
                    <option value="ed25519">Ed25519</option>
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Alias / Label Indicator</label>
                <input
                  type="text"
                  value={importAlias}
                  onChange={(e) => setImportAlias(e.target.value)}
                  placeholder="e.g., imported-server-key"
                  required
                />
              </div>

              <div className="form-group">
                <label>Key Pair Private Key PEM</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="file"
                    accept=".key,.pem,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setImportKeyPairPem(event.target?.result as string);
                          if (!importAlias) {
                            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                            setImportAlias(nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '-'));
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                    style={{ fontSize: '0.8rem', padding: '0.25rem' }}
                  />
                </div>
                <textarea
                  value={importKeyPairPem}
                  onChange={(e) => setImportKeyPairPem(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  style={{ height: '150px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={importing}>
                {importing ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div> : 'Import Key Pair'}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Keystore Inventory Catalog</h3>
          {loading ? (
            <div className="flex-center" style={{ height: '200px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="scrollable-list">
              {keys.length === 0 ? (
                <div style={{ color: '#64748B', textAlign: 'center', padding: '2rem' }}>No active cryptographic key pairs found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {keys.map((k) => (
                    <div
                      key={k.id}
                      style={{
                        padding: '1rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.375rem',
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{k.alias}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            ID: {k.id} &bull; {k.algorithm} &bull; {k.keySize}
                          </div>
                        </div>
                        {k.type === 'HSM' ? (
                          <span className="badge-hardware">Hardware Protected</span>
                        ) : (
                          <span className="badge badge-info">Software DB</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {k.type !== 'HSM' && (
                          <>
                            <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleExportPem(k)}>
                              Export PEM
                            </button>
                            <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => triggerExportPfx(k)}>
                              Export PFX
                            </button>
                          </>
                        )}
                        <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openRenameModal(k)}>
                          Rename
                        </button>
                        <button className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openDeleteModal(k)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        title="Confirm Key Deletion"
        body={
          <p>
            Are you sure you want to permanently delete key pair <strong>{selectedKey?.alias}</strong>? This action is irreversible. Any certificates depending on this key pair will become invalid.
          </p>
        }
        confirmText="Yes, Delete Key"
        cancelText="Cancel"
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        confirmValidationText={selectedKey?.alias}
      />

      <Modal
        isOpen={isRenameOpen}
        title="Rename Key Alias"
        body={
          <div className="form-group">
            <label>New Alias</label>
            <input type="text" value={renameAlias} onChange={(e) => setRenameAlias(e.target.value)} required />
          </div>
        }
        confirmText="Rename"
        cancelText="Cancel"
        onClose={() => setIsRenameOpen(false)}
        onConfirm={() => handleRenameSubmit()}
      />

      {isExportPfxOpen && (
        <div className="modal-overlay" onClick={() => setIsExportPfxOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Export PFX Key Store</h3>
              <button className="toast-close" onClick={() => setIsExportPfxOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleExportPfxSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                  Provide a password to encrypt the exported PKCS#12 (.pfx) keystore for key alias: <strong>{selectedKeyForPfx?.alias}</strong>.
                </p>
                <div className="form-group">
                  <label htmlFor="pfxPassword">Password</label>
                  <input
                    type="password"
                    id="pfxPassword"
                    value={pfxPassword}
                    onChange={(e) => setPfxPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsExportPfxOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={exportingPfx}>
                  {exportingPfx ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : 'Export Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
