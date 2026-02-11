import { Badge } from './ui/badge';
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

  // Map role colors to custom classes since shadcn Badge variants don't have our custom role colors
  const roleClass = `role-${colorClass}`;
  const sizeClass = size === 'md' ? 'role-badge-md' : 'role-badge-sm';

  return (
    <Badge variant="outline" className={`${roleClass} ${sizeClass}`}>
      {label}
    </Badge>
  );
}
