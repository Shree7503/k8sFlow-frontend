import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import {
    IconX,
    IconSend2,
    IconSparkles,
    IconPlayerPlay,
} from '@tabler/icons-react';
import { aiApi } from '../../api/services';
import type {
    DeploymentNode,
    ServiceNode,
    IngressNode,
    ConfigMapNode,
    WorkflowEdge,
} from '../../api/services';

/* ── Types ──────────────────────────────────────────────────────── */

/** The raw AI response workflow uses different field names than the
 *  internal Workflow type (ingress vs ingresses, config_map vs configmaps). */
interface AIWorkflow {
    deployments: DeploymentNode[];
    services: ServiceNode[];
    ingress?: IngressNode[];
    config_map?: ConfigMapNode[];
    edges: WorkflowEdge[];
}

/** Normalised workflow passed to the canvas callback. */
export interface Workflow {
    deployments: DeploymentNode[];
    services: ServiceNode[];
    ingresses?: IngressNode[];
    configmaps?: ConfigMapNode[];
    edges: WorkflowEdge[];
}

interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    text: string;
    workflow?: Workflow;
    isError?: boolean;
}

export interface AIChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onWorkflowGenerated: (workflow: Workflow) => void;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

let msgCounter = 0;
function nextMsgId() {
    return `msg-${++msgCounter}-${Date.now()}`;
}

/** Normalise the AI backend field names to the internal convention. */
function normaliseWorkflow(raw: AIWorkflow): Workflow {
    return {
        deployments: raw.deployments ?? [],
        services: raw.services ?? [],
        ingresses: raw.ingress ?? [],
        configmaps: raw.config_map ?? [],
        edges: raw.edges ?? [],
    };
}

/** Summarise a workflow into a readable node count string. */
function workflowSummary(wf: Workflow): string {
    const parts: string[] = [];
    if (wf.deployments.length) parts.push(`${wf.deployments.length} deployment${wf.deployments.length > 1 ? 's' : ''}`);
    if (wf.services.length) parts.push(`${wf.services.length} service${wf.services.length > 1 ? 's' : ''}`);
    if (wf.ingresses?.length) parts.push(`${wf.ingresses.length} ingress`);
    if (wf.configmaps?.length) parts.push(`${wf.configmaps.length} configmap${wf.configmaps.length > 1 ? 's' : ''}`);
    return parts.join(', ');
}

/* ── Component ───────────────────────────────────────────────────── */

export default function AIChatPanel({ isOpen, onClose, onWorkflowGenerated }: AIChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Focus textarea when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => textareaRef.current?.focus(), 200);
        }
    }, [isOpen]);

    // Auto-resize textarea
    const handleInputChange = useCallback((value: string) => {
        setInput(value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, []);

    const sendMessage = useCallback(async () => {
        const prompt = input.trim();
        if (!prompt || loading) return;

        const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', text: prompt };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setLoading(true);

        try {
            const res = await aiApi.chat(prompt);
            const data = res.data;

            const aiMsg: ChatMessage = {
                id: nextMsgId(),
                role: 'ai',
                text: data.message || 'Workflow generated successfully.',
            };

            if (data.workflow) {
                aiMsg.workflow = normaliseWorkflow(data.workflow as AIWorkflow);
            }

            setMessages((prev) => [...prev, aiMsg]);
        } catch (err: any) {
            const errorText =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                'Something went wrong. Please try again.';

            setMessages((prev) => [
                ...prev,
                { id: nextMsgId(), role: 'ai', text: errorText, isError: true },
            ]);
        } finally {
            setLoading(false);
        }
    }, [input, loading]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        },
        [sendMessage]
    );

    const handleLoadToCanvas = useCallback(
        (workflow: Workflow) => {
            onWorkflowGenerated(workflow);
        },
        [onWorkflowGenerated]
    );

    if (!isOpen) return null;

    return (
        <div className="ai-chat-panel" id="ai-chat-panel">
            {/* Accent border */}
            <div className="ai-chat-panel__accent" />

            <div className="ai-chat-panel__inner">
                {/* ── Header ── */}
                <div className="ai-chat-panel__header">
                    <div className="ai-chat-panel__header-left">
                        <IconSparkles size={16} className="ai-chat-panel__header-icon" />
                        <span>k8sFlow AI</span>
                    </div>
                    <button
                        className="ai-chat-panel__close"
                        onClick={onClose}
                        title="Close AI Panel"
                        id="ai-chat-close-btn"
                    >
                        <IconX size={14} />
                    </button>
                </div>

                {/* ── Messages ── */}
                <div className="ai-chat-panel__messages" id="ai-chat-messages">
                    {messages.length === 0 && !loading && (
                        <div className="ai-chat-panel__empty">
                            <IconSparkles size={32} className="ai-chat-panel__empty-icon" />
                            <p className="ai-chat-panel__empty-title">AI Workflow Assistant</p>
                            <p className="ai-chat-panel__empty-hint">
                                Describe a Kubernetes workflow in natural language and I'll generate it for you.
                            </p>
                            <div className="ai-chat-panel__suggestions">
                                <button
                                    className="ai-chat-panel__suggestion"
                                    onClick={() => handleInputChange('Deploy an Nginx server with a Service')}
                                >
                                    "Deploy an Nginx server with a Service"
                                </button>
                                <button
                                    className="ai-chat-panel__suggestion"
                                    onClick={() => handleInputChange('Create a Redis cache connected to a Node.js backend')}
                                >
                                    "Redis cache + Node.js backend"
                                </button>
                                <button
                                    className="ai-chat-panel__suggestion"
                                    onClick={() => handleInputChange('Set up a WordPress deployment with MySQL')}
                                >
                                    "WordPress with MySQL database"
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`ai-chat-msg ai-chat-msg--${msg.role}${msg.isError ? ' ai-chat-msg--error' : ''}`}
                        >
                            <div className="ai-chat-msg__bubble">
                                <p className="ai-chat-msg__text">{msg.text}</p>
                                {msg.workflow && (
                                    <div className="ai-chat-msg__workflow">
                                        <div className="ai-chat-msg__workflow-info">
                                            <span className="ai-chat-msg__workflow-label">Generated Workflow</span>
                                            <span className="ai-chat-msg__workflow-count">
                                                {workflowSummary(msg.workflow)}
                                            </span>
                                        </div>
                                        <button
                                            className="ai-chat-msg__load-btn"
                                            onClick={() => handleLoadToCanvas(msg.workflow!)}
                                            id={`ai-load-btn-${msg.id}`}
                                        >
                                            <IconPlayerPlay size={14} />
                                            Load to Canvas
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="ai-chat-msg ai-chat-msg--ai">
                            <div className="ai-chat-msg__bubble">
                                <div className="ai-chat-panel__typing">
                                    <span className="ai-chat-panel__dot" />
                                    <span className="ai-chat-panel__dot" />
                                    <span className="ai-chat-panel__dot" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* ── Input ── */}
                <div className="ai-chat-panel__input-area">
                    <div className="ai-chat-panel__input-wrap">
                        <textarea
                            ref={textareaRef}
                            className="ai-chat-panel__textarea"
                            placeholder="Describe a Kubernetes workflow…"
                            value={input}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={loading}
                            id="ai-chat-input"
                        />
                        <button
                            className="ai-chat-panel__send-btn"
                            onClick={sendMessage}
                            disabled={!input.trim() || loading}
                            title="Send prompt"
                            id="ai-chat-send-btn"
                        >
                            <IconSend2 size={16} />
                        </button>
                    </div>
                    <span className="ai-chat-panel__input-hint">
                        Enter to send · Shift+Enter for newline
                    </span>
                </div>
            </div>
        </div>
    );
}
