import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { IconBox } from '@tabler/icons-react';

export interface DeploymentNodeData {
    name: string;
    namespace: string;
    image: string;
    replicas: number;
    port: number;
    onChange?: (id: string, data: Partial<DeploymentNodeData>) => void;
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
    onChange,
}: {
    value: number;
    min?: number;
    max?: number;
    defaultValue: number;
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

function DeploymentNodeComponent({ id, data }: NodeProps) {
    const nodeData = data as unknown as DeploymentNodeData;

    const handleChange = useCallback(
        (field: keyof DeploymentNodeData, value: string | number) => {
            nodeData.onChange?.(id, { [field]: value });
        },
        [id, nodeData]
    );

    return (
        <div className="workflow-node deployment-node">
            {/* Header */}
            <div className="workflow-node-header deployment-header">
                <IconBox size={14} />
                <span>Deployment</span>
            </div>

            {/* Body */}
            <div className="workflow-node-body">
                <label>
                    <span>Name</span>
                    <input
                        value={nodeData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="my-app"
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
                    <span>Image</span>
                    <input
                        value={nodeData.image || ''}
                        onChange={(e) => handleChange('image', e.target.value)}
                        placeholder="nginx:latest"
                    />
                </label>
                <div className="workflow-node-row">
                    <label className="half">
                        <span>Replicas</span>
                        <NumericInput
                            value={nodeData.replicas ?? 1}
                            min={1}
                            defaultValue={1}
                            onChange={(n) => handleChange('replicas', n)}
                        />
                    </label>
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
                </div>
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Left} className="workflow-handle" />
            <Handle type="source" position={Position.Right} className="workflow-handle" />
        </div>
    );
}

export default memo(DeploymentNodeComponent);
