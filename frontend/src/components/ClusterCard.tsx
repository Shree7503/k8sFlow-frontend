import { useState, useRef, useEffect } from 'react';
import {
  IconSettings,
  IconX,
  IconBrandAws,
  IconBrandGoogle,
  IconBrandAzure,
  IconCloud,
  IconServer,
  IconCpu,
  IconChevronUp,
  IconNetwork,
  IconCalendar,
  IconShieldCheck,
  IconCircleDot,
  IconTag,
  IconCopy,
  IconCheck,
} from '@tabler/icons-react';
import { Card } from './ui/card';
import RoleBadge from './RoleBadge';
import { SystemRole, ROLE_LABELS, type SystemRoleValue } from '../types/rbac';
import { canAdminCluster } from '../utils/rbac';

interface ClusterCardProps {
  name: string;
  context: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: string;
  /** Cluster ID for display */
  clusterId?: string;
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

const getProviderLabel = (context: string): string => {
  const lowerContext = context.toLowerCase();
  if (lowerContext.includes('aws') || lowerContext.includes('eks')) return 'Amazon EKS';
  if (lowerContext.includes('gke') || lowerContext.includes('google')) return 'Google GKE';
  if (lowerContext.includes('azure') || lowerContext.includes('aks')) return 'Azure AKS';
  if (lowerContext.includes('minikube')) return 'Minikube';
  if (lowerContext.includes('docker')) return 'Docker Desktop';
  if (lowerContext.includes('kind')) return 'KinD';
  return 'Custom Provider';
};

export default function ClusterCard({
  name,
  context,
  status,
  lastConnected,
  clusterId,
  clusterRole,
  systemRole,
  onConnect,
  onEdit,
  onDelete
}: ClusterCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  const canAdmin = canAdminCluster(systemRole, clusterRole);

  const isConnected = status === 'connected';
  const isError = status === 'error';

  // Measure the panel's scroll height for smooth animation
  useEffect(() => {
    if (panelRef.current) {
      setPanelHeight(panelRef.current.scrollHeight);
    }
  }, [showDetails]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDetails(!showDetails);
  };

  // Effective role for display
  const effectiveRole = systemRole === SystemRole.Admin ? SystemRole.Admin : clusterRole;
  const effectiveRoleLabel = effectiveRole !== undefined ? ROLE_LABELS[effectiveRole as SystemRoleValue] : 'N/A';

  // Base card styling
  const cardBase = "cluster-card relative group transition-all duration-300 border bg-[var(--color-panel-dark)]";

  // Status-specific borders and glow
  const statusEffects = isConnected
    ? "border-l-4 border-l-[var(--color-success)] hover:shadow-[0_0_15px_rgba(76,175,80,0.15)]"
    : isError
      ? "border-l-4 border-l-[var(--color-error)] hover:shadow-[0_0_15px_rgba(244,67,54,0.15)] opacity-90"
      : "border-l-4 border-l-[var(--color-border-dark)] hover:border-l-[var(--color-accent)] hover:shadow-lg opacity-80 hover:opacity-100";

  // Detail rows for the panel
  const detailRows = [
    {
      icon: <IconTag size={14} />,
      label: 'Cluster Name',
      value: name,
      copyable: true,
    },
    ...(clusterId ? [{
      icon: <IconCircleDot size={14} />,
      label: 'Cluster ID',
      value: clusterId,
      copyable: true,
    }] : []),
    {
      icon: <IconNetwork size={14} />,
      label: 'Provider / Context',
      value: `${getProviderLabel(context)} — ${context}`,
      copyable: true,
    },
    {
      icon: <IconCircleDot size={14} />,
      label: 'Status',
      value: status.charAt(0).toUpperCase() + status.slice(1),
      copyable: false,
      statusColor: isConnected
        ? 'text-[var(--color-success)]'
        : isError
          ? 'text-[var(--color-error)]'
          : 'text-zinc-400',
    },
    {
      icon: <IconShieldCheck size={14} />,
      label: 'Your Role',
      value: effectiveRoleLabel,
      copyable: false,
    },
    {
      icon: <IconCalendar size={14} />,
      label: 'Last Seen',
      value: lastConnected || 'Never',
      copyable: false,
    },
  ];

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

        {/* ═══ DETAILS PANEL (slide-down) ═══ */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: showDetails ? `${panelHeight}px` : '0px' }}
        >
          <div ref={panelRef}>
            <div className="mt-3 rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)]/70 backdrop-blur-sm overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-dark)] bg-[var(--color-bg-dark)]">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Cluster Details
                </span>
                <button
                  onClick={handleSettingsClick}
                  className="p-0.5 rounded hover:bg-[var(--color-hover-dark)] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <IconChevronUp size={14} />
                </button>
              </div>

              {/* Detail rows */}
              <div className="divide-y divide-[var(--color-border-dark)]/50">
                {detailRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 hover:bg-[var(--color-hover-dark)]/50 transition-colors group/row"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-zinc-500 flex-shrink-0">{row.icon}</span>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex-shrink-0">
                        {row.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-4 min-w-0">
                      <span
                        className={`font-mono text-[11px] truncate max-w-[180px] ${
                          (row as any).statusColor ?? 'text-zinc-300'
                        }`}
                        title={row.value}
                      >
                        {row.value}
                      </span>
                      {row.copyable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(row.value, row.label);
                          }}
                          className="opacity-0 group-hover/row:opacity-100 p-0.5 rounded hover:bg-[var(--color-hover-dark)] text-zinc-500 hover:text-zinc-300 transition-all"
                          title={`Copy ${row.label}`}
                        >
                          {copiedField === row.label ? (
                            <IconCheck size={12} className="text-[var(--color-success)]" />
                          ) : (
                            <IconCopy size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                  onClick={handleSettingsClick}
                  className={`p-1.5 rounded transition-all ${
                    showDetails
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30'
                      : 'hover:bg-[var(--color-hover-dark)] hover:text-[var(--color-accent)] text-gray-400'
                  }`}
                  title="Cluster Details"
                >
                  <IconSettings size={16} className={showDetails ? 'animate-spin-slow' : ''} />
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
