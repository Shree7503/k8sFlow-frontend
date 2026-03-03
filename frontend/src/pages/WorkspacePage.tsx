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

let nodeId = 0;
const getNodeId = () => `node_${nodeId++}`;

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
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    const clusterAccess = useRBACStore((s) => s.clusterAccess);
    const cluster = clusterAccess.find((c) => c.clusterId === clusterId);
    const clusterName = cluster?.clusterName || 'Cluster';

    const handleNodeDataChange = useCallback(
        (nodeId: string, newData: Record<string, unknown>) => {
            setNodes((nds: Node[]) =>
                nds.map((node: Node) =>
                    node.id === nodeId
                        ? { ...node, data: { ...node.data, ...newData } }
                        : node
                )
            );
        },
        [setNodes]
    );

    const isValidConnection = useCallback((connection: Edge | Connection) => {
        if (connection.source === connection.target) return false;
        return true;
    }, []);

    useEffect(() => {
        if (!clusterId) return;
        workflowsApi.list(clusterId).then((res) => {
            const wf = res.data;
            if (wf?.deployments || wf?.services) {
                const loaded: Node[] = [];
                let x = 100;
                (wf.deployments || []).forEach((d: any) => {
                    loaded.push({
                        id: d.id || getNodeId(),
                        type: 'deployment',
                        position: { x, y: 100 },
                        data: { ...d, onChange: handleNodeDataChange },
                    });
                    x += 320;
                });
                (wf.services || []).forEach((s: any) => {
                    loaded.push({
                        id: s.id || getNodeId(),
                        type: 'service',
                        position: { x, y: 100 },
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
        }).catch(() => {
        });
    }, [clusterId, handleNodeDataChange, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) =>
            setEdges((eds: Edge[]) =>
                addEdge(
                    { ...params, animated: true },
                    eds
                )
            ),
        [setEdges]
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

            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
            });

            const newId = getNodeId();
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

            setNodes((nds: Node[]) => [...nds, newNode]);
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
            setStatusMsg('Workflow applied successfully!');
        } catch (err: any) {
            console.error('[ApplyWorkflow] error:', err?.response?.status, JSON.stringify(err?.response?.data));
            setStatusMsg(err?.response?.data?.error || 'Failed to apply workflow');
        } finally {
            setApplying(false);
            setTimeout(() => setStatusMsg(null), 4000);
        }
    };

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
                        <span className={`workspace-status ${statusMsg.includes('success') ? 'success' : 'error'}`}>
                            {statusMsg}
                        </span>
                    )}
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
                        onClick={() => { setNodes([]); setEdges([]); }}
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
                        onEdgesChange={onEdgesChange}
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
