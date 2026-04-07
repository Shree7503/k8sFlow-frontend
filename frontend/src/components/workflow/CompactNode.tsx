import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
    IconBox,
    IconNetwork,
    IconWorldWww,
    IconFileText,
} from '@tabler/icons-react';

/* ── Type → visual config map ─────────────────────────────────── */

const NODE_META: Record<string, {
    icon: React.ComponentType<{ size?: number; color?: string }>;
    label: string;
    color: string;        // gradient-from
    colorTo: string;      // gradient-to
    borderHover: string;
}> = {
    deployment: {
        icon: IconBox,
        label: 'Deployment',
        color: '#3b82f6',
        colorTo: '#2563eb',
        borderHover: '#3b82f680',
    },
    service: {
        icon: IconNetwork,
        label: 'Service',
        color: '#10b981',
        colorTo: '#059669',
        borderHover: '#10b98180',
    },
    ingress: {
        icon: IconWorldWww,
        label: 'Ingress',
        color: '#8b5cf6',
        colorTo: '#7c3aed',
        borderHover: '#8b5cf680',
    },
    configmap: {
        icon: IconFileText,
        label: 'ConfigMap',
        color: '#f59e0b',
        colorTo: '#d97706',
        borderHover: '#f59e0b80',
    },
};

/** Derive a short subtitle from node data so users can identify nodes at a glance. */
function getSubtitle(type: string, data: Record<string, unknown>): string {
    switch (type) {
        case 'deployment':
            return (data.image as string) || (data.name as string) || 'unconfigured';
        case 'service':
            return data.port ? `port ${data.port}` : (data.name as string) || 'unconfigured';
        case 'ingress':
            return (data.host as string) || (data.name as string) || 'unconfigured';
        case 'configmap': {
            const d = data.data as Record<string, string> | undefined;
            const count = d ? Object.keys(d).length : 0;
            return count > 0 ? `${count} key${count > 1 ? 's' : ''}` : (data.name as string) || 'unconfigured';
        }
        default:
            return '';
    }
}

function CompactNodeComponent({ data, type }: NodeProps) {
    const nodeType = type ?? 'deployment';
    const meta = NODE_META[nodeType] || NODE_META.deployment;
    const Icon = meta.icon;
    const nodeData = data as unknown as Record<string, unknown>;
    const name = (nodeData.name as string) || '';
    const subtitle = getSubtitle(nodeType, nodeData);

    return (
        <div
            className={`compact-node compact-node--${nodeType}`}
            style={{ '--node-color': meta.color, '--node-color-to': meta.colorTo, '--node-border-hover': meta.borderHover } as React.CSSProperties}
        >
            {/* Colored accent bar */}
            <div className="compact-node__accent" />

            <div className="compact-node__body">
                <div className="compact-node__icon-wrap" style={{ background: meta.color }}>
                    <Icon size={16} color="#fff" />
                </div>
                <div className="compact-node__info">
                    <span className="compact-node__name">{name || meta.label}</span>
                    <span className="compact-node__subtitle">{subtitle}</span>
                </div>
                <span className="compact-node__badge">{meta.label}</span>
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Left} className="workflow-handle" />
            <Handle type="source" position={Position.Right} className="workflow-handle" />
        </div>
    );
}

export default memo(CompactNodeComponent);
