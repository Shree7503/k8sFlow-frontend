import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleGate from '../components/RoleGate';
import { SystemRole } from '../types/rbac';
import axiosInstance from '../axios/interceptor';
import { Button } from '../components/ui/button';

export default function CreateClusterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        provider: '',
        description: '',
    });
    const [kubeConfig, setKubeConfig] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
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
            formDataUpload.append('kubeconfig', kubeConfig);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setKubeConfig(e.target.files[0]);
        }
    };

    return (
        <RoleGate minSystemRole={SystemRole.Admin}>
            <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
                {/* Header */}
                <div className="panel border-b p-4 flex items-center gap-4">
                    <button onClick={() => navigate('/launcher')} className="text-sm hover:text-[var(--text-secondary)]">
                        ← Back
                    </button>
                    <h1 className="text-lg font-bold">Add New Cluster</h1>
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

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1 opacity-70">Cluster Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="input-field w-full"
                                        placeholder="e.g. production-us-east"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 opacity-70">Provider</label>
                                    <select
                                        required
                                        className="input-field w-full"
                                        value={formData.provider}
                                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
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
                                        className="input-field w-full h-24 resize-none"
                                        placeholder="Optional description..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="border-t border-[var(--border-primary)] pt-6">
                                    <h3 className="text-lg font-semibold mb-4">Connection Details</h3>

                                    <div>
                                        <label className="block text-sm font-medium mb-1 opacity-70">KubeConfig File</label>
                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[var(--border-primary)] border-dashed rounded-md hover:border-[var(--color-primary)] transition-colors cursor-pointer relative">
                                            <div className="space-y-1 text-center">
                                                <svg className="mx-auto h-12 w-12 opacity-50" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
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
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-6">
                                    <Button
                                        type="button"
                                        onClick={() => navigate('/launcher')}
                                        variant="secondary"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                    >
                                        {loading ? 'Creating...' : 'Create Cluster'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </RoleGate>
    );
}
