/**
 * RBAC Types and Constants for k8sFlow
 *
 * Role hierarchy: Viewer (0) < Editor (1) < Admin (2)
 * - System roles govern app-wide permissions
 * - Cluster roles are per-cluster and can differ from the system role
 * - Admin system role overrides all cluster roles (full access everywhere)
 */

// ─── Role Constants ──────────────────────────────────────────────

export const SystemRole = {
  Viewer: 0,
  Editor: 1,
  Admin: 2,
} as const;

export type SystemRoleValue = (typeof SystemRole)[keyof typeof SystemRole];

export const ROLE_LABELS: Record<SystemRoleValue, string> = {
  [SystemRole.Viewer]: 'Viewer',
  [SystemRole.Editor]: 'Editor',
  [SystemRole.Admin]: 'Admin',
};

export const ROLE_COLORS: Record<SystemRoleValue, string> = {
  [SystemRole.Viewer]: 'viewer',
  [SystemRole.Editor]: 'editor',
  [SystemRole.Admin]: 'admin',
};

// ─── Cluster Access ──────────────────────────────────────────────

export interface ClusterAccess {
  clusterId: string;
  clusterName: string;
  context: string;
  role: SystemRoleValue;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: string;
}

// ─── RBAC Store State ────────────────────────────────────────────

export interface RBACState {
  clusterAccess: ClusterAccess[];
  loading: boolean;
  error: string | null;
  fetchClusterAccess: () => Promise<void>;
  getClusterRole: (clusterId: string) => SystemRoleValue | null;
  clearAccess: () => void;
}

// ─── Admin Types ─────────────────────────────────────────────────

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: SystemRoleValue;
  joined?: string;
}

export interface ClusterAccessAssignment {
  userId: string;
  clusterId: string;
  clusterName: string;
  role: SystemRoleValue;
}
