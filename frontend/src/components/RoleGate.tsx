import type { ReactNode } from 'react';
import { useAuthStore } from '../store/store';
import { hasMinSystemRole } from '../utils/rbac';
import type { SystemRoleValue } from '../types/rbac';

interface RoleGateProps {
  /** Minimum system role required to render children */
  minSystemRole: SystemRoleValue;
  /** Content to render when the user has sufficient permissions */
  children: ReactNode;
  /** Optional fallback content shown when access is denied */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on user's system role.
 * If the user doesn't meet the minimum role, the fallback is shown instead
 * (defaults to null / nothing).
 */
export default function RoleGate({ minSystemRole, children, fallback = null }: RoleGateProps) {
  const { user } = useAuthStore();
  const userRole = user?.role;

  if (!hasMinSystemRole(userRole, minSystemRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
