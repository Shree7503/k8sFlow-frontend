import { SystemRole } from '../types/rbac';

/**
 * Maps role integer from backend to human-readable role name
 */
export const getRoleName = (role: number | undefined): string => {
  if (role === undefined) return 'Viewer';
  
  const roleMap: Record<number, string> = {
    [SystemRole.Viewer]: 'Viewer',
    [SystemRole.Editor]: 'Editor',
    [SystemRole.Admin]: 'Admin',
  };

  return roleMap[role] || 'Unknown Role';
};

/**
 * Returns the CSS class suffix for a role's color scheme
 */
export const getRoleColorClass = (role: number | undefined): string => {
  if (role === undefined) return 'viewer';
  
  const colorMap: Record<number, string> = {
    [SystemRole.Viewer]: 'viewer',
    [SystemRole.Editor]: 'editor',
    [SystemRole.Admin]: 'admin',
  };

  return colorMap[role] || 'viewer';
};
