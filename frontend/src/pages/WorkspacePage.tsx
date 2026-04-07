import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    useReactFlow,
    type Connection,
    type Edge,
    type Node,
    type NodeMouseHandler,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    IconArrowLeft,
    IconRocket,
    IconTrash,
    IconLoader2,
    IconDeviceFloppy,
    IconX,
} from '@tabler/icons-react';
import CompactNodeComponent from '../components/workflow/CompactNode';
import NodeConfigModal from '../components/workflow/NodeConfigModal';
import NodePalette from '../components/workflow/NodePalette';
import { workflowsApi, connectionApi } from '../api/services';
import { useRBACStore } from '../store/rbacStore';

/* All four resource types use the same compact canvas node.
   React Flow resolves the `type` string and passes it as a prop. */
const nodeTypes = {
    deployment: CompactNodeComponent,
    service: CompactNodeComponent,
    ingress: CompactNodeComponent,
    configmap: CompactNodeComponent,
};

/** Derive the next safe node ID from the current set of nodes. */
function getNextNodeId(existingNodes: Node[]): string {
    const maxId = existingNodes.reduce((max, n) => {
        const match = n.id.match(/^node_(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, -1);
    return `node_${maxId + 1}`;
}

// ── Canvas persistence helpers ────────────────────────────────────
const canvasKey = (clusterId: string) => `k8sflow:canvas:${clusterId}`;

interface PersistedCanvas {
    nodes: { id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }[];
    edges: { id: string; source: string; target: string; animated?: boolean }[];
}

function saveCanvas(clusterId: string, nodes: Node[], edges: Edge[]) {
    const payload: PersistedCanvas = {
        nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type as string,
            position: n.position,
            data: Object.fromEntries(
                Object.entries(n.data as Record<string, unknown>).filter(([k]) => k !== 'onChange')
            ),
        })),
        edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            animated: e.animated,
        })),
    };
    try {
        localStorage.setItem(canvasKey(clusterId), JSON.stringify(payload));
    } catch { /* quota exceeded — silently ignore */ }
}

function loadCanvas(clusterId: string): PersistedCanvas | null {
    try {
        const raw = localStorage.getItem(canvasKey(clusterId));
        return raw ? (JSON.parse(raw) as PersistedCanvas) : null;
    } catch {
        return null;
    }
}

function clearCanvas(clusterId: string) {
    localStorage.removeItem(canvasKey(clusterId));
}

function WorkspaceCanvas() {
    const { clusterId } = useParams<{ clusterId: string }>();
    const navigate = useNavigate();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [applying, setApplying] = useState(false);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    // ── Modal state ──────────────────────────────────────────────
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    const { deleteElements } = useReactFlow();

    const edgesRef = useRef<Edge[]>(edges);
    useEffect(() => { edgesRef.current = edges; }, [edges]);

    const selectedCount =
        nodes.filter((n) => n.selected).length +
        edges.filter((e) => e.selected).length;

    const clusterAccess = useRBACStore((s) => s.clusterAccess);
    const cluster = clusterAccess.find((c) => c.clusterId === clusterId);
    const clusterName = cluster?.clusterName || 'Cluster';

    const handleNodeDataChange = useCallback(
        (nodeId: string, newData: Record<string, unknown>) => {
            setNodes((nds: Node[]) => {
                // 1. Apply the change to the node itself
                let updated = nds.map((node: Node) =>
                    node.id === nodeId
                        ? { ...node, data: { ...node.data, ...newData } }
                        : node
                );

                const changedNode = updated.find((n) => n.id === nodeId);
                const currentEdges = edgesRef.current;

                // 2. Deployment → Service sync
                if (changedNode?.type === 'deployment') {
                    const syncFields = ['name', 'port', 'namespace'] as const;
                    const hasSyncableChange = syncFields.some((f) => f in newData);
                    if (hasSyncableChange) {
                        const connectedServiceIds = new Set(
                            currentEdges
                                .filter((e) => e.source === nodeId || e.target === nodeId)
                                .map((e) => (e.source === nodeId ? e.target : e.source))
                                .filter((id) => updated.find((x) => x.id === id)?.type === 'service')
                        );
                        if (connectedServiceIds.size > 0) {
                            const d = changedNode.data as Record<string, unknown>;
                            updated = updated.map((n) => {
                                if (!connectedServiceIds.has(n.id)) return n;
                                const patch: Record<string, unknown> = {};
                                if ('name' in newData) patch.selector = (d.name as string) || '';
                                if ('port' in newData) patch.target_port = (d.port as number) ?? 80;
                                if ('namespace' in newData) patch.namespace = (d.namespace as string) || '';
                                return { ...n, data: { ...n.data, ...patch } };
                            });
                        }
                    }
                }

                // 3. Service → Ingress sync
                if (changedNode?.type === 'service') {
                    const syncFields = ['name', 'port'] as const;
                    const hasSyncableChange = syncFields.some((f) => f in newData);
                    if (hasSyncableChange) {
                        const connectedIngressIds = new Set(
                            currentEdges
                                .filter((e) => e.source === nodeId || e.target === nodeId)
                                .map((e) => (e.source === nodeId ? e.target : e.source))
                                .filter((id) => updated.find((x) => x.id === id)?.type === 'ingress')
                        );
                        if (connectedIngressIds.size > 0) {
                            const s = changedNode.data as Record<string, unknown>;
                            updated = updated.map((n) => {
                                if (!connectedIngressIds.has(n.id)) return n;
                                const patch: Record<string, unknown> = {};
                                if ('name' in newData) patch.service_name = (s.name as string) || '';
                                if ('port' in newData) patch.service_port = (s.port as number) ?? 80;
                                return { ...n, data: { ...n.data, ...patch } };
                            });
                        }
                    }
                }

                return updated;
            });
        },
        [setNodes]
    );

    const isValidConnection = useCallback((connection: Edge | Connection) => {
        if (connection.source === connection.target) return false;
        const hasDuplicate = edgesRef.current.some(
            (e) =>
                (e.source === connection.source && e.target === connection.target) ||
                (e.source === connection.target && e.target === connection.source)
        );
        return !hasDuplicate;
    }, []);

    // ── Restore canvas from localStorage on mount ────────────────
    useEffect(() => {
        if (!clusterId) return;

        const saved = loadCanvas(clusterId);
        if (saved) {
            const restoredNodes: Node[] = saved.nodes.map((n) => ({
                ...n,
                data: { ...n.data, onChange: handleNodeDataChange },
            }));
            const restoredEdges: Edge[] = saved.edges.map((e) => ({
                ...e,
                animated: e.animated ?? true,
                style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
            }));
            setNodes(restoredNodes);
            setEdges(restoredEdges);
        }

        workflowsApi.list(clusterId).then((res) => {
            const wf = res.data?.workflow ?? res.data?.data ?? res.data;
            if (!wf?.deployments && !wf?.services && !wf?.ingresses && !wf?.configmaps) return;

            if (saved) {
                setNodes((current: Node[]) =>
                    current.map((node: Node) => {
                        let apiNode: any = null;
                        if (node.type === 'deployment') apiNode = (wf.deployments || []).find((d: any) => d.id === node.id);
                        else if (node.type === 'service') apiNode = (wf.services || []).find((s: any) => s.id === node.id);
                        else if (node.type === 'ingress') apiNode = (wf.ingresses || []).find((i: any) => i.id === node.id);
                        else if (node.type === 'configmap') apiNode = (wf.configmaps || []).find((c: any) => c.id === node.id);
                        if (!apiNode) return node;
                        return {
                            ...node,
                            data: { ...node.data, ...apiNode, onChange: handleNodeDataChange },
                        };
                    })
                );
            } else {
                const loaded: Node[] = [];
                let x = 100;
                (wf.deployments || []).forEach((d: any) => {
                    loaded.push({
                        id: d.id || getNextNodeId(loaded),
                        type: 'deployment',
                        position: { x, y: 100 },
                        data: { ...d, onChange: handleNodeDataChange },
                    });
                    x += 320;
                });
                (wf.services || []).forEach((s: any) => {
                    loaded.push({
                        id: s.id || getNextNodeId(loaded),
                        type: 'service',
                        position: { x, y: 300 },
                        data: { ...s, onChange: handleNodeDataChange },
                    });
                    x += 320;
                });
                (wf.ingresses || []).forEach((ing: any) => {
                    loaded.push({
                        id: ing.id || getNextNodeId(loaded),
                        type: 'ingress',
                        position: { x, y: 100 },
                        data: { ...ing, onChange: handleNodeDataChange },
                    });
                    x += 320;
                });
                (wf.configmaps || []).forEach((cm: any) => {
                    loaded.push({
                        id: cm.id || getNextNodeId(loaded),
                        type: 'configmap',
                        position: { x, y: 300 },
                        data: { ...cm, onChange: handleNodeDataChange },
                    });
                    x += 320;
                });
                setNodes(loaded);

                if (wf.edges) {
                    const loadedEdges: Edge[] = wf.edges.map((e: any, i: number) => ({
                        id: `e-${i}`,
                        source: e.source_id,
                        target: e.target_id,
                        animated: true,
                        style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
                    }));
                    setEdges(loadedEdges);
                }
            }
        }).catch(() => { /* backend not reachable or no workflow yet */ });
    }, [clusterId, handleNodeDataChange, setNodes, setEdges]);

    // Wrap onEdgesChange so that when an edge is removed, we clear
    // auto-synced fields (selector, target_port, namespace) on the Service.
    const handleEdgesChange = useCallback(
        (changes: any[]) => {
            const removedEdges = changes
                .filter((c: any) => c.type === 'remove')
                .map((c: any) => edgesRef.current.find((e) => e.id === c.id))
                .filter(Boolean) as Edge[];

            onEdgesChange(changes);

            if (removedEdges.length === 0) return;

            setNodes((nds: Node[]) => {
                let updated = nds;
                for (const edge of removedEdges) {
                    const src = updated.find((n) => n.id === edge.source);
                    const tgt = updated.find((n) => n.id === edge.target);

                    // Deployment ↔ Service: clear selector/target_port on Service
                    const service = src?.type === 'service' ? src : tgt?.type === 'service' ? tgt : null;
                    const deployment = src?.type === 'deployment' ? src : tgt?.type === 'deployment' ? tgt : null;
                    if (service && deployment) {
                        const remainingEdges = edgesRef.current.filter(
                            (e) => e.id !== edge.id &&
                                (e.source === service.id || e.target === service.id)
                        );
                        const stillConnected = remainingEdges.some((e) => {
                            const otherId = e.source === service.id ? e.target : e.source;
                            return updated.find((n) => n.id === otherId)?.type === 'deployment';
                        });
                        if (!stillConnected) {
                            updated = updated.map((n) =>
                                n.id === service.id
                                    ? { ...n, data: { ...n.data, selector: '', target_port: 80 } }
                                    : n
                            );
                        }
                    }

                    // Service ↔ Ingress: clear service_name/service_port on Ingress
                    const svcNode = src?.type === 'service' ? src : tgt?.type === 'service' ? tgt : null;
                    const ingress = src?.type === 'ingress' ? src : tgt?.type === 'ingress' ? tgt : null;
                    if (svcNode && ingress) {
                        const remainingEdges = edgesRef.current.filter(
                            (e) => e.id !== edge.id &&
                                (e.source === ingress.id || e.target === ingress.id)
                        );
                        const stillConnected = remainingEdges.some((e) => {
                            const otherId = e.source === ingress.id ? e.target : e.source;
                            return updated.find((n) => n.id === otherId)?.type === 'service';
                        });
                        if (!stillConnected) {
                            updated = updated.map((n) =>
                                n.id === ingress.id
                                    ? { ...n, data: { ...n.data, service_name: '', service_port: 80 } }
                                    : n
                            );
                        }
                    }
                }
                return updated;
            });
        },
        [onEdgesChange, setNodes]
    );

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds: Edge[]) =>
                addEdge({ ...params, animated: true, style: { stroke: 'var(--color-accent)', strokeWidth: 2 } }, eds)
            );

            setNodes((nds: Node[]) => {
                const src = nds.find((n) => n.id === params.source);
                const tgt = nds.find((n) => n.id === params.target);
                if (!src || !tgt) return nds;

                let result = nds;

                // Deployment ↔ Service: sync selector, target_port, namespace
                const deployment = src.type === 'deployment' ? src
                    : tgt.type === 'deployment' ? tgt : null;
                const service = src.type === 'service' ? src
                    : tgt.type === 'service' ? tgt : null;

                if (deployment && service) {
                    const d = deployment.data as Record<string, unknown>;
                    result = result.map((n) => {
                        if (n.id !== service.id) return n;
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                selector: (d.name as string) || (n.data as Record<string, unknown>).selector,
                                target_port: (d.port as number) ?? (n.data as Record<string, unknown>).target_port,
                                namespace: (d.namespace as string) || (n.data as Record<string, unknown>).namespace,
                            },
                        };
                    });
                }

                // Service ↔ Ingress: sync service_name, service_port
                const svcNode = src.type === 'service' ? src
                    : tgt.type === 'service' ? tgt : null;
                const ingress = src.type === 'ingress' ? src
                    : tgt.type === 'ingress' ? tgt : null;

                if (svcNode && ingress) {
                    const s = svcNode.data as Record<string, unknown>;
                    result = result.map((n) => {
                        if (n.id !== ingress.id) return n;
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                service_name: (s.name as string) || (n.data as Record<string, unknown>).service_name,
                                service_port: (s.port as number) ?? (n.data as Record<string, unknown>).service_port,
                            },
                        };
                    });
                }

                return result;
            });
        },
        [setEdges, setNodes]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow-type');
            if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            setNodes((nds: Node[]) => {
                const newId = getNextNodeId(nds);
                let data: any;
                switch (type) {
                    case 'deployment':
                        data = {
                            name: '',
                            namespace: 'default',
                            image: '',
                            replicas: 1,
                            port: 80,
                            onChange: handleNodeDataChange,
                        };
                        break;
                    case 'service':
                        data = {
                            name: '',
                            namespace: 'default',
                            protocol: 'TCP',
                            port: 80,
                            target_port: 80,
                            onChange: handleNodeDataChange,
                        };
                        break;
                    case 'ingress':
                        data = {
                            name: '',
                            namespace: 'default',
                            host: '',
                            path: '/',
                            path_type: 'Prefix',
                            target_port: 80,
                            service_name: '',
                            service_port: 80,
                            onChange: handleNodeDataChange,
                        };
                        break;
                    case 'configmap':
                        data = {
                            name: '',
                            namespace: 'default',
                            data: {},
                            onChange: handleNodeDataChange,
                        };
                        break;
                    default:
                        data = { onChange: handleNodeDataChange };
                }

                const newNode: Node = {
                    id: newId,
                    type,
                    position,
                    data,
                };

                return [...nds, newNode];
            });
        },
        [reactFlowInstance, handleNodeDataChange, setNodes]
    );

    // ── Double-click → open config modal ─────────────────────────
    const onNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
        setEditingNodeId(node.id);
    }, []);

    const handleModalClose = useCallback(() => {
        setEditingNodeId(null);
    }, []);

    // Resolve the node being edited
    const editingNode = editingNodeId ? nodes.find((n) => n.id === editingNodeId) : null;

    // Apply workflow
    const handleApply = async () => {
        if (!clusterId) return;
        setApplying(true);
        setStatusMsg(null);

        const deployments = nodes
            .filter((n: Node) => n.type === 'deployment')
            .map((n: Node) => ({
                id: n.id,
                name: (n.data as Record<string, unknown>).name as string || '',
                namespace: (n.data as Record<string, unknown>).namespace as string || 'default',
                image: (n.data as Record<string, unknown>).image as string || '',
                replicas: (n.data as Record<string, unknown>).replicas as number ?? 1,
                port: (n.data as Record<string, unknown>).port as number ?? 80,
            }));

        const services = nodes
            .filter((n: Node) => n.type === 'service')
            .map((n: Node) => ({
                id: n.id,
                name: (n.data as Record<string, unknown>).name as string || '',
                namespace: (n.data as Record<string, unknown>).namespace as string || 'default',
                protocol: (n.data as Record<string, unknown>).protocol as string || 'TCP',
                port: (n.data as Record<string, unknown>).port as number ?? 80,
                target_port: (n.data as Record<string, unknown>).target_port as number ?? 80,
            }));

        const ingresses = nodes
            .filter((n: Node) => n.type === 'ingress')
            .map((n: Node) => ({
                id: n.id,
                name: (n.data as Record<string, unknown>).name as string || '',
                namespace: (n.data as Record<string, unknown>).namespace as string || 'default',
                host: (n.data as Record<string, unknown>).host as string || '',
                path: (n.data as Record<string, unknown>).path as string || '/',
                path_type: (n.data as Record<string, unknown>).path_type as string || 'Prefix',
                target_port: (n.data as Record<string, unknown>).target_port as number ?? 80,
                service_name: (n.data as Record<string, unknown>).service_name as string || '',
                service_port: (n.data as Record<string, unknown>).service_port as number ?? 80,
            }));

        const configmaps = nodes
            .filter((n: Node) => n.type === 'configmap')
            .map((n: Node) => ({
                id: n.id,
                name: (n.data as Record<string, unknown>).name as string || '',
                namespace: (n.data as Record<string, unknown>).namespace as string || 'default',
                data: (n.data as Record<string, unknown>).data as Record<string, string> || {},
            }));

        const workflowEdges = edges.map((e: Edge) => ({
            source_id: e.source,
            target_id: e.target,
        }));

        const payload = {
            name: clusterName,
            cluster_id: clusterId,
            workflow: {
                deployments,
                services,
                ingresses,
                configmaps,
                edges: workflowEdges,
            },
        };
        console.log('[ApplyWorkflow] payload:', JSON.stringify(payload, null, 2));

        try {
            await workflowsApi.apply({
                name: clusterName,
                cluster_id: clusterId,
                workflow: {
                    deployments,
                    services,
                    ingresses,
                    configmaps,
                    edges: workflowEdges,
                },
            });
            saveCanvas(clusterId, nodes, edges);
            setStatusMsg('Workflow applied successfully!');
        } catch (err: any) {
            console.error('[ApplyWorkflow] error:', err?.response?.status, JSON.stringify(err?.response?.data));
            setStatusMsg(err?.response?.data?.error || 'Failed to apply workflow');
        } finally {
            setApplying(false);
            setTimeout(() => setStatusMsg(null), 4000);
        }
    };

    const handleSave = () => {
        if (!clusterId) return;
        setSaving(true);
        saveCanvas(clusterId, nodes, edges);
        setStatusMsg('Canvas saved!');
        setTimeout(() => { setStatusMsg(null); setSaving(false); }, 2000);
    };

    const handleDeleteSelected = useCallback(() => {
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((e) => e.selected);
        deleteElements({ nodes: selectedNodes, edges: selectedEdges });
    }, [nodes, edges, deleteElements]);

    const handleBack = async () => {
        if (clusterId) {
            try { await connectionApi.disconnect(clusterId); } catch { /* ignore */ }
        }
        navigate('/launcher');
    };

    return (
        <div className="workspace-container">
            {/* Top toolbar */}
            <div className="workspace-toolbar">
                <div className="workspace-toolbar-left">
                    <button className="workspace-back-btn" onClick={handleBack}>
                        <IconArrowLeft size={18} />
                    </button>
                    <div className="workspace-cluster-info">
                        <h2>{clusterName}</h2>
                        <span className="workspace-cluster-id">{clusterId}</span>
                    </div>
                </div>
                <div className="workspace-toolbar-right">
                    {statusMsg && (
                        <span className={`workspace-status ${statusMsg.includes('saved') || statusMsg.includes('success') ? 'success' : 'error'}`}>
                            {statusMsg}
                        </span>
                    )}
                    <button
                        className="workspace-btn workspace-btn-delete-sel"
                        onClick={handleDeleteSelected}
                        disabled={selectedCount === 0}
                        title="Delete selected nodes / edges"
                    >
                        <IconX size={16} />
                        Delete{selectedCount > 0 ? ` (${selectedCount})` : ''}
                    </button>
                    <button
                        className="workspace-btn workspace-btn-save"
                        onClick={handleSave}
                        disabled={saving || nodes.length === 0}
                        title="Save canvas layout to local storage"
                    >
                        {saving ? <IconLoader2 size={16} className="animate-spin" /> : <IconDeviceFloppy size={16} />}
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        className="workspace-btn workspace-btn-apply"
                        onClick={handleApply}
                        disabled={applying || nodes.length === 0}
                    >
                        {applying ? (
                            <IconLoader2 size={16} className="animate-spin" />
                        ) : (
                            <IconRocket size={16} />
                        )}
                        {applying ? 'Applying...' : 'Apply'}
                    </button>
                    <button
                        className="workspace-btn workspace-btn-clear"
                        onClick={() => { setNodes([]); setEdges([]); if (clusterId) clearCanvas(clusterId); }}
                        disabled={nodes.length === 0}
                    >
                        <IconTrash size={16} />
                        Clear
                    </button>
                </div>
            </div>

            {/* Main workspace area */}
            <div className="workspace-body">
                <NodePalette />
                <div className="workspace-canvas" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={handleEdgesChange}
                        onConnect={onConnect}
                        isValidConnection={isValidConnection}
                        onInit={setReactFlowInstance}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        onNodeDoubleClick={onNodeDoubleClick}
                        fitView
                        snapToGrid
                        snapGrid={[16, 16]}
                        deleteKeyCode={['Backspace', 'Delete']}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background variant={BackgroundVariant.Dots} color="rgba(148,163,184,0.25)" gap={20} size={1.5} />
                        <Controls
                            showInteractive={false}
                            className="workspace-controls"
                        />
                        <MiniMap
                            style={{
                                background: 'var(--color-bg-darker)',
                                border: '1px solid var(--color-border-dark)',
                            }}
                            maskColor="rgba(0,0,0,0.6)"
                            nodeColor={(node: Node) => {
                                switch (node.type) {
                                    case 'deployment': return '#3b82f6';
                                    case 'service': return '#10b981';
                                    case 'ingress': return '#8b5cf6';
                                    case 'configmap': return '#f59e0b';
                                    default: return '#6366f1';
                                }
                            }}
                        />
                    </ReactFlow>
                </div>
            </div>

            {/* Config modal — shown when a node is double-clicked */}
            {editingNode && (
                <NodeConfigModal
                    nodeId={editingNode.id}
                    nodeType={editingNode.type || 'deployment'}
                    nodeData={editingNode.data as unknown as Record<string, unknown>}
                    onChange={handleNodeDataChange}
                    onClose={handleModalClose}
                />
            )}
        </div>
    );
}

export default function WorkspacePage() {
    return (
        <ReactFlowProvider>
            <WorkspaceCanvas />
        </ReactFlowProvider>
    );
}
