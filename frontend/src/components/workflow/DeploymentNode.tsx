import { memo, useCallback } from 'react';
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
                        <input
                            type="number"
                            min={1}
                            value={nodeData.replicas ?? 1}
                            onChange={(e) => handleChange('replicas', parseInt(e.target.value) || 1)}
                        />
                    </label>
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
                </div>
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Left} className="workflow-handle" />
            <Handle type="source" position={Position.Right} className="workflow-handle" />
        </div>
    );
}

export default memo(DeploymentNodeComponent);
