import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface CsrItem {
  id: number;
  internalName: string;
  csrPem: string;
  commonName?: string;
  ownerId?: number;
  keyId?: number;
}

interface KeyPair {
  id: number;
  alias: string;
  algorithm: string;
  keySize: string;
  type: string;
}

interface CaItem {
  id: number;
  alias: string;
  commonName: string;
  type: string;
}

export const Csrs: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [csrs, setCsrs] = useState<CsrItem[]>([]);
  const [keys, setKeys] = useState<KeyPair[]>([]);
  const [cas, setCas] = useState<CaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [internalName, setInternalName] = useState('');
  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [orgUnit, setOrgUnit] = useState('');
  const [country, setCountry] = useState('ET');
  const [state, setState] = useState('');
  const [generatedPem, setGeneratedPem] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [importName, setImportName] = useState('');
  const [importPem, setImportPem] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const [selectedCsr, setSelectedCsr] = useState<CsrItem | null>(null);
  const [signingCaKeyId, setSigningCaKeyId] = useState('');
  const [validityYears, setValidityYears] = useState('1');
  const [friendlyName, setFriendlyName] = useState('');
  const [signing, setSigning] = useState(false);

  const fetchData = async () => {
    try {
      const keysResponse = await api.get('/api/keys');
      setKeys(keysResponse.data);
      if (keysResponse.data.length > 0) {
        setSelectedKeyId(keysResponse.data[0].id.toString());
      }

      const csrsResponse = await api.get('/api/csr');
      setCsrs(csrsResponse.data);

      const casResponse = await api.get('/api/ca');
      setCas(casResponse.data);
      if (casResponse.data.length > 0) {
        setSigningCaKeyId(casResponse.data[0].id.toString());
      }
    } catch (e: any) {
      showToast('Error loading CSR portal data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportPem(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImportCsr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPem || !importName.trim()) {
      showToast('Please select a valid CSR file and type a name', 'error');
      return;
    }
    setImporting(true);
    try {
      await api.post('/api/csr/import', {
        internalName: importName.trim(),
        csrPem: importPem
      });
      showToast('External CSR imported successfully', 'success');
      setImportName('');
      setImportPem('');
      setImportFileName('');
      const listResponse = await api.get('/api/csr');
      setCsrs(listResponse.data);
    } catch (err: any) {
      showToast('Failed to import CSR', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateCsr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKeyId) {
      showToast('Please select a private key', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post('/api/csr/generate', {
        keyId: parseInt(selectedKeyId, 10),
        internalName,
        commonName,
        organization,
        organizationalUnit: orgUnit,
        country,
        state,
      });
      setGeneratedPem(response.data);
      showToast('CSR generated and saved successfully', 'success');
      setInternalName('');
      setCommonName('');
      setOrganization('');
      setOrgUnit('');
      setState('');
      const listResponse = await api.get('/api/csr');
      setCsrs(listResponse.data);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'CSR generation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedPem);
    showToast('PEM block copied to clipboard', 'success');
  };

  const handleSignCsr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCsr || !signingCaKeyId) return;
    setSigning(true);
    try {
      await api.post('/api/certificates/sign', {
        csrId: selectedCsr.id,
        caKeyId: parseInt(signingCaKeyId, 10),
        validityYears: parseInt(validityYears, 10),
        friendlyName: friendlyName.trim() ? friendlyName.trim() : selectedCsr.internalName,
      });
      showToast(`Certificate issued for CSR ${selectedCsr.internalName}`, 'success');
      setSelectedCsr(null);
      setFriendlyName('');
      const listResponse = await api.get('/api/csr');
      setCsrs(listResponse.data);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Signing failed', 'error');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const isAdmin = user?.roles.includes('ROLE_ADMIN') || user?.roles.includes('ROLE_SUPER_ADMIN') || false;

  return (
    <div>
      <div className={isAdmin ? "grid-2" : ""}>
        <div className="card">
          <h3 className="card-title">CSR Generation Wizard</h3>
          <form onSubmit={handleGenerateCsr}>
            <div className="form-group">
              <label>Select Key Pair Binding</label>
              <select value={selectedKeyId} onChange={(e) => setSelectedKeyId(e.target.value)}>
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.alias} ({k.algorithm} {k.keySize}) [{k.type}]
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Internal Reference Name</label>
              <input
                type="text"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
                placeholder="e.g., insa-intranet-csr"
                required
              />
            </div>

            <div className="form-group">
              <label>Common Name (CN)</label>
              <input
                type="text"
                value={commonName}
                onChange={(e) => setCommonName(e.target.value)}
                placeholder="e.g., mail.insa.gov.et"
                required
              />
            </div>

            <div className="form-group">
              <label>Organization (O)</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g., INSA Group"
                required
              />
            </div>

            <div className="form-group">
              <label>Organizational Unit (OU)</label>
              <input
                type="text"
                value={orgUnit}
                onChange={(e) => setOrgUnit(e.target.value)}
                placeholder="e.g., PKI Division"
              />
            </div>

            <div className="grid-2" style={{ gap: '1rem', margin: 0 }}>
              <div className="form-group">
                <label>Country Code (C)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g., ET"
                  required
                />
              </div>

              <div className="form-group">
                <label>State / Province (ST)</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g., Addis Ababa"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div> : 'Generate CSR'}
            </button>
          </form>

          {generatedPem && (
            <div style={{ marginTop: '1.5rem', animation: 'slide-in 0.25s ease-out' }}>
              <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Emitted PEM Block:</h4>
              <textarea
                readOnly
                value={generatedPem}
                className="pem-container"
                style={{ width: '100%', height: '180px', resize: 'none' }}
              />
              <button className="btn-secondary" onClick={handleCopyToClipboard} style={{ width: '100%', marginTop: '0.75rem' }}>
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Import External CSR</h3>
          <form onSubmit={handleImportCsr}>
            <div className="form-group">
              <label>Internal Reference Name</label>
              <input
                type="text"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="e.g., external-server-csr"
                required
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <label>Select CSR File (.csr / .pem)</label>
              <div
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '0.375rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'rgba(248, 250, 252, 0.05)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <span>📄</span>
                <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem', color: 'var(--text-primary)' }}>
                  {importFileName || 'Choose CSR File'}
                </span>
                <input
                  type="file"
                  accept=".csr,.pem"
                  onChange={handleImportFileSelect}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={importing}>
              {importing ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div> : 'Import CSR'}
            </button>
          </form>
        </div>

        {isAdmin && (
          <div className="card">
            <h3 className="card-title">CSR Processing Desk Queue</h3>
            <div className="scrollable-list" style={{ maxHeight: '500px' }}>
              {csrs.length === 0 ? (
                <div style={{ color: '#64748B', textAlign: 'center', padding: '2rem' }}>No pending signing requests in scope.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {csrs.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '1.25rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.5rem',
                        backgroundColor: 'var(--bg-surface)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.internalName}</strong>
                        <span className="badge badge-warning">Awaiting Sign</span>
                      </div>

                      {item.commonName && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          <strong>Common Name (CN):</strong> {item.commonName}
                        </div>
                      )}

                      <textarea
                        readOnly
                        value={item.csrPem}
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: 'var(--bg-canvas)',
                          padding: '0.5rem',
                          borderRadius: '0.25rem',
                          color: 'var(--text-secondary)',
                          height: '80px',
                          width: '100%',
                          resize: 'none',
                          border: '1px solid var(--border-color)',
                          marginBottom: '0.75rem'
                        }}
                      />

                      {isAdmin && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setSelectedCsr(item)}>
                            Process Request
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedCsr && (
        <div className="modal-overlay" onClick={() => setSelectedCsr(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">CSR Signing and Verification Desk</h3>
              <button className="toast-close" onClick={() => setSelectedCsr(null)}>&times;</button>
            </div>
            <form onSubmit={handleSignCsr}>
              <div className="modal-body">
                <div className="grid-2" style={{ gap: '1rem', margin: '0 0 1rem 0' }}>
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Subject Parameter</h4>
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-color)', borderRadius: '0.25rem', fontSize: '0.8rem', minHeight: '120px', color: 'var(--text-primary)' }}>
                      <strong>Reference:</strong> {selectedCsr.internalName}<br />
                      <strong>Common Name (CN):</strong> {selectedCsr.commonName || 'N/A'}<br />
                      <strong>CSR ID:</strong> {selectedCsr.id}<br />
                      <strong>Owner ID:</strong> {selectedCsr.ownerId || 'N/A'}<br />
                      <strong>Key Bind:</strong> {selectedCsr.keyId || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>PEM Block Format</h4>
                    <textarea
                      readOnly
                      value={selectedCsr.csrPem}
                      className="pem-container"
                      style={{ height: '120px', width: '100%', margin: 0 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Select Signing Trust Anchor / CA Alias</label>
                  <select value={signingCaKeyId} onChange={(e) => setSigningCaKeyId(e.target.value)}>
                    {cas.map((ca) => (
                      <option key={ca.id} value={ca.id}>
                        {ca.alias} (DN: {ca.commonName}) [{ca.type}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid-2" style={{ gap: '1rem', margin: 0 }}>
                  <div className="form-group">
                    <label>Validity Duration (Years)</label>
                    <select value={validityYears} onChange={(e) => setValidityYears(e.target.value)}>
                      <option value="1">1 Year</option>
                      <option value="2">2 Years</option>
                      <option value="5">5 Years</option>
                      <option value="10">10 Years</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Friendly Name / Alias Label</label>
                    <input
                      type="text"
                      value={friendlyName}
                      onChange={(e) => setFriendlyName(e.target.value)}
                      placeholder="e.g., intranet-cert"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setSelectedCsr(null)}>
                  Abort
                </button>
                <button type="submit" className="btn-primary" disabled={signing}>
                  {signing ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : 'Execute Sign & Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
