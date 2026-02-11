import { useState, useEffect } from 'react';
import axiosInstance from '../../axios/interceptor';
import RoleBadge from '../RoleBadge';
import type { ManagedUser, SystemRoleValue } from '../../types/rbac';
import { parseErrorMessage } from '../../utils/errorHandler';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

/**
 * Admin panel for managing users.
 *
 * Backend endpoints used:
 *   GET    /users/:id  → get a single user
 *   PUT    /users/:id  → update user {name, email, password}
 *   DELETE /users/:id  → delete user
 *
 * Note: There is no "list all users" endpoint in the current backend API.
 * This panel calls GET /users which may need a corresponding backend route.
 */
export default function UserManagementPanel() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; role: SystemRoleValue }>({ name: '', email: '', role: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Note: The backend API spec doesn't have a list-all-users endpoint.
      // This assumes the backend has been extended with GET /users,
      // or this will be updated when the endpoint becomes available.
      const response = await axiosInstance.get(`/api/v1/users?t=${Date.now()}`);
      const data = response.data;

      // Try multiple response formats
      const rawUsers: Array<{
        id: string;
        name?: string;
        email: string;
        role?: number | string;
        joined?: string;
        created_at?: string;
      }> = Array.isArray(data.users)
          ? data.users
          : Array.isArray(data)
            ? data
            : [];

      setUsers(
        rawUsers.map((u) => ({
          id: u.id,
          name: u.name || '',
          email: u.email,
          role: (typeof u.role === 'string'
            ? u.role.toLowerCase() === 'admin' ? 2
              : u.role.toLowerCase() === 'editor' ? 1
                : 0
            : (u.role ?? 0)) as SystemRoleValue,
          joined: u.joined || u.created_at,
        }))
      );
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (user: ManagedUser) => {
    setEditingUser(user.id);
    setEditForm({ name: user.name, email: user.email, role: user.role });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({ name: '', email: '', role: 0 });
  };

  const handleUpdateUser = async (userId: string) => {
    setActionLoading(true);
    try {
      await axiosInstance.put(`/api/v1/users/${userId}`, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, name: editForm.name, email: editForm.email, role: editForm.role }
            : u
        )
      );
      setEditingUser(null);
      setEditForm({ name: '', email: '', role: 0 });
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to update user'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await axiosInstance.delete(`/api/v1/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to delete user'));
    }
  };

  if (loading) {
    return (
      <div className="panel p-8 text-center">
        <div className="animate-pulse mb-2">Loading users...</div>
        <p className="text-xs opacity-50">Fetching user data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">User Management</h1>
          <p className="text-sm opacity-60">
            Manage user accounts and system roles
          </p>
        </div>
        <div className="text-sm opacity-50 font-mono">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-500">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 mt-1 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="panel overflow-hidden">
        <Table className="admin-table">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  {editingUser === u.id ? (
                    <Input
                      type="text"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="h-8 w-40 px-2 py-1 text-xs"
                      placeholder="Name"
                    />
                  ) : (
                    <span className="font-medium">{u.name || '—'}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingUser === u.id ? (
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="h-8 w-48 px-2 py-1 text-xs"
                      placeholder="Email"
                    />
                  ) : (
                    <span className="font-mono text-xs opacity-70">{u.email}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingUser === u.id ? (
                    <select
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, role: parseInt(e.target.value) as SystemRoleValue }))
                      }
                      className="h-8 px-2 py-1 text-xs rounded border border-input bg-transparent text-current cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <option value="0">Viewer</option>
                      <option value="1">Editor</option>
                    </select>
                  ) : (
                    <RoleBadge role={u.role} />
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs opacity-50">{u.joined || '—'}</span>
                </TableCell>
                <TableCell>
                  {editingUser === u.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateUser(u.id)}
                        disabled={actionLoading}
                        className="text-xs px-3 py-1 rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
                      >
                        {actionLoading ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-xs px-3 py-1 rounded hover:bg-[var(--color-hover-dark)] transition-colors opacity-70"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : deleteConfirm === u.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-xs px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-3 py-1 rounded hover:bg-[var(--color-hover-dark)] transition-colors opacity-70"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(u)}
                        className="text-xs px-3 py-1 rounded hover:bg-[var(--color-hover-dark)] transition-colors opacity-70"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(u.id)}
                        className="text-xs px-3 py-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center opacity-50 py-8">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
