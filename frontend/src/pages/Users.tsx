import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import api from '../services/api';

interface UserItem {
  uuid: string;
  username: string;
  email: string;
  department?: string;
  status: string;
  roles: string[];
}

export const Users: React.FC = () => {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'directory' | 'pending'>('directory');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['ROLE_USER']);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserItem | null>(null);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = searchQuery.trim()
        ? await api.get('/api/users/search', { params: { q: searchQuery } })
        : await api.get('/api/users');
      setUsers(response.data);
    } catch (e: any) {
      showToast('Failed to load user directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/users', {
        username,
        email,
        password,
        department,
        roles: selectedRoles,
      });
      showToast(`User account ${username} created successfully`, 'success');
      setUsername('');
      setEmail('');
      setPassword('');
      setDepartment('');
      setSelectedRoles(['ROLE_USER']);
      setIsCreateOpen(false);
      fetchUsers();
    } catch (e: any) {
      showToast('User account creation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerEdit = (user: UserItem) => {
    setEditUser(user);
    setEditEmail(user.email);
    setEditPassword('');
    setEditDepartment(user.department || '');
    setEditRoles(user.roles);
    setIsEditOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditing(true);
    try {
      await api.put(`/api/users/${editUser.uuid}`, {
        username: editUser.username,
        email: editEmail,
        password: editPassword || null,
        department: editDepartment,
        roles: editRoles,
      });
      showToast(`User account ${editUser.username} updated successfully`, 'success');
      setIsEditOpen(false);
      setEditUser(null);
      fetchUsers();
    } catch (e: any) {
      showToast('User account update failed', 'error');
    } finally {
      setEditing(false);
    }
  };

  const toggleUserStatus = async (user: UserItem) => {
    try {
      const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await api.patch(`/api/users/${user.uuid}/status`, null, {
        params: { status: newStatus },
      });
      showToast(`Status updated to ${newStatus} for user ${user.username}`, 'success');
      fetchUsers();
    } catch (e: any) {
      showToast('Failed to modify user status', 'error');
    }
  };

  const handleApprove = async (user: UserItem) => {
    try {
      await api.patch(`/api/users/${user.uuid}/status`, null, {
        params: { status: 'ACTIVE' },
      });
      showToast(`User registration request for ${user.username} approved!`, 'success');
      fetchUsers();
    } catch (e: any) {
      showToast('Failed to approve user registration', 'error');
    }
  };

  const handleReject = async (user: UserItem) => {
    try {
      await api.delete(`/api/users/${user.uuid}`);
      showToast(`User registration request for ${user.username} rejected/deleted`, 'success');
      fetchUsers();
    } catch (e: any) {
      showToast('Failed to reject user registration', 'error');
    }
  };

  const triggerDelete = (user: UserItem) => {
    setSelectedUserForDelete(user);
    setIsDeleteOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUserForDelete) return;
    try {
      await api.delete(`/api/users/${selectedUserForDelete.uuid}`);
      showToast(`User ${selectedUserForDelete.username} deleted from directory`, 'success');
      setIsDeleteOpen(false);
      setSelectedUserForDelete(null);
      fetchUsers();
    } catch (e: any) {
      showToast('Deletion failed', 'error');
    } finally {
      setIsDeleteOpen(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setImportingCsv(true);
    const formData = new FormData();
    formData.append('file', csvFile);
    try {
      await api.post('/api/users/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Bulk directory users imported successfully', 'success');
      setCsvFile(null);
      fetchUsers();
    } catch (e: any) {
      showToast('Bulk import process failed', 'error');
    } finally {
      setImportingCsv(false);
    }
  };

  const isSuperAdmin = currentUser?.roles.includes('ROLE_SUPER_ADMIN') || false;

  if (!isSuperAdmin) {
    return (
      <div className="card">
        <h3 style={{ color: '#EF4444' }}>Access Denied</h3>
        <p>You do not have administrative privileges to manage user accounts directory.</p>
      </div>
    );
  }

  // Filter users based on status for different tabs
  const directoryUsers = users.filter(u => u.status !== 'PENDING');
  const pendingUsers = users.filter(u => u.status === 'PENDING');

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          className={`btn-secondary ${activeTab === 'directory' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          User Directory ({directoryUsers.length})
        </button>
        <button
          className={`btn-secondary ${activeTab === 'pending' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('pending')}
          style={{ position: 'relative' }}
        >
          Pending Approvals ({pendingUsers.length})
          {pendingUsers.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: '#EF4444',
              color: 'white',
              borderRadius: '50%',
              padding: '0.15rem 0.4rem',
              fontSize: '0.65rem',
              fontWeight: 700
            }}>
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ gridColumn: '1 / span 2' }}>
          <input
            type="text"
            placeholder="Search users by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ justifySelf: 'end' }}>
          <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            Add New User Account
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ gap: '1.5rem' }}>
        <div className="card" style={{ gridColumn: '1 / span 2', padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="flex-center" style={{ height: '300px' }}>
              <div className="spinner"></div>
            </div>
          ) : activeTab === 'directory' ? (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email Address</th>
                    <th>Department</th>
                    <th>Roles</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {directoryUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                        No directory users found.
                      </td>
                    </tr>
                  ) : (
                    directoryUsers.map((u) => (
                      <tr key={u.uuid}>
                        <td style={{ fontWeight: 600 }}>{u.username}</td>
                        <td>{u.email}</td>
                        <td>{u.department || 'N/A'}</td>
                        <td>
                          {u.roles.map((r) => (
                            <span key={r} className="badge badge-info" style={{ marginRight: '0.25rem' }}>
                              {r.replace('ROLE_', '')}
                            </span>
                          ))}
                        </td>
                        <td>
                          {u.status === 'ACTIVE' ? (
                            <span className="badge badge-success">Active</span>
                          ) : (
                            <span className="badge badge-danger">Suspended</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => triggerEdit(u)}
                            >
                              Edit
                            </button>
                            <button
                              className={`btn-secondary`}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: u.status === 'ACTIVE' ? '#EF4444' : '#10B981' }}
                              onClick={() => toggleUserStatus(u)}
                              disabled={u.username === currentUser?.username}
                            >
                              {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              className="btn-danger"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => triggerDelete(u)}
                              disabled={u.username === currentUser?.username}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email Address</th>
                    <th>Department</th>
                    <th>Roles</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                        No pending approvals.
                      </td>
                    </tr>
                  ) : (
                    pendingUsers.map((u) => (
                      <tr key={u.uuid}>
                        <td style={{ fontWeight: 600 }}>{u.username}</td>
                        <td>{u.email}</td>
                        <td>{u.department || 'N/A'}</td>
                        <td>
                          {u.roles.map((r) => (
                            <span key={r} className="badge badge-info" style={{ marginRight: '0.25rem' }}>
                              {r.replace('ROLE_', '')}
                            </span>
                          ))}
                        </td>
                        <td>
                          <span className="badge badge-warning" style={{ backgroundColor: '#F59E0B', color: 'white' }}>Pending</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              className="btn-primary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: '#10B981', color: 'white', border: 'none' }}
                              onClick={() => handleApprove(u)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-danger"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: '#EF4444', color: 'white', border: 'none' }}
                              onClick={() => handleReject(u)}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Bulk Directory Import (CSV)</h3>
          <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Upload a CSV formatted file mapping columns in sequence: <strong>username, email, password, department, role</strong>.
          </p>
          <form onSubmit={handleCsvImport}>
            <div className="form-group">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={importingCsv || !csvFile}>
              {importingCsv ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : 'Upload & Process Import'}
            </button>
          </form>
        </div>
      </div>

      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Directory User Account</h3>
              <button className="toast-close" onClick={() => setIsCreateOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Initial password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., Security Operations"
                  />
                </div>
                 <div className="form-group">
                  <label>Assigned Authorization Roles</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {[
                      { role: 'ROLE_USER', label: 'USER (Self-Service)' },
                      { role: 'ROLE_ADMIN', label: 'ADMIN (Operations)' },
                      { role: 'ROLE_AUDITOR', label: 'AUDITOR (Read-Only)' },
                      { role: 'ROLE_SUPER_ADMIN', label: 'SUPER_ADMIN (Infrastructure)' },
                      { role: 'ROLE_HSM', label: 'HSM USER (Enable HSM keys)' },
                      { role: 'ROLE_SELF_SIGNED', label: 'SELF-SIGNED USER (Make Self-Signed)' }
                    ].map((item) => (
                      <label key={item.role} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'normal', cursor: 'pointer', marginBottom: 0 }}>
                        <input
                          type="checkbox"
                          value={item.role}
                          checked={selectedRoles.includes(item.role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles([...selectedRoles, item.role]);
                            } else {
                              setSelectedRoles(selectedRoles.filter((r) => r !== item.role));
                            }
                          }}
                          style={{ width: 'auto' }}
                        />
                        <span style={{ fontSize: '0.8rem' }}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && editUser && (
        <div className="modal-overlay" onClick={() => setIsEditOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit User Account: {editUser.username}</h3>
              <button className="toast-close" onClick={() => setIsEditOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Update Password (leave blank to keep unchanged)</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="New password"
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Assigned Authorization Roles</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {[
                      { role: 'ROLE_USER', label: 'USER (Self-Service)' },
                      { role: 'ROLE_ADMIN', label: 'ADMIN (Operations)' },
                      { role: 'ROLE_AUDITOR', label: 'AUDITOR (Read-Only)' },
                      { role: 'ROLE_SUPER_ADMIN', label: 'SUPER_ADMIN (Infrastructure)' },
                      { role: 'ROLE_HSM', label: 'HSM USER (Enable HSM keys)' },
                      { role: 'ROLE_SELF_SIGNED', label: 'SELF-SIGNED USER (Make Self-Signed)' }
                    ].map((item) => (
                      <label key={item.role} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'normal', cursor: 'pointer', marginBottom: 0 }}>
                        <input
                          type="checkbox"
                          value={item.role}
                          checked={editRoles.includes(item.role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditRoles([...editRoles, item.role]);
                            } else {
                              setEditRoles(editRoles.filter((r) => r !== item.role));
                            }
                          }}
                          style={{ width: 'auto' }}
                        />
                        <span style={{ fontSize: '0.8rem' }}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={editing}>
                  {editing ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Modal
        isOpen={isDeleteOpen}
        title="Confirm User Account Deletion"
        body={
          <p>
            Are you sure you want to permanently delete user account <strong>{selectedUserForDelete?.username}</strong>? This will revoke all database records linked to this identity.
          </p>
        }
        confirmText="Delete Account"
        cancelText="Cancel"
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteUser}
        confirmValidationText={selectedUserForDelete?.username}
      />
    </div>
  );
};
