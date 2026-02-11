import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthStore } from '../store/store';
import { hasMinSystemRole } from '../utils/rbac';
import type { ReactNode } from 'react';
import type { SystemRoleValue } from '../types/rbac';

interface RoleRouteProps {
  children: ReactNode;
  /** Minimum system role required to access this route */
  minRole: SystemRoleValue;
}

/**
 * Route guard that checks both authentication AND system role.
 * - Not authenticated → redirect to /login
 * - Authenticated but insufficient role → redirect to /access-denied
 * - Sufficient role → render children
 */
export default function RoleRoute({ children, minRole }: RoleRouteProps) {
  const { token } = useAuth();
  const { user } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!hasMinSystemRole(user?.role, minRole)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
