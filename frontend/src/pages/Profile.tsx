import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Profile: React.FC = () => {
  const { showToast } = useToast();
  const { user, login } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrUrl, setMfaQrUrl] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [enablingMfa, setEnablingMfa] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(false);

  const fetchMfaSetup = async () => {
    if (user?.mfaEnabled) return;
    setLoadingMfa(true);
    try {
      const response = await api.get('/api/self/mfa/setup');
      setMfaSecret(response.data.secret);
      setMfaQrUrl(response.data.qrUrl);
    } catch (e: any) {
      showToast('Failed to retrieve MFA configurations', 'error');
    } finally {
      setLoadingMfa(false);
    }
  };

  useEffect(() => {
    fetchMfaSetup();
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setChangingPass(true);
    try {
      await api.post('/api/self/password', { newPassword });
      showToast('Password updated successfully', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      showToast('Failed to change password', 'error');
    } finally {
      setChangingPass(false);
    }
  };

  const handleEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnablingMfa(true);
    try {
      await api.post('/api/self/mfa/enable', { code: mfaCode });
      showToast('Multi-Factor Authentication enabled', 'success');
      setMfaCode('');
      
      const token = localStorage.getItem('token');
      if (token) {
        await login(token);
      }
    } catch (e: any) {
      showToast('Invalid verification code entered', 'error');
    } finally {
      setEnablingMfa(false);
    }
  };

  return (
    <div>
      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">User Account Specifications</h3>
          {user && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div><strong>Username:</strong> {user.username}</div>
                <div><strong>Email Address:</strong> {user.email}</div>
                <div><strong>Department:</strong> {user.department || 'N/A'}</div>
                <div>
                  <strong>Assigned Roles:</strong>{' '}
                  {user.roles.map((r) => (
                    <span key={r} className="badge badge-info" style={{ marginLeft: '0.25rem' }}>
                      {r.replace('ROLE_', '')}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <strong>MFA Status:</strong>
                  {user.mfaEnabled ? (
                    <span className="badge badge-success">MFA Enabled</span>
                  ) : (
                    <span className="badge badge-danger">MFA Disabled</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <h3 className="card-title" style={{ marginTop: '2rem' }}>Change Account Credentials</h3>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={changingPass}>
              {changingPass ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Multi-Factor Authentication (MFA) Setup</h3>
          {user?.mfaEnabled ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '0.375rem', color: '#15803D', padding: '2rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</span>
              <strong style={{ fontSize: '1rem' }}>MFA Security Enforced</strong>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Your identity is secured with a high-entropy TOTP authenticator key.
              </p>
            </div>
          ) : loadingMfa ? (
            <div className="flex-center" style={{ height: '240px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: '#64748B', fontSize: '0.8rem' }}>
                Scan the QR code below using an authenticator app (Google Authenticator, Duo, Aegis) or input the manual secret key.
              </p>

              {mfaQrUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.375rem' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mfaQrUrl)}`}
                    alt="MFA QR Code Scanner Link"
                    style={{ width: '180px', height: '180px', border: '1px solid #CBD5E1', padding: '0.5rem', backgroundColor: '#FFFFFF' }}
                  />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', userSelect: 'all', wordBreak: 'break-all', textAlign: 'center' }}>
                    Secret Key: {mfaSecret}
                  </div>
                </div>
              )}

              <form onSubmit={handleEnableMfa} style={{ marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label>Enter 6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="000000"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={enablingMfa || !mfaCode}>
                  {enablingMfa ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : 'Activate MFA'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
