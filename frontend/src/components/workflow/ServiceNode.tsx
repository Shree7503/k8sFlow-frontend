import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { IconNetwork } from '@tabler/icons-react';

export interface ServiceNodeData {
    name: string;
    namespace: string;
    protocol: string;
    port: number;
    target_port: number;
    selector: string;   // app label selector — auto-synced from connected Deployment name
    onChange?: (id: string, data: Partial<ServiceNodeData>) => void;
}

/**
 * A number input that lets the user type freely (including clearing to empty),
 * only committing a valid value (or the default) on blur.
 */
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

    // Keep local in sync when the value changes externally (e.g. auto-sync)
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

function ServiceNodeComponent({ id, data }: NodeProps) {
    const nodeData = data as unknown as ServiceNodeData;

    const handleChange = useCallback(
        (field: keyof ServiceNodeData, value: string | number) => {
            nodeData.onChange?.(id, { [field]: value });
        },
        [id, nodeData]
    );

    return (
        <div className="workflow-node service-node">
            {/* Header */}
            <div className="workflow-node-header service-header">
                <IconNetwork size={14} />
                <span>Service</span>
            </div>

            {/* Body */}
            <div className="workflow-node-body">
                <label>
                    <span>Name</span>
                    <input
                        value={nodeData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="my-service"
                    />
                </label>
                <label>
                    <span>Namespace</span>
                    <input
                        value={nodeData.namespace || ''}
                        onChange={(e) => handleChange('namespace', e.target.value)}
                        placeholder="default"
                    />
                </label>
                <label>
                    <span>Selector (app:)</span>
                    <input
                        value={nodeData.selector || ''}
                        onChange={(e) => handleChange('selector', e.target.value)}
                        placeholder="auto-filled on connect"
                        className={nodeData.selector ? 'field-synced' : ''}
                        title={nodeData.selector ? 'Auto-synced from connected Deployment name' : 'Connect to a Deployment to auto-fill'}
                        readOnly={!!nodeData.selector}
                    />
                </label>
                <label>
                    <span>Protocol</span>
                    <select
                        value={nodeData.protocol || 'TCP'}
                        onChange={(e) => handleChange('protocol', e.target.value)}
                    >
                        <option value="TCP">TCP</option>
                        <option value="UDP">UDP</option>
                        <option value="SCTP">SCTP</option>
                    </select>
                </label>
                <div className="workflow-node-row">
                    <label className="half">
                        <span>Port</span>
                        <NumericInput
                            value={nodeData.port ?? 80}
                            min={1}
                            max={65535}
                            defaultValue={80}
                            onChange={(n) => handleChange('port', n)}
                        />
                    </label>
                    <label className="half">
                        <span>Target Port</span>
                        <NumericInput
                            value={nodeData.target_port ?? 80}
                            min={1}
                            max={65535}
                            defaultValue={80}
                            className={nodeData.selector ? 'field-synced' : ''}
                            title="Auto-synced from connected Deployment port"
                            onChange={(n) => handleChange('target_port', n)}
                        />
                    </label>
                </div>
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Left} className="workflow-handle" />
            <Handle type="source" position={Position.Right} className="workflow-handle" />
        </div>
    );
}

export default memo(ServiceNodeComponent);
