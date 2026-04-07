import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { IconWorldWww } from '@tabler/icons-react';

export interface IngressNodeData {
    name: string;
    namespace: string;
    host: string;
    path: string;
    path_type: string;
    target_port: number;
    service_name: string;
    service_port: number;
    onChange?: (id: string, data: Partial<IngressNodeData>) => void;
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

    // Keep local in sync when the value changes externally
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

function IngressNodeComponent({ id, data }: NodeProps) {
    const nodeData = data as unknown as IngressNodeData;

    const handleChange = useCallback(
        (field: keyof IngressNodeData, value: string | number) => {
            nodeData.onChange?.(id, { [field]: value });
        },
        [id, nodeData]
    );

    return (
        <div className="workflow-node ingress-node">
            {/* Header */}
            <div className="workflow-node-header ingress-header">
                <IconWorldWww size={14} />
                <span>Ingress</span>
            </div>

            {/* Body */}
            <div className="workflow-node-body">
                <label>
                    <span>Name</span>
                    <input
                        value={nodeData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="my-ingress"
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
                    <span>Host</span>
                    <input
                        value={nodeData.host || ''}
                        onChange={(e) => handleChange('host', e.target.value)}
                        placeholder="example.com"
                    />
                </label>
                <div className="workflow-node-row">
                    <label className="half">
                        <span>Path</span>
                        <input
                            value={nodeData.path || ''}
                            onChange={(e) => handleChange('path', e.target.value)}
                            placeholder="/"
                        />
                    </label>
                    <label className="half">
                        <span>Path Type</span>
                        <select
                            value={nodeData.path_type || 'Prefix'}
                            onChange={(e) => handleChange('path_type', e.target.value)}
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
                        value={nodeData.service_name || ''}
                        onChange={(e) => handleChange('service_name', e.target.value)}
                        placeholder="my-service"
                        className={nodeData.service_name ? 'field-synced' : ''}
                        title={nodeData.service_name ? 'Auto-synced from connected Service' : 'Connect to a Service to auto-fill'}
                    />
                </label>
                <div className="workflow-node-row">
                    <label className="half">
                        <span>Service Port</span>
                        <NumericInput
                            value={nodeData.service_port ?? 80}
                            min={1}
                            max={65535}
                            defaultValue={80}
                            className={nodeData.service_name ? 'field-synced' : ''}
                            title="Port on the backend Service"
                            onChange={(n) => handleChange('service_port', n)}
                        />
                    </label>
                    <label className="half">
                        <span>Target Port</span>
                        <NumericInput
                            value={nodeData.target_port ?? 80}
                            min={1}
                            max={65535}
                            defaultValue={80}
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

export default memo(IngressNodeComponent);
