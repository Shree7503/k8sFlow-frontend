import { useState, useCallback, useEffect } from 'react';
import {
    IconBox,
    IconNetwork,
    IconWorldWww,
    IconFileText,
    IconX,
    IconPlus,
    IconTrash,
} from '@tabler/icons-react';

/* ── Types ──────────────────────────────────────────────────────── */

export interface NodeConfigModalProps {
    nodeId: string;
    nodeType: string;
    nodeData: Record<string, unknown>;
    onChange: (id: string, data: Record<string, unknown>) => void;
    onClose: () => void;
}

/* ── Shared helpers ─────────────────────────────────────────────── */

const META: Record<string, {
    icon: React.ComponentType<{ size?: number; color?: string }>;
    label: string;
    color: string;
}> = {
    deployment: { icon: IconBox, label: 'Deployment', color: '#3b82f6' },
    service: { icon: IconNetwork, label: 'Service', color: '#10b981' },
    ingress: { icon: IconWorldWww, label: 'Ingress', color: '#8b5cf6' },
    configmap: { icon: IconFileText, label: 'ConfigMap', color: '#f59e0b' },
};

function NumericInput({
    value,
    min = 1,
    max,
    defaultValue,
    className,
    title,
    onChange,
}: {
    value: number;
    min?: number;
    max?: number;
    defaultValue: number;
    className?: string;
    title?: string;
    onChange: (n: number) => void;
}) {
    const [local, setLocal] = useState(String(value));

    useEffect(() => { setLocal(String(value)); }, [value]);

    return (
        <input
            type="number"
            min={min}
            max={max}
            value={local}
            className={className}
            title={title}
            onChange={(e) => {
                setLocal(e.target.value);
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) onChange(n);
            }}
            onBlur={(e) => {
                const n = parseInt(e.target.value, 10);
                const final = isNaN(n) ? defaultValue : Math.max(min ?? 1, n);
                setLocal(String(final));
                onChange(final);
            }}
        />
    );
}

/* ── Per-type form sections ─────────────────────────────────────── */

function DeploymentForm({
    data,
    onChange,
}: {
    data: Record<string, unknown>;
    onChange: (field: string, value: unknown) => void;
}) {
    return (
        <>
            <label>
                <span>Name</span>
                <input
                    value={(data.name as string) || ''}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder="my-app"
                />
            </label>
            <label>
                <span>Namespace</span>
                <input
                    value={(data.namespace as string) || ''}
                    onChange={(e) => onChange('namespace', e.target.value)}
                    placeholder="default"
                />
            </label>
            <label>
                <span>Image</span>
                <input
                    value={(data.image as string) || ''}
                    onChange={(e) => onChange('image', e.target.value)}
                    placeholder="nginx:latest"
                />
            </label>
            <div className="modal-form-row">
                <label className="half">
                    <span>Replicas</span>
                    <NumericInput
                        value={(data.replicas as number) ?? 1}
                        min={1}
                        defaultValue={1}
                        onChange={(n) => onChange('replicas', n)}
                    />
                </label>
                <label className="half">
                    <span>Port</span>
                    <NumericInput
                        value={(data.port as number) ?? 80}
                        min={1}
                        max={65535}
                        defaultValue={80}
                        onChange={(n) => onChange('port', n)}
                    />
                </label>
            </div>
        </>
    );
}

function ServiceForm({
    data,
    onChange,
}: {
    data: Record<string, unknown>;
    onChange: (field: string, value: unknown) => void;
}) {
    return (
        <>
            <label>
                <span>Name</span>
                <input
                    value={(data.name as string) || ''}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder="my-service"
                />
            </label>
            <label>
                <span>Namespace</span>
                <input
                    value={(data.namespace as string) || ''}
                    onChange={(e) => onChange('namespace', e.target.value)}
                    placeholder="default"
                />
            </label>
            <label>
                <span>Selector (app:)</span>
                <input
                    value={(data.selector as string) || ''}
                    onChange={(e) => onChange('selector', e.target.value)}
                    placeholder="auto-filled on connect"
                    className={data.selector ? 'field-synced' : ''}
                    title={data.selector ? 'Auto-synced from connected Deployment name' : 'Connect to a Deployment to auto-fill'}
                    readOnly={!!data.selector}
                />
            </label>
            <label>
                <span>Protocol</span>
                <select
                    value={(data.protocol as string) || 'TCP'}
                    onChange={(e) => onChange('protocol', e.target.value)}
                >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="SCTP">SCTP</option>
                </select>
            </label>
            <div className="modal-form-row">
                <label className="half">
                    <span>Port</span>
                    <NumericInput
                        value={(data.port as number) ?? 80}
                        min={1}
                        max={65535}
                        defaultValue={80}
                        onChange={(n) => onChange('port', n)}
                    />
                </label>
                <label className="half">
                    <span>Target Port</span>
                    <NumericInput
                        value={(data.target_port as number) ?? 80}
                        min={1}
                        max={65535}
                        defaultValue={80}
                        className={data.selector ? 'field-synced' : ''}
                        title="Auto-synced from connected Deployment port"
                        onChange={(n) => onChange('target_port', n)}
                    />
                </label>
            </div>
        </>
    );
}

function IngressForm({
    data,
    onChange,
}: {
    data: Record<string, unknown>;
    onChange: (field: string, value: unknown) => void;
}) {
    return (
        <>
            <label>
                <span>Name</span>
                <input
                    value={(data.name as string) || ''}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder="my-ingress"
                />
            </label>
            <label>
                <span>Namespace</span>
                <input
                    value={(data.namespace as string) || ''}
                    onChange={(e) => onChange('namespace', e.target.value)}
                    placeholder="default"
                />
            </label>
            <label>
                <span>Host</span>
                <input
                    value={(data.host as string) || ''}
                    onChange={(e) => onChange('host', e.target.value)}
                    placeholder="example.com"
                />
            </label>
            <div className="modal-form-row">
                <label className="half">
                    <span>Path</span>
                    <input
                        value={(data.path as string) || ''}
                        onChange={(e) => onChange('path', e.target.value)}
                        placeholder="/"
                    />
                </label>
                <label className="half">
                    <span>Path Type</span>
                    <select
                        value={(data.path_type as string) || 'Prefix'}
                        onChange={(e) => onChange('path_type', e.target.value)}
                    >
                        <option value="Prefix">Prefix</option>
                        <option value="Exact">Exact</option>
                        <option value="ImplementationSpecific">ImplSpecific</option>
                    </select>
                </label>
            </div>
            <label>
                <span>Service Name</span>
                <input
                    value={(data.service_name as string) || ''}
                    onChange={(e) => onChange('service_name', e.target.value)}
                    placeholder="auto-filled on connect"
                    className={data.service_name ? 'field-synced' : ''}
                    title={data.service_name ? 'Auto-synced from connected Service' : 'Connect to a Service to auto-fill'}
                    readOnly={!!data.service_name}
                />
            </label>
            <div className="modal-form-row">
                <label className="half">
                    <span>Service Port</span>
                    <NumericInput
                        value={(data.service_port as number) ?? 80}
                        min={1}
                        max={65535}
                        defaultValue={80}
                        className={data.service_name ? 'field-synced' : ''}
                        onChange={(n) => onChange('service_port', n)}
                    />
                </label>
                <label className="half">
                    <span>Target Port</span>
                    <NumericInput
                        value={(data.target_port as number) ?? 80}
                        min={1}
                        max={65535}
                        defaultValue={80}
                        onChange={(n) => onChange('target_port', n)}
                    />
                </label>
            </div>
        </>
    );
}

function ConfigMapForm({
    data,
    onChange,
}: {
    data: Record<string, unknown>;
    onChange: (field: string, value: unknown) => void;
}) {
    const entries = (data.data as Record<string, string>) || {};
    const [newKey, setNewKey] = useState('');

    const handleEntryChange = useCallback(
        (oldKey: string, newKeyVal: string | null, newValue: string | null) => {
            const updated = { ...entries };
            if (newKeyVal !== null && newKeyVal !== oldKey) {
                const val = updated[oldKey];
                delete updated[oldKey];
                if (newKeyVal) updated[newKeyVal] = val ?? '';
            } else if (newValue !== null) {
                updated[oldKey] = newValue;
            }
            onChange('data', updated);
        },
        [entries, onChange]
    );

    const handleAddEntry = useCallback(() => {
        const key = newKey.trim() || `key_${Object.keys(entries).length}`;
        if (key in entries) return;
        onChange('data', { ...entries, [key]: '' });
        setNewKey('');
    }, [newKey, entries, onChange]);

    const handleRemoveEntry = useCallback(
        (key: string) => {
            const updated = { ...entries };
            delete updated[key];
            onChange('data', updated);
        },
        [entries, onChange]
    );

    return (
        <>
            <label>
                <span>Name</span>
                <input
                    value={(data.name as string) || ''}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder="my-config"
                />
            </label>
            <label>
                <span>Namespace</span>
                <input
                    value={(data.namespace as string) || ''}
                    onChange={(e) => onChange('namespace', e.target.value)}
                    placeholder="default"
                />
            </label>

            <div className="configmap-data-section">
                <span className="configmap-data-label">Data</span>
                {Object.entries(entries).map(([key, value]) => (
                    <div key={key} className="configmap-entry">
                        <input
                            className="configmap-key"
                            value={key}
                            onChange={(e) => handleEntryChange(key, e.target.value, null)}
                            placeholder="key"
                        />
                        <input
                            className="configmap-value"
                            value={value}
                            onChange={(e) => handleEntryChange(key, null, e.target.value)}
                            placeholder="value"
                        />
                        <button
                            className="configmap-remove-btn"
                            onClick={() => handleRemoveEntry(key)}
                            title="Remove entry"
                        >
                            <IconTrash size={12} />
                        </button>
                    </div>
                ))}
                <div className="configmap-add-row">
                    <input
                        className="configmap-new-key"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="new key..."
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry(); }}
                    />
                    <button
                        className="configmap-add-btn"
                        onClick={handleAddEntry}
                        title="Add entry"
                    >
                        <IconPlus size={12} />
                    </button>
                </div>
            </div>
        </>
    );
}

/* ── Modal wrapper ──────────────────────────────────────────────── */

export default function NodeConfigModal({
    nodeId,
    nodeType,
    nodeData,
    onChange,
    onClose,
}: NodeConfigModalProps) {
    const meta = META[nodeType] || META.deployment;
    const Icon = meta.icon;

    const handleFieldChange = useCallback(
        (field: string, value: unknown) => {
            onChange(nodeId, { [field]: value });
        },
        [nodeId, onChange]
    );

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const renderForm = () => {
        switch (nodeType) {
            case 'deployment':
                return <DeploymentForm data={nodeData} onChange={handleFieldChange} />;
            case 'service':
                return <ServiceForm data={nodeData} onChange={handleFieldChange} />;
            case 'ingress':
                return <IngressForm data={nodeData} onChange={handleFieldChange} />;
            case 'configmap':
                return <ConfigMapForm data={nodeData} onChange={handleFieldChange} />;
            default:
                return <p style={{ color: '#888' }}>Unknown node type: {nodeType}</p>;
        }
    };

    return (
        <div className="node-modal-overlay" onClick={onClose}>
            <div className="node-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="node-modal__header" style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }}>
                    <div className="node-modal__header-left">
                        <Icon size={18} color="#fff" />
                        <span>{meta.label} Configuration</span>
                    </div>
                    <button className="node-modal__close" onClick={onClose}>
                        <IconX size={16} />
                    </button>
                </div>

                {/* Form body */}
                <div className="node-modal__body">
                    {renderForm()}
                </div>

                {/* Footer */}
                <div className="node-modal__footer">
                    <span className="node-modal__id">ID: {nodeId}</span>
                    <button className="node-modal__done-btn" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
