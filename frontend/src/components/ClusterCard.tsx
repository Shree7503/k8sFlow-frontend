import {
  IconSettings,
  IconX,
  IconBrandAws,
  IconBrandGoogle,
  IconBrandAzure,
  IconCloud,
  IconServer,
  IconCpu
} from '@tabler/icons-react';
import { Card } from './ui/card';
import RoleBadge from './RoleBadge';
import { SystemRole, type SystemRoleValue } from '../types/rbac';
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

const getProviderIcon = (context: string) => {
  const lowerContext = context.toLowerCase();

  if (lowerContext.includes('aws') || lowerContext.includes('eks')) {
    return <IconBrandAws size={24} className="text-[#FF9900]" />;
  }
  if (lowerContext.includes('gke') || lowerContext.includes('google')) {
    return <IconBrandGoogle size={24} className="text-[#4285F4]" />;
  }
  if (lowerContext.includes('azure') || lowerContext.includes('aks')) {
    return <IconBrandAzure size={24} className="text-[#0078D4]" />;
  }
  if (lowerContext.includes('minikube') || lowerContext.includes('docker') || lowerContext.includes('kind')) {
    return <IconServer size={24} className="text-gray-500" />;
  }

  return <IconCloud size={24} className="text-[var(--color-accent)]" />;
};

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
  const canEdit = canModifyCluster(systemRole, clusterRole);
  const canAdmin = canAdminCluster(systemRole, clusterRole);

  const isConnected = status === 'connected';
  const isError = status === 'error';

  // Base card styling
  const cardBase = "cluster-card relative group transition-all duration-300 border bg-[var(--color-panel-dark)]";

  // Status-specific borders and glow
  const statusEffects = isConnected
    ? "border-l-4 border-l-[var(--color-success)] hover:shadow-[0_0_15px_rgba(76,175,80,0.15)]"
    : isError
      ? "border-l-4 border-l-[var(--color-error)] hover:shadow-[0_0_15px_rgba(244,67,54,0.15)] opacity-90"
      : "border-l-4 border-l-[var(--color-border-dark)] hover:border-l-[var(--color-accent)] hover:shadow-lg opacity-80 hover:opacity-100";

  return (
    <Card className={`${cardBase} ${statusEffects} overflow-hidden`}>
      {/* Background decoration for connected state */}
      {isConnected && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-success)]/5 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
      )}

      <div className="flex flex-col h-full relative z-10">
        {/* Header: Icon + Name + Role */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex gap-3 items-center">
            <div className={`p-2 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] group-hover:border-[var(--color-accent)]/30 transition-colors`}>
              {getProviderIcon(context)}
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight group-hover:text-[var(--color-accent)] transition-colors">
                {name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]' :
                  isError ? 'bg-[var(--color-error)]' : 'bg-zinc-400'
                  }`} />
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isConnected ? 'text-[var(--color-success)]' :
                  isError ? 'text-[var(--color-error)]' : 'text-zinc-400'
                  }`}>
                  {status === 'connected' ? 'Active' : status}
                </span>
              </div>
            </div>
          </div>

          {/* Use effective role for display: if system admin, show Admin badge */
            (clusterRole !== undefined || systemRole === SystemRole.Admin) && (
              <div className="transform scale-90 origin-top-right">
                <RoleBadge
                  role={systemRole === SystemRole.Admin ? SystemRole.Admin : clusterRole}
                  size="sm"
                />
              </div>
            )}
        </div>

        {/* Body: Context / Provider Info */}
        <div className="flex-1 min-h-[40px]">
          <div className="bg-[var(--color-bg-dark)]/50 rounded px-2 py-1.5 border border-transparent group-hover:border-[var(--color-border-dark)] transition-colors">
            <div className="flex items-center gap-2 text-zinc-400 group-hover:text-zinc-300 transition-colors">
              <IconCpu size={14} />
              <p className="font-mono text-[10px] truncate max-w-[200px]" title={context}>
                {context}
              </p>
            </div>
          </div>
        </div>

        {/* Footer: Actions & Timestamp */}
        <div className="mt-4 pt-3 border-t border-[var(--color-border-dark)] flex items-center justify-between">
          <div className="text-[10px] text-zinc-500 font-mono">
            {lastConnected ? `Last seen: ${lastConnected}` : 'Never connected'}
          </div>

          <div className="flex gap-1">
            {!isConnected && onConnect && (
              <button
                onClick={(e) => { e.stopPropagation(); onConnect(); }}
                className="px-3 py-1.5 text-xs font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white rounded transition-all duration-200"
              >
                Connect
              </button>
            )}

            {/* Context Actions */}
            <div className="flex gap-1 ml-2 border-l border-[var(--color-border-dark)] pl-2">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); canEdit && onEdit(); }}
                  disabled={!canEdit}
                  className={`p-1.5 rounded transition-all ${canEdit
                    ? 'hover:bg-[var(--color-hover-dark)] hover:text-[var(--color-accent)] text-gray-400'
                    : 'opacity-20 cursor-not-allowed'
                    }`}
                  title={canEdit ? 'Edit Configuration' : 'Editor role required'}
                >
                  <IconSettings size={16} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); canAdmin && onDelete(); }}
                  disabled={!canAdmin}
                  className={`p-1.5 rounded transition-all ${canAdmin
                    ? 'hover:bg-red-500/10 hover:text-red-500 text-gray-400'
                    : 'opacity-20 cursor-not-allowed'
                    }`}
                  title={canAdmin ? 'Delete Cluster' : 'Admin role required'}
                >
                  <IconX size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
