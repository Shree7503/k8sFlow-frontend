/**
 * RBAC Utility Functions
 *
 * Pure functions for permission checks. All role comparisons use numeric
 * hierarchy: Viewer(0) < Editor(1) < Admin(2).
 */

import { SystemRole, type SystemRoleValue } from '../types/rbac';

/**
 * Check if a user's role meets the minimum required role.
 */
export function hasMinSystemRole(
  userRole: number | undefined,
  requiredRole: SystemRoleValue
): boolean {
  if (userRole === undefined || userRole === null) return false;
  return userRole >= requiredRole;
}

/**
 * Check if a cluster-specific role meets the minimum required role.
 */
export function hasMinClusterRole(
  clusterRole: SystemRoleValue | null | undefined,
  requiredRole: SystemRoleValue
): boolean {
  if (clusterRole === null || clusterRole === undefined) return false;
  return clusterRole >= requiredRole;
}

/**
 * Shorthand: is the user a system admin?
 */
export function isAdmin(role: number | undefined): boolean {
  return role === SystemRole.Admin;
}

/**
 * Get the effective role for a cluster, factoring in system role.
 * Admin system role grants Admin access to ALL clusters regardless of
 * the cluster-specific role assignment.
 */
export function getEffectiveClusterRole(
  systemRole: number | undefined,
  clusterRole: SystemRoleValue | null | undefined
): SystemRoleValue | null {
  // System admins always have admin access
  if (systemRole === SystemRole.Admin) return SystemRole.Admin;
  // No cluster access at all
  if (clusterRole === null || clusterRole === undefined) return null;
  return clusterRole;
}

/**
 * Can the user modify resources in the given cluster?
 * Requires at least Editor effective role.
 */
export function canModifyCluster(
  systemRole: number | undefined,
  clusterRole: SystemRoleValue | null | undefined
): boolean {
  const effective = getEffectiveClusterRole(systemRole, clusterRole);
  return effective !== null && effective >= SystemRole.Editor;
}

/**
 * Can the user perform admin actions on the given cluster?
 * Requires Admin effective role.
 */
export function canAdminCluster(
  systemRole: number | undefined,
  clusterRole: SystemRoleValue | null | undefined
): boolean {
  const effective = getEffectiveClusterRole(systemRole, clusterRole);
  return effective === SystemRole.Admin;
}
