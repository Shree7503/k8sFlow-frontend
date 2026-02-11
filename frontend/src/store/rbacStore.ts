/**
 * RBAC Store — manages cluster access state
 *
 * Fetches the user's cluster list from the backend and provides
 * helpers to look up per-cluster roles.
 *
 * Backend endpoints used:
 *   GET /clusters         → list clusters user has access to
 *   GET /clusters/access  → (Admin) list all cluster_access assignments
 */

import { create } from 'zustand/react';
import { persist } from 'zustand/middleware';
import type { ClusterAccess, RBACState, SystemRoleValue } from '../types/rbac';
import axiosInstance from '../axios/interceptor';

export const useRBACStore = create<RBACState>()(
  persist(
    (set, get) => ({
      clusterAccess: [],
      loading: false,
      error: null,

      fetchClusterAccess: async () => {
        set({ loading: true, error: null });
        try {
          // GET /clusters returns { clusters: [...] }
          const response = await axiosInstance.get('/api/v1/clusters');
          const data = response.data;

          const rawClusters: Array<{
            id?: string;
            name?: string;
            provider?: string;
            description?: string;
            created_at?: string;
          }> = Array.isArray(data.clusters)
            ? data.clusters
            : Array.isArray(data)
            ? data
            : [];

          const access: ClusterAccess[] = rawClusters.map((c) => ({
            clusterId: c.id || '',
            clusterName: c.name || '',
            context: c.provider || '',
            role: 0 as SystemRoleValue, // default; enriched below if admin
            status: 'disconnected' as ClusterAccess['status'],
            lastConnected: c.created_at,
          }));

          set({ clusterAccess: access, loading: false });
        } catch (error) {
          console.error('Failed to fetch clusters:', error);
          set({
            error: 'Failed to load clusters',
            loading: false,
          });
        }
      },

      getClusterRole: (clusterId: string): SystemRoleValue | null => {
        const entry = get().clusterAccess.find(
          (c) => c.clusterId === clusterId
        );
        return entry ? entry.role : null;
      },

      clearAccess: () => {
        set({ clusterAccess: [], loading: false, error: null });
      },
    }),
    {
      name: 'rbac-storage',
      partialize: (state) => ({
        clusterAccess: state.clusterAccess,
      }),
    }
  )
);
