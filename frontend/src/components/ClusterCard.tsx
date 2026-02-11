import RoleBadge from './RoleBadge';
import type { SystemRoleValue } from '../types/rbac';
import { canModifyCluster, canAdminCluster } from '../utils/rbac';

interface ClusterCardProps {
  name: string;
  context: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: string;
  /** User's cluster-specific role */
  clusterRole?: SystemRoleValue;
  /** User's system-wide role */
  systemRole?: number;
  onConnect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ClusterCard({ 
  name, 
  context, 
  status, 
  lastConnected,
  clusterRole,
  systemRole,
  onConnect,
  onEdit,
  onDelete 
}: ClusterCardProps) {
  const statusClass = status === 'connected' ? 'status-connected' : 
                      status === 'error' ? 'status-error' : 'status-disconnected';

  const canEdit = canModifyCluster(systemRole, clusterRole);
  const canAdmin = canAdminCluster(systemRole, clusterRole);

  // Color-coded left border by access level
  const borderClass = canAdmin
    ? 'cluster-card-border-admin'
    : canEdit
    ? 'cluster-card-border-editor'
    : 'cluster-card-border-viewer';

  return (
    <div className={`cluster-card ${borderClass}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`status-dot ${statusClass}`} />
            <h3 className="text-sm font-semibold">{name}</h3>
            {clusterRole !== undefined && (
              <RoleBadge role={clusterRole} size="sm" />
            )}
          </div>
          <p className="mono text-xs opacity-70">{context}</p>
        </div>
        <div className="flex gap-1">
          {status !== 'connected' && onConnect && (
            <button 
              onClick={onConnect}
              className="px-2 py-1 text-xs hover:bg-[var(--color-hover-dark)] rounded transition-colors"
              title="Connect"
            >
              Connect
            </button>
          )}
          {onEdit && (
            <button 
              onClick={canEdit ? onEdit : undefined}
              disabled={!canEdit}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                canEdit
                  ? 'hover:bg-[var(--color-hover-dark)]'
                  : 'opacity-30 cursor-not-allowed'
              }`}
              title={canEdit ? 'Edit' : 'Editor role required'}
            >
              ⚙
            </button>
          )}
          {onDelete && (
            <button 
              onClick={canAdmin ? onDelete : undefined}
              disabled={!canAdmin}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                canAdmin
                  ? 'hover:bg-[var(--color-hover-dark)] text-[var(--color-error)]'
                  : 'opacity-30 cursor-not-allowed'
              }`}
              title={canAdmin ? 'Delete' : 'Admin role required'}
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {lastConnected && (
        <p className="text-xs opacity-50">Last connected: {lastConnected}</p>
      )}
      
      {status === 'error' && (
        <p className="text-xs text-[var(--color-error)] mt-2">
          Connection failed. Check your kubeconfig.
        </p>
      )}
    </div>
  );
}
