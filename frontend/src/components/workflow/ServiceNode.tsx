import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { IconNetwork } from '@tabler/icons-react';

export interface ServiceNodeData {
    name: string;
    namespace: string;
    protocol: string;
    port: number;
    target_port: number;
    onChange?: (id: string, data: Partial<ServiceNodeData>) => void;
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
                        <input
                            type="number"
                            min={1}
                            max={65535}
                            value={nodeData.port ?? 80}
                            onChange={(e) => handleChange('port', parseInt(e.target.value) || 80)}
                        />
                    </label>
                    <label className="half">
                        <span>Target Port</span>
                        <input
                            type="number"
                            min={1}
                            max={65535}
                            value={nodeData.target_port ?? 80}
                            onChange={(e) => handleChange('target_port', parseInt(e.target.value) || 80)}
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
