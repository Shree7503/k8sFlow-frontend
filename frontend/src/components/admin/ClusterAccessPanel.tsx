import { useState, useEffect } from 'react';
import axiosInstance from '../../axios/interceptor';

import { SystemRole } from '../../types/rbac';
import type { SystemRoleValue, ClusterAccessAssignment } from '../../types/rbac';
import { parseErrorMessage } from '../../utils/errorHandler';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ClusterOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

/**
 * Admin-only panel for managing cluster access assignments.
 *
 * Backend endpoints used:
 *   GET    /clusters/access                              → list all assignments
 *   POST   /clusters/access  {user_id, cluster_id, role} → grant access
 *   PUT    /clusters/access  {user_id, cluster_id, role} → update role
 *   DELETE /clusters/access?user_id=X&cluster_id=Y       → revoke access
 *   GET    /clusters                                     → list clusters
 */
export default function ClusterAccessPanel() {
  const [clusters, setClusters] = useState<ClusterOption[]>([]);
  const [assignments, setAssignments] = useState<ClusterAccessAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterUserId, setFilterUserId] = useState<string>('');

  // New assignment form
  const [newUserId, setNewUserId] = useState('');
  const [newClusterId, setNewClusterId] = useState('');
  const [newRole, setNewRole] = useState<SystemRoleValue>(SystemRole.Viewer);

  // Unique users derived from assignments (for the filter dropdown)
  const [knownUsers, setKnownUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [accessRes, clustersRes] = await Promise.all([
        axiosInstance.get('/api/v1/clusters/access'),
        axiosInstance.get('/api/v1/clusters'),
      ]);

      // Parse cluster access: { cluster_access: [...] }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawAccess: any[] = Array.isArray(accessRes.data.cluster_access)
        ? accessRes.data.cluster_access
        : Array.isArray(accessRes.data)
          ? accessRes.data
          : [];

      // Parse clusters: { clusters: [...] }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawClusters: any[] = Array.isArray(clustersRes.data.clusters)
        ? clustersRes.data.clusters
        : Array.isArray(clustersRes.data)
          ? clustersRes.data
          : [];

      const clusterMap = new Map<string, string>();
      const clusterOptions: ClusterOption[] = rawClusters.map((c) => {
        const id = c.id || c.ID || '';
        const name = c.name || c.Name || '';
        clusterMap.set(id, name);
        return { id, name };
      });
      setClusters(clusterOptions);

      const parsed: ClusterAccessAssignment[] = rawAccess.map((a) => {
        const userId = a.user_id || a.UserID || '';
        const clusterId = a.cluster_id || a.ClusterID || '';
        const role = (a.role !== undefined ? a.role : a.Role !== undefined ? a.Role : 0);

        return {
          userId,
          clusterId,
          clusterName: clusterMap.get(clusterId) || clusterId,
          role: role as SystemRoleValue,
        };
      });
      setAssignments(parsed);

      // Build unique user list from assignments
      const userMap = new Map<string, UserOption>();
      parsed.forEach((a) => {
        if (!userMap.has(a.userId)) {
          userMap.set(a.userId, {
            id: a.userId,
            name: a.userId, // We only have the ID from this endpoint
            email: '',
          });
        }
      });
      setKnownUsers(Array.from(userMap.values()));
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!newUserId || !newClusterId) return;
    setAssignLoading(true);
    try {
      await axiosInstance.post('/api/v1/clusters/access', {
        user_id: newUserId,
        cluster_id: newClusterId,
        role: newRole,
      });
      await fetchInitialData();
      setNewUserId('');
      setNewClusterId('');
      setNewRole(SystemRole.Viewer);
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to assign cluster access'));
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRevoke = async (userId: string, clusterId: string) => {
    try {
      await axiosInstance.delete(
        `/api/v1/clusters/access?user_id=${encodeURIComponent(userId)}&cluster_id=${encodeURIComponent(clusterId)}`
      );
      setAssignments((prev) =>
        prev.filter((a) => !(a.userId === userId && a.clusterId === clusterId))
      );
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to revoke access'));
    }
  };

  const handleRoleUpdate = async (
    userId: string,
    clusterId: string,
    newClusterRole: SystemRoleValue
  ) => {
    try {
      await axiosInstance.put('/api/v1/clusters/access', {
        user_id: userId,
        cluster_id: clusterId,
        role: newClusterRole,
      });
      setAssignments((prev) =>
        prev.map((a) =>
          a.userId === userId && a.clusterId === clusterId
            ? { ...a, role: newClusterRole }
            : a
        )
      );
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to update role'));
    }
  };

  if (loading) {
    return (
      <div className="panel p-8 text-center">
        <div className="animate-pulse mb-2">Loading...</div>
        <p className="text-xs opacity-50">Fetching cluster access data</p>
      </div>
    );
  }

  // Filter assignments by selected user
  const filteredAssignments = filterUserId
    ? assignments.filter((a) => a.userId === filterUserId)
    : assignments;

  // Available clusters for new assignment (not yet assigned to the selected user)
  const assignedIds = new Set(
    assignments
      .filter((a) => a.userId === newUserId)
      .map((a) => a.clusterId)
  );
  const availableClusters = clusters.filter((c) => !assignedIds.has(c.id));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Cluster Access</h1>
        <p className="text-sm opacity-60">
          Manage which users can access which clusters and at what role
        </p>
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

      {/* Filter by user */}
      <div className="panel p-4 mb-6">
        <label className="block text-xs font-medium opacity-70 mb-2">
          Filter by User
        </label>
        <select
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
          className="flex h-9 max-w-md rounded border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)] px-3 py-1 text-sm transition-[color,box-shadow] outline-none focus-visible:border-[var(--color-accent)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">— All users —</option>
          {knownUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* Current assignments */}
      <div className="panel overflow-hidden mb-6">
        <div className="p-4 border-b border-[var(--color-border-dark)]">
          <h3 className="text-sm font-semibold">
            Cluster Access Assignments
            <span className="ml-2 text-xs opacity-50 font-mono">
              {filteredAssignments.length} total
            </span>
          </h3>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Cluster</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssignments.map((a) => (
              <tr key={`${a.userId}-${a.clusterId}`}>
                <td>
                  <span className="font-mono text-xs opacity-70">
                    {a.userId}
                  </span>
                </td>
                <td>
                  <span className="font-medium text-sm">
                    {a.clusterName}
                  </span>
                </td>
                <td>
                  <select
                    value={a.role}
                    onChange={(e) =>
                      handleRoleUpdate(
                        a.userId,
                        a.clusterId,
                        Number(e.target.value) as SystemRoleValue
                      )
                    }
                    className="flex h-8 w-28 rounded border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)] px-2 py-1 text-xs transition-[color,box-shadow] outline-none focus-visible:border-[var(--color-accent)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value={SystemRole.Viewer}>Viewer</option>
                    <option value={SystemRole.Editor}>Editor</option>
                    <option value={SystemRole.Admin}>Admin</option>
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => handleRevoke(a.userId, a.clusterId)}
                    className="text-xs px-3 py-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {filteredAssignments.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center opacity-50 py-6">
                  No cluster access assignments found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add new assignment */}
      <div className="panel p-4">
        <h3 className="text-sm font-semibold mb-4">
          Grant Cluster Access
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_150px_auto] gap-4 items-end">
          <div>
            <label className="block text-xs font-medium opacity-70 mb-1">
              User ID
            </label>
            <Input
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="Enter user UUID"
              className="border-[var(--color-border-dark)] focus-visible:ring-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium opacity-70 mb-1">
              Cluster
            </label>
            <select
              value={newClusterId}
              onChange={(e) => setNewClusterId(e.target.value)}
              className="flex h-9 w-full rounded border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)] px-3 py-1 text-sm transition-[color,box-shadow] outline-none focus-visible:border-[var(--color-accent)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">— Select cluster —</option>
              {availableClusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium opacity-70 mb-1">
              Role
            </label>
            <select
              value={newRole}
              onChange={(e) =>
                setNewRole(Number(e.target.value) as SystemRoleValue)
              }
              className="flex h-9 w-full rounded border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)] px-3 py-1 text-sm transition-[color,box-shadow] outline-none focus-visible:border-[var(--color-accent)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={SystemRole.Viewer}>Viewer</option>
              <option value={SystemRole.Editor}>Editor</option>
              <option value={SystemRole.Admin}>Admin</option>
            </select>
          </div>
          <Button
            onClick={handleAssign}
            disabled={!newUserId || !newClusterId || assignLoading}
            className="w-full md:w-auto"
          >
            {assignLoading ? 'Adding...' : 'Grant Access'}
          </Button>
        </div>
      </div>
    </div>
  );
}
