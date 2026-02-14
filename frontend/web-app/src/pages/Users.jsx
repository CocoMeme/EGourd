import React, { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { Search, Filter, Plus, Edit, Trash2, Ban, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [deactivateModal, setDeactivateModal] = useState({ show: false, userId: null });
  const [deactivateReason, setDeactivateReason] = useState('');
  const [roleChangeModal, setRoleChangeModal] = useState({
    show: false,
    userId: null,
    currentRole: '',
  });
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { isActive: statusFilter === 'active' }),
        ...(search && { search }),
      };

      const response = await adminService.getAllUsers(params);
      if (response.success) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleActivateUser = async (userId) => {
    if (!window.confirm('Are you sure you want to activate this user?')) return;

    try {
      await adminService.activateUser(userId);
      toast.success('User activated successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to activate user');
    }
  };

  const handleDeactivateUser = async (userId) => {
    setDeactivateModal({ show: true, userId });
  };

  const confirmDeactivate = async () => {
    try {
      await adminService.deactivateUser(deactivateModal.userId, { reason: deactivateReason });
      toast.success('User deactivated successfully');
      setDeactivateModal({ show: false, userId: null });
      setDeactivateReason('');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to deactivate user');
    }
  };

  const handleRoleChange = async (userId, currentRole) => {
    setRoleChangeModal({ show: true, userId, currentRole });
    setNewRole(currentRole);
  };

  const confirmRoleChange = async () => {
    try {
      await adminService.changeUserRole(roleChangeModal.userId, newRole);
      toast.success('User role changed successfully');
      setRoleChangeModal({ show: false, userId: null, currentRole: '' });
      setNewRole('');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to change user role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.'))
      return;

    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Manage all users in the system</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <form onSubmit={handleSearch} className="search-bar">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <div className="filters">
          <div className="filter-group">
            <label>Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="user-name">{user.username}</div>
                            {user.fullName && <div className="user-full-name">{user.fullName}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span
                          className={`badge badge-${user.role}`}
                          onClick={() => handleRoleChange(user._id, user.role)}
                          style={{ cursor: 'pointer' }}
                          title="Click to change role"
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {user.provider === 'local' ? 'Email' : user.provider}
                        </span>
                      </td>
                      <td>
                        {user.isActive ? (
                          <span className="status-badge status-active">
                            <CheckCircle size={14} />
                            Active
                          </span>
                        ) : (
                          <span className="status-badge status-inactive">
                            <XCircle size={14} />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="action-buttons">
                          {user.isActive ? (
                            <button
                              onClick={() => handleDeactivateUser(user._id)}
                              className="btn-icon btn-warning"
                              title="Deactivate"
                            >
                              <Ban size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user._id)}
                              className="btn-icon btn-success"
                              title="Activate"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="btn-icon btn-danger"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="pagination">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="btn btn-outline"
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalUsers}{' '}
                  total users)
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="btn btn-outline"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Deactivate Modal */}
      {deactivateModal.show && (
        <div
          className="modal-overlay"
          onClick={() => setDeactivateModal({ show: false, userId: null })}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Deactivate User</h2>
            <p>Are you sure you want to deactivate this user?</p>
            <div className="form-group">
              <label>Reason (optional):</label>
              <textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Enter reason for deactivation..."
                rows="3"
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setDeactivateModal({ show: false, userId: null });
                  setDeactivateReason('');
                }}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDeactivate}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleChangeModal.show && (
        <div
          className="modal-overlay"
          onClick={() => setRoleChangeModal({ show: false, userId: null, currentRole: '' })}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Change User Role</h2>
            <p>Select a new role for this user:</p>
            <div className="form-group">
              <label>Role:</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setRoleChangeModal({ show: false, userId: null, currentRole: '' });
                  setNewRole('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmRoleChange}
                disabled={newRole === roleChangeModal.currentRole}
              >
                Change Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
