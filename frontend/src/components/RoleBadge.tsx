import { getRoleName, getRoleColorClass } from '../utils/roleMapper';

interface RoleBadgeProps {
  role: number | undefined;
  size?: 'sm' | 'md';
}

/**
 * Colored badge displaying a role name.
 * - Viewer → neutral/gray
 * - Editor → blue/accent
 * - Admin  → amber/gold
 */
export default function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const label = getRoleName(role);
  const colorClass = getRoleColorClass(role);

  return (
    <span className={`role-badge role-${colorClass} role-badge-${size}`}>
      {label}
    </span>
  );
}
