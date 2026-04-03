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
import DeploymentNodeComponent from '../components/workflow/DeploymentNode';
import ServiceNodeComponent from '../components/workflow/ServiceNode';
import NodePalette from '../components/workflow/NodePalette';
import { workflowsApi, connectionApi } from '../api/services';
import { useRBACStore } from '../store/rbacStore';

const nodeTypes = {
    deployment: DeploymentNodeComponent,
    service: ServiceNodeComponent,
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
            // Strip the onChange fn — functions can't be JSON serialised
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

    const { deleteElements } = useReactFlow();

    // A stable ref that always holds the latest edges — used inside handleNodeDataChange
    // to avoid adding `edges` as a dependency (which would cause an infinite update loop
    // because handleNodeDataChange is stored inside node.data.onChange).
    const edgesRef = useRef<Edge[]>(edges);
    useEffect(() => { edgesRef.current = edges; }, [edges]);

    // Count selected nodes + edges for the Delete Selected button
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
                const updated = nds.map((node: Node) =>
                    node.id === nodeId
                        ? { ...node, data: { ...node.data, ...newData } }
                        : node
                );

                // 2. If the changed node is a Deployment and a sync-relevant field
                //    changed, propagate to all directly connected Service nodes.
                //    Read edges from edgesRef (not from closure) to keep this
                //    callback stable and prevent infinite re-render loops.
                const changedNode = updated.find((n) => n.id === nodeId);
                if (changedNode?.type !== 'deployment') return updated;

                const syncFields = ['name', 'port', 'namespace'] as const;
                const hasSyncableChange = syncFields.some((f) => f in newData);
                if (!hasSyncableChange) return updated;

                const currentEdges = edgesRef.current;
                const connectedServiceIds = new Set(
                    currentEdges
                        .filter((e) => e.source === nodeId || e.target === nodeId)
                        .map((e) => (e.source === nodeId ? e.target : e.source))
                        .filter((id) => {
                            const n = updated.find((x) => x.id === id);
                            return n?.type === 'service';
                        })
                );

                if (connectedServiceIds.size === 0) return updated;

                const d = changedNode.data as Record<string, unknown>;
                return updated.map((n) => {
                    if (!connectedServiceIds.has(n.id)) return n;
                    const patch: Record<string, unknown> = {};
                    if ('name' in newData) patch.selector = (d.name as string) || '';
                    if ('port' in newData) patch.target_port = (d.port as number) ?? 80;
                    if ('namespace' in newData) patch.namespace = (d.namespace as string) || '';
                    return { ...n, data: { ...n.data, ...patch } };
                });
            });
        },
        [setNodes]  // stable — edgesRef is a ref, not a reactive dep
    );

    const isValidConnection = useCallback((connection: Edge | Connection) => {
        // Block self-loops
        if (connection.source === connection.target) return false;
        // Block duplicate edges (both directions) between the same pair
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

        // Step 1: immediately restore saved canvas (preserves positions)
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

        // Step 2: also fetch latest data from backend to merge node field values
        // (in case deployments/services were modified server-side)
        workflowsApi.list(clusterId).then((res) => {
            // Handle both flat { deployments } and wrapped { data: { deployments } } shapes
            const wf = res.data?.workflow ?? res.data?.data ?? res.data;
            if (!wf?.deployments && !wf?.services) return;

            if (saved) {
                // Merge: update data fields from API but keep saved positions
                setNodes((current: Node[]) =>
                    current.map((node: Node) => {
                        const apiNode =
                            node.type === 'deployment'
                                ? (wf.deployments || []).find((d: any) => d.id === node.id)
                                : (wf.services || []).find((s: any) => s.id === node.id);
                        if (!apiNode) return node;
                        return {
                            ...node,
                            data: { ...node.data, ...apiNode, onChange: handleNodeDataChange },
                        };
                    })
                );
            } else {
                // No saved canvas — build from API data with default positions
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
            // Detect removed edges before they disappear
            const removedEdges = changes
                .filter((c: any) => c.type === 'remove')
                .map((c: any) => edgesRef.current.find((e) => e.id === c.id))
                .filter(Boolean) as Edge[];

            // Apply the edge changes first
            onEdgesChange(changes);

            if (removedEdges.length === 0) return;

            // For each removed edge, check if it linked a deployment ↔ service
            setNodes((nds: Node[]) => {
                let updated = nds;
                for (const edge of removedEdges) {
                    const src = updated.find((n) => n.id === edge.source);
                    const tgt = updated.find((n) => n.id === edge.target);
                    const service = src?.type === 'service' ? src : tgt?.type === 'service' ? tgt : null;
                    const deployment = src?.type === 'deployment' ? src : tgt?.type === 'deployment' ? tgt : null;
                    if (!service || !deployment) continue;

                    // Check if the service still has another edge to a deployment
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
                return updated;
            });
        },
        [onEdgesChange, setNodes]
    );

    const onConnect = useCallback(
        (params: Connection) => {
            // Add the edge first (with consistent styling)
            setEdges((eds: Edge[]) =>
                addEdge({ ...params, animated: true, style: { stroke: 'var(--color-accent)', strokeWidth: 2 } }, eds)
            );

            // Auto-sync fields between a connected Deployment ↔ Service pair
            setNodes((nds: Node[]) => {
                const src = nds.find((n) => n.id === params.source);
                const tgt = nds.find((n) => n.id === params.target);
                if (!src || !tgt) return nds;

                // Work out which node is the deployment and which is the service
                const deployment = src.type === 'deployment' ? src
                    : tgt.type === 'deployment' ? tgt : null;
                const service = src.type === 'service' ? src
                    : tgt.type === 'service' ? tgt : null;

                if (!deployment || !service) return nds;  // same-type connection — no sync

                const d = deployment.data as Record<string, unknown>;
                return nds.map((n) => {
                    if (n.id !== service.id) return n;
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            // selector must match the Deployment's app label (its name)
                            selector: (d.name as string) || (n.data as Record<string, unknown>).selector,
                            // target_port must point at the container port
                            target_port: (d.port as number) ?? (n.data as Record<string, unknown>).target_port,
                            // keep namespace in sync
                            namespace: (d.namespace as string) || (n.data as Record<string, unknown>).namespace,
                        },
                    };
                });
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

            // @xyflow/react v12+ screenToFlowPosition already accounts for
            // the wrapper offset, so pass raw client coords.
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            setNodes((nds: Node[]) => {
                const newId = getNextNodeId(nds);
                const data: any =
                    type === 'deployment'
                        ? {
                            name: '',
                            namespace: 'default',
                            image: '',
                            replicas: 1,
                            port: 80,
                            onChange: handleNodeDataChange,
                        }
                        : {
                            name: '',
                            namespace: 'default',
                            protocol: 'TCP',
                            port: 80,
                            target_port: 80,
                            onChange: handleNodeDataChange,
                        };

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
                    edges: workflowEdges,
                },
            });
            // Persist the canvas state (nodes with positions + edges) to localStorage
            // `nodes` and `edges` are already current at handleApply call time
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

    // Save canvas to localStorage only (no Kubernetes deploy)
    const handleSave = () => {
        if (!clusterId) return;
        setSaving(true);
        saveCanvas(clusterId, nodes, edges);
        setStatusMsg('Canvas saved!');
        setTimeout(() => { setStatusMsg(null); setSaving(false); }, 2000);
    };

    // Delete all currently selected nodes and edges
    const handleDeleteSelected = useCallback(() => {
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((e) => e.selected);
        deleteElements({ nodes: selectedNodes, edges: selectedEdges });
    }, [nodes, edges, deleteElements]);

    // Disconnect and go back
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
                            nodeColor={(node: Node) =>
                                node.type === 'deployment' ? '#3b82f6' : '#10b981'
                            }
                        />
                    </ReactFlow>
                </div>
            </div>
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
