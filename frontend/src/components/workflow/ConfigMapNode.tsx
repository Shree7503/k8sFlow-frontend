import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { IconFileText, IconPlus, IconTrash } from '@tabler/icons-react';

export interface ConfigMapNodeData {
    name: string;
    namespace: string;
    data: Record<string, string>;
    onChange?: (id: string, data: Partial<ConfigMapNodeData>) => void;
}

function ConfigMapNodeComponent({ id, data }: NodeProps) {
    const nodeData = data as unknown as ConfigMapNodeData;
    const entries = nodeData.data || {};
    const [newKey, setNewKey] = useState('');

    const handleChange = useCallback(
        (field: keyof ConfigMapNodeData, value: string | Record<string, string>) => {
            nodeData.onChange?.(id, { [field]: value });
        },
        [id, nodeData]
    );

    const handleEntryChange = useCallback(
        (oldKey: string, newKeyVal: string | null, newValue: string | null) => {
            const updated = { ...entries };
            if (newKeyVal !== null && newKeyVal !== oldKey) {
                // Key was renamed
                const val = updated[oldKey];
                delete updated[oldKey];
                if (newKeyVal) updated[newKeyVal] = val ?? '';
            } else if (newValue !== null) {
                updated[oldKey] = newValue;
            }
            handleChange('data', updated);
        },
        [entries, handleChange]
    );

    const handleAddEntry = useCallback(() => {
        const key = newKey.trim() || `key_${Object.keys(entries).length}`;
        if (key in entries) return;
        handleChange('data', { ...entries, [key]: '' });
        setNewKey('');
    }, [newKey, entries, handleChange]);

    const handleRemoveEntry = useCallback(
        (key: string) => {
            const updated = { ...entries };
            delete updated[key];
            handleChange('data', updated);
        },
        [entries, handleChange]
    );

    return (
        <div className="workflow-node configmap-node">
            {/* Header */}
            <div className="workflow-node-header configmap-header">
                <IconFileText size={14} />
                <span>ConfigMap</span>
            </div>

            {/* Body */}
            <div className="workflow-node-body">
                <label>
                    <span>Name</span>
                    <input
                        value={nodeData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="my-config"
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

                {/* Data entries */}
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
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddEntry();
                            }}
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
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Left} className="workflow-handle" />
            <Handle type="source" position={Position.Right} className="workflow-handle" />
        </div>
    );
}

export default memo(ConfigMapNodeComponent);
