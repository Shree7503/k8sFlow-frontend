import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconUpload,
  IconServer,
  IconCloudComputing,
  IconCopy,
  IconCheck,
  IconDownload,
} from '@tabler/icons-react';
import RoleGate from '../components/RoleGate';
import { SystemRole } from '../types/rbac';
import axiosInstance from '../axios/interceptor';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { BackIcon } from '../components/BackIcon';

type ConnectionMode = 'kubeconfig' | 'agent';

export default function CreateClusterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    description: '',
  });
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('kubeconfig');
  const [kubeConfig, setKubeConfig] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Agent-specific state
  const [agentManifest, setAgentManifest] = useState<string | null>(null);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdClusterId, setCreatedClusterId] = useState<string | null>(null);

  const handleSubmitKubeconfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kubeConfig) {
      setError('Please upload a KubeConfig file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create Cluster
      const clusterRes = await axiosInstance.post(`/api/v1/clusters`, {
        name: formData.name,
        provider: formData.provider,
        description: formData.description,
      });

      const clusterId = clusterRes.data.id;

      // 2. Upload Credentials
      const formDataUpload = new FormData();
      formDataUpload.append('file', kubeConfig);

      await axiosInstance.post(`/api/v1/clusters/${clusterId}/creds`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate('/launcher');
    } catch (err) {
      console.error('Failed to create cluster:', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      setError(error.response?.data?.message || 'Failed to create cluster. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      // 1. Create Cluster
      const clusterRes = await axiosInstance.post(`/api/v1/clusters`, {
        name: formData.name,
        provider: formData.provider,
        description: formData.description,
      });

      const clusterId = clusterRes.data.id;
      setCreatedClusterId(clusterId);

      // 2. Fetch agent manifest
      setManifestLoading(true);
      const manifestRes = await axiosInstance.get(`/api/v1/clusters/${clusterId}/agent-manifest`);

      // The response is the YAML string
      const yaml = typeof manifestRes.data === 'string'
        ? manifestRes.data
        : manifestRes.data.manifest || manifestRes.data.yaml || JSON.stringify(manifestRes.data, null, 2);

      setAgentManifest(yaml);
    } catch (err) {
      console.error('Failed to create cluster / fetch manifest:', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      setError(error.response?.data?.message || 'Failed to create cluster. Please try again.');
    } finally {
      setLoading(false);
      setManifestLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setKubeConfig(e.target.files[0]);
    }
  };

  const handleCopyManifest = () => {
    if (agentManifest) {
      navigator.clipboard.writeText(agentManifest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadManifest = () => {
    if (agentManifest) {
      const blob = new Blob([agentManifest], { type: 'application/x-yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `k8sflow-agent-${createdClusterId || 'manifest'}.yaml`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Shared select styling
  const selectClass =
    'flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

  return (
    <RoleGate minSystemRole={SystemRole.Admin}>
      <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Header */}
        <div className="panel border-b px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">Add New Cluster</h1>
          <Button
            onClick={() => navigate('/launcher')}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-xs"
          >
            <BackIcon className="w-3 h-3" />
            Back to Launcher
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-8 flex justify-center">
          <div className="w-full max-w-2xl">
            <div className="panel p-8 rounded-lg border border-[var(--border-primary)] shadow-sm">
              <h2 className="text-xl font-bold mb-6">Cluster Details</h2>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
                  {error}
                </div>
              )}

              <form
                onSubmit={connectionMode === 'kubeconfig' ? handleSubmitKubeconfig : handleSubmitAgent}
                className="space-y-6"
              >
                {/* ── Cluster info fields ── */}
                <div>
                  <label className="block text-sm font-medium mb-1 opacity-70">Cluster Name</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. production-us-east"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!!agentManifest}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 opacity-70">Provider</label>
                  <select
                    required
                    className={selectClass}
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    disabled={!!agentManifest}
                  >
                    <option value="" disabled>Select Provider</option>
                    <option value="AWS">AWS EKS</option>
                    <option value="GCP">GCP GKE</option>
                    <option value="Azure">Azure AKS</option>
                    <option value="DigitalOcean">DigitalOcean</option>
                    <option value="OnPremise">On-Premise / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 opacity-70">Description</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded border border-input bg-transparent px-3 py-2 text-base transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-none"
                    placeholder="Optional description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={!!agentManifest}
                  />
                </div>

                {/* ── Connection Method Selection ── */}
                <div className="border-t border-[var(--border-primary)] pt-6">
                  <h3 className="text-lg font-semibold mb-4">Connection Method</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {/* Kubeconfig option */}
                    <button
                      type="button"
                      onClick={() => { setConnectionMode('kubeconfig'); setAgentManifest(null); setCreatedClusterId(null); }}
                      disabled={!!agentManifest}
                      className={`relative p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                        connectionMode === 'kubeconfig'
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 shadow-[0_0_12px_rgba(50,108,229,0.1)]'
                          : 'border-[var(--color-border-dark)] hover:border-[var(--color-accent)]/40 bg-transparent'
                      } ${agentManifest ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          connectionMode === 'kubeconfig'
                            ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                            : 'bg-[var(--color-bg-dark)] text-zinc-400'
                        }`}>
                          <IconServer size={20} />
                        </div>
                        <span className="font-semibold text-sm">Local / KubeConfig</span>
                      </div>
                      <p className="text-xs opacity-60 leading-relaxed">
                        Upload a kubeconfig file to connect directly to your cluster. Best for local or self-managed clusters.
                      </p>
                      {connectionMode === 'kubeconfig' && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_6px_var(--color-accent)]" />
                      )}
                    </button>

                    {/* Agent option */}
                    <button
                      type="button"
                      onClick={() => { setConnectionMode('agent'); setAgentManifest(null); setCreatedClusterId(null); }}
                      disabled={!!agentManifest}
                      className={`relative p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                        connectionMode === 'agent'
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 shadow-[0_0_12px_rgba(50,108,229,0.1)]'
                          : 'border-[var(--color-border-dark)] hover:border-[var(--color-accent)]/40 bg-transparent'
                      } ${agentManifest ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          connectionMode === 'agent'
                            ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                            : 'bg-[var(--color-bg-dark)] text-zinc-400'
                        }`}>
                          <IconCloudComputing size={20} />
                        </div>
                        <span className="font-semibold text-sm">Remote / Agent</span>
                      </div>
                      <p className="text-xs opacity-60 leading-relaxed">
                        Deploy a K8sFlow agent into your remote cluster. The agent connects back securely — no kubeconfig needed.
                      </p>
                      {connectionMode === 'agent' && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_6px_var(--color-accent)]" />
                      )}
                    </button>
                  </div>

                  {/* ── Kubeconfig upload (shown when kubeconfig mode) ── */}
                  {connectionMode === 'kubeconfig' && (
                    <div>
                      <label className="block text-sm font-medium mb-1 opacity-70">KubeConfig File</label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[var(--border-primary)] border-dashed rounded-md hover:border-[var(--color-primary)] transition-colors cursor-pointer relative">
                        <div className="space-y-1 text-center">
                          <div className="flex justify-center opacity-50">
                            <IconUpload size={48} />
                          </div>
                          <div className="flex text-sm text-[var(--text-secondary)] justify-center">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] focus-within:outline-none">
                              <span>Upload a file</span>
                              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".yaml,.yml,.kubeconfig" />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs opacity-50">
                            {kubeConfig ? kubeConfig.name : 'YAML or KubeConfig up to 1MB'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Agent info (shown when agent mode, before creation) ── */}
                  {connectionMode === 'agent' && !agentManifest && (
                    <div className="rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)]/50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] mt-0.5">
                          <IconCloudComputing size={16} />
                        </div>
                        <div className="text-xs leading-relaxed opacity-70">
                          <p className="mb-2">
                            After creating the cluster, a <strong>YAML agent manifest</strong> will be generated with your cluster's ID and backend URL pre-configured.
                          </p>
                          <p>
                            Apply the manifest to your remote cluster with <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] font-mono text-[11px]">kubectl apply -f manifest.yaml</code> to establish the connection.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Agent Manifest Display (shown after creation) ── */}
                  {connectionMode === 'agent' && agentManifest && (
                    <div className="space-y-4">
                      {/* Success banner */}
                      <div className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-4">
                        <div className="flex items-center gap-2 text-[var(--color-success)] mb-1">
                          <IconCheck size={16} />
                          <span className="text-sm font-semibold">Cluster Created Successfully</span>
                        </div>
                        <p className="text-xs opacity-60">
                          Apply the manifest below to your remote cluster to deploy the K8sFlow agent.
                        </p>
                      </div>

                      {/* Manifest YAML block */}
                      <div className="rounded-lg border border-[var(--color-border-dark)] overflow-hidden">
                        {/* Manifest header with actions */}
                        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-panel-dark)] border-b border-[var(--color-border-dark)]">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Agent Manifest
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleCopyManifest}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs hover:bg-[var(--color-hover-dark)] text-zinc-400 hover:text-zinc-200 transition-colors"
                              title="Copy to clipboard"
                            >
                              {copied ? (
                                <>
                                  <IconCheck size={14} className="text-[var(--color-success)]" />
                                  <span className="text-[var(--color-success)]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <IconCopy size={14} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadManifest}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs hover:bg-[var(--color-hover-dark)] text-zinc-400 hover:text-zinc-200 transition-colors"
                              title="Download YAML"
                            >
                              <IconDownload size={14} />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>

                        {/* YAML content */}
                        <div className="max-h-[400px] overflow-auto bg-[var(--color-bg-dark)]">
                          <pre className="p-4 text-[12px] leading-relaxed font-mono text-zinc-300 whitespace-pre overflow-x-auto">
                            {agentManifest}
                          </pre>
                        </div>
                      </div>

                      {/* Usage instructions */}
                      <div className="rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)]/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                          Quick Start
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-xs">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                            <div>
                              <span className="opacity-70">Save the manifest or copy it to your clipboard</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-xs">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                            <div>
                              <span className="opacity-70">Apply to your target cluster:</span>
                              <code className="ml-1 px-1.5 py-0.5 rounded bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] font-mono text-[11px]">
                                kubectl apply -f k8sflow-agent.yaml
                              </code>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-xs">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                            <div>
                              <span className="opacity-70">The agent will connect automatically and your cluster will appear in the launcher</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Actions ── */}
                <div className="flex items-center justify-end gap-3 pt-6">
                  {agentManifest ? (
                    <Button
                      type="button"
                      onClick={() => navigate('/launcher')}
                    >
                      Done — Go to Launcher
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={() => navigate('/launcher')}
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading || manifestLoading}
                      >
                        {loading || manifestLoading
                          ? 'Creating...'
                          : connectionMode === 'agent'
                            ? 'Create & Generate Manifest'
                            : 'Create Cluster'}
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
