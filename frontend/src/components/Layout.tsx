import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'light');
  const [downloadingCrl, setDownloadingCrl] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [showNotifications, setShowNotifications] = React.useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      setNotifications(response.data);
    } catch (e) {}
  };

  React.useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      fetchNotifications();
    } catch (e) {}
  };

  const handleDownloadCrl = async () => {
    setDownloadingCrl(true);
    try {
      const response = await api.get('/api/revocation/crl/generate', {
        responseType: 'blob',
      });
      const element = document.createElement('a');
      element.href = URL.createObjectURL(response.data);
      element.download = 'crl_list.crl';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showToast('Certificate Revocation List (CRL) downloaded', 'success');
    } catch (e: any) {
      showToast('CRL download failed', 'error');
    } finally {
      setDownloadingCrl(false);
    }
  };

  React.useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  if (!user) return <>{children}</>;

  const isSuperAdmin = user.roles.includes('ROLE_SUPER_ADMIN');
  const isAdmin = user.roles.includes('ROLE_ADMIN');
  const isAuditor = user.roles.includes('ROLE_AUDITOR');
  const canMakeSelfSigned = isAdmin || isSuperAdmin || user.roles.includes('ROLE_SELF_SIGNED');
  const canDownloadCrl = isAdmin || isSuperAdmin || isAuditor;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">Web PKI Platform</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Overview</div>
            <div
              className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </div>
          </div>

          {isSuperAdmin && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">System Admin</div>
              <div
                className={`sidebar-link ${isActive('/users') ? 'active' : ''}`}
                onClick={() => navigate('/users')}
              >
                User Directory
              </div>
              <div
                className={`sidebar-link ${isActive('/hsm') ? 'active' : ''}`}
                onClick={() => navigate('/hsm')}
              >
                HSM Slot Monitor
              </div>
              <div
                className={`sidebar-link ${isActive('/publishing-target') ? 'active' : ''}`}
                onClick={() => navigate('/publishing-target')}
              >
                Publishing Targets
              </div>
              <div
                className={`sidebar-link ${isActive('/revocation') ? 'active' : ''}`}
                onClick={() => navigate('/revocation')}
              >
                Revoked Registry
              </div>
            </div>
          )}

          {(isAdmin || isSuperAdmin) && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Operations</div>
              <div
                className={`sidebar-link ${isActive('/requests') ? 'active' : ''}`}
                onClick={() => navigate('/requests')}
              >
                Request Approval Desk
              </div>
              {isAdmin && (
                <div
                  className={`sidebar-link ${isActive('/keys') ? 'active' : ''}`}
                  onClick={() => navigate('/keys')}
                >
                  Key Generator
                </div>
              )}
              <div
                className={`sidebar-link ${isActive('/cas') ? 'active' : ''}`}
                onClick={() => navigate('/cas')}
              >
                CA Wizard
              </div>
              {isAdmin && (
                <div
                  className={`sidebar-link ${isActive('/csrs') ? 'active' : ''}`}
                  onClick={() => navigate('/csrs')}
                >
                  CSR Signing Desk
                </div>
              )}
              {isAdmin && (
                <div
                  className={`sidebar-link ${isActive('/revocation') ? 'active' : ''}`}
                  onClick={() => navigate('/revocation')}
                >
                  Revocation Control
                </div>
              )}
            </div>
          )}

          {isAuditor && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Review</div>
              <div
                className={`sidebar-link ${isActive('/requests') ? 'active' : ''}`}
                onClick={() => navigate('/requests')}
              >
                Pending Requests
              </div>
            </div>
          )}

          {isAuditor && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Security & Logs</div>
              <div
                className={`sidebar-link ${isActive('/audit') ? 'active' : ''}`}
                onClick={() => navigate('/audit')}
              >
                Audit Data Grid
              </div>
              <div
                className={`sidebar-link ${isActive('/revocation') ? 'active' : ''}`}
                onClick={() => navigate('/revocation')}
              >
                Revocation List
              </div>
            </div>
          )}

          <div className="sidebar-section">
            <div className="sidebar-section-title">Self Service</div>
            {!isAdmin && (
              <>
                <div
                  className={`sidebar-link ${isActive('/keys') ? 'active' : ''}`}
                  onClick={() => navigate('/keys')}
                >
                  Key Generator
                </div>
                <div
                  className={`sidebar-link ${isActive('/csrs') ? 'active' : ''}`}
                  onClick={() => navigate('/csrs')}
                >
                  CSR Wizard
                </div>
              </>
            )}
            <div
              className={`sidebar-link ${isActive('/certificates') ? 'active' : ''}`}
              onClick={() => navigate('/certificates')}
            >
              Certificates List
            </div>
            {canMakeSelfSigned && (
              <div
                className={`sidebar-link ${isActive('/self-signed') ? 'active' : ''}`}
                onClick={() => navigate('/self-signed')}
              >
                Self-Signed Wizard
              </div>
            )}
            <div
              className={`sidebar-link ${isActive('/validation') ? 'active' : ''}`}
              onClick={() => navigate('/validation')}
            >
              OCSP Validation
            </div>
            <div
              className={`sidebar-link ${isActive('/profile') ? 'active' : ''}`}
              onClick={() => navigate('/profile')}
            >
              Profile & MFA
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <span className="sidebar-username">{user.username}</span>
            <span className="sidebar-userrole">
              {user.roles.map((r) => r.replace('ROLE_', '')).join(', ')}
            </span>
          </div>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-viewport">
        <header className="main-header">
          <div className="main-header-title">
            {location.pathname === '/dashboard' && 'Security Dashboard'}
            {location.pathname === '/users' && 'User Administration'}
            {location.pathname === '/hsm' && 'Hardware Security Module Status'}
            {location.pathname === '/publishing-target' && 'Publication Channels'}
            {location.pathname === '/keys' && 'Cryptographic Key Generator'}
            {location.pathname === '/cas' && 'Certificate Authorities Wizard'}
            {location.pathname === '/csrs' && 'CSR Processing Desk'}
            {location.pathname === '/revocation' && 'Revocation Management'}
            {location.pathname === '/audit' && 'System Transaction Audit Trail'}
            {location.pathname === '/certificates' && 'Active Operational Certificates'}
            {location.pathname === '/profile' && 'User Profile & Identity Control'}
            {location.pathname === '/validation' && 'OCSP Certificate Status Check'}
            {location.pathname === '/self-signed' && 'Self-Signed Certificate Wizard'}
            {location.pathname === '/requests' && 'Request Approval Desk'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  border: '1px solid var(--border-color)',
                  position: 'relative'
                }}
              >
                🔔 Notifications
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '0.15rem 0.35rem',
                    fontSize: '0.65rem',
                    fontWeight: 'bold'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '0.5rem',
                  width: '320px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '0.5rem'
                }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '0.25rem',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: 'var(--text-primary)'
                  }}>
                    <span>Notification Center</span>
                    {unreadCount > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#EF4444' }}>{unreadCount} unread</span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                      No notifications.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid var(--border-color)',
                            backgroundColor: (notif.isRead || notif.read) ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                            fontSize: '0.75rem',
                            position: 'relative'
                          }}
                        >
                          <div style={{ color: 'var(--text-primary)', paddingRight: '1rem', textAlign: 'left' }}>{notif.message}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginTop: '0.25rem', textAlign: 'left' }}>
                            {new Date(notif.createdAt).toLocaleString()}
                          </div>
                          {!(notif.isRead || notif.read) && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                border: 'none',
                                background: 'transparent',
                                color: '#3B82F6',
                                cursor: 'pointer',
                                fontSize: '0.65rem'
                              }}
                            >
                              ✓ Read
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {canDownloadCrl && (
              <button
                onClick={handleDownloadCrl}
                className="btn-primary"
                disabled={downloadingCrl}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  border: 'none',
                  height: 'auto',
                  lineHeight: '1.2'
                }}
              >
                {downloadingCrl ? 'Downloading...' : '📥 Download CRL'}
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                border: '1px solid var(--border-color)'
              }}
            >
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
            <div className="badge badge-info">{user.department || 'PKI Infrastructure'}</div>
          </div>
        </header>

        <div className="main-content">{children}</div>
      </main>
    </div>
  );
};
