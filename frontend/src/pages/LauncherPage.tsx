import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconHome, IconUser, IconShield, IconSettings, IconBook, IconMoon, IconSun, IconLogout } from '@tabler/icons-react';
import kubernetesLogo from '../assets/Kubernetes_logo_without_workmark.svg';
import ClusterCard from '../components/ClusterCard.tsx';
import EmptyState from '../components/EmptyState.tsx';
import RoleGate from '../components/RoleGate.tsx';
import RoleBadge from '../components/RoleBadge.tsx';
import { useAuth } from '../context/AuthContext';
import { useAuthStore } from '../store/store';
import { useRBACStore } from '../store/rbacStore';
import { SystemRole } from '../types/rbac';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { clustersApi, connectionApi } from '../api/services';


export default function LauncherPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { user, clearUser } = useAuthStore();
  const { clusterAccess, loading: rbacLoading, fetchClusterAccess } = useRBACStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClusterAccess();
  }, [fetchClusterAccess]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.classList.toggle('light-theme', newTheme === 'light');
  };

  const filteredClusters = clusterAccess.filter(cluster =>
    cluster.clusterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cluster.context.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCluster = () => {
    navigate('/create-cluster');
  };

  const handleSignOut = () => {
    clearUser();
    logout();
    navigate('/', { replace: true });
  };

  const handleDeleteCluster = async (clusterId: string, clusterName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete cluster "${clusterName}"?\n\nThis will remove the cluster and all associated credentials. This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await clustersApi.delete(clusterId);
      // Refresh the cluster list after deletion
      await fetchClusterAccess();
    } catch (error) {
      console.error('Failed to delete cluster:', error);
      alert('Failed to delete cluster. Please try again.');
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel - App Identity */}
      <div className="w-[300px] panel border-r flex flex-col p-6">
        <div className="flex items-center gap-3 mb-8">
          <img src={kubernetesLogo} alt="Kubernetes" className="w-10 h-10" />
          <div>
            <h1 className="text-lg font-bold">K8sFlow</h1>
            <p className="text-xs opacity-50">v1.0.0-beta</p>
          </div>
        </div>

        {/* User role display */}
        {user && (
          <div className="mb-6 p-3 panel rounded">
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-70">{user.name || user.email}</span>
              <RoleBadge role={user.role} size="sm" />
            </div>
          </div>
        )}

        <div className="flex-1">
          <div className="mb-6">
            <h3 className="text-xs font-semibold opacity-50 uppercase mb-3">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Clusters</span>
                <span className="font-mono">{clusterAccess.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Connected</span>
                <span className="font-mono text-[var(--color-success)]">
                  {clusterAccess.filter(c => c.status === 'connected').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Workflows</span>
                <span className="font-mono">0</span>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-border-dark)] pt-6 space-y-1">
            <button
              onClick={() => navigate('/')}
              className="w-full text-left text-sm py-2 px-3 rounded hover:bg-[var(--color-hover-dark)] transition-colors flex items-center gap-2"
            >
              <IconHome size={16} />
              Home
            </button>
            <button
              onClick={() => navigate('/account')}
              className="w-full text-left text-sm py-2 px-3 rounded hover:bg-[var(--color-hover-dark)] transition-colors flex items-center gap-2"
            >
              <IconUser size={16} />
              Account
            </button>
            {/* Admin link: only visible to Admin users */}
            <RoleGate minSystemRole={SystemRole.Admin}>
              <button
                onClick={() => navigate('/admin')}
                className="w-full text-left text-sm py-2 px-3 rounded hover:bg-[var(--color-hover-dark)] transition-colors flex items-center gap-2"
              >
                <IconShield size={16} />
                Admin Panel
              </button>
            </RoleGate>
            <button className="w-full text-left text-sm py-2 px-3 rounded hover:bg-[var(--color-hover-dark)] transition-colors flex items-center gap-2">
              <IconSettings size={16} />
              Settings
            </button>
            <button className="w-full text-left text-sm py-2 px-3 rounded hover:bg-[var(--color-hover-dark)] transition-colors flex items-center gap-2">
              <IconBook size={16} />
              Documentation
            </button>
          </div>
        </div>

        <div className="border-t border-[var(--color-border-dark)] pt-4 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full text-left text-sm py-2 px-3 rounded hover:bg-[var(--color-hover-dark)] transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? <IconMoon size={16} /> : <IconSun size={16} />}
              Theme
            </span>
            <span className="text-xs opacity-50">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left text-sm py-2 px-3 rounded hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-2"
          >
            <IconLogout size={16} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Right Panel - Cluster List */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="panel border-b p-4 flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search clusters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-[var(--color-border-dark)] focus-visible:ring-[var(--color-accent)] bg-[var(--color-bg-dark)]"
            />
          </div>
          {/* Add Cluster: only for Admin users */}
          <RoleGate minSystemRole={SystemRole.Admin}>
            <Button onClick={handleAddCluster} className="ml-4">
              + Add Cluster
            </Button>
          </RoleGate>
        </div>

        {/* Cluster List */}
        <div className="flex-1 overflow-auto p-6">
          {rbacLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="panel p-8 text-center">
                <div className="animate-pulse mb-2">Loading clusters...</div>
                <p className="text-xs opacity-50">Fetching your cluster access</p>
              </div>
            </div>
          ) : filteredClusters.length === 0 ? (
            <EmptyState onAddCluster={handleAddCluster} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl">
              {filteredClusters.map((cluster) => (
                console.log(cluster.role),
                <ClusterCard
                  key={cluster.clusterId}
                  name={cluster.clusterName}
                  context={cluster.context}
                  status={cluster.status}
                  lastConnected={cluster.lastConnected}
                  clusterRole={cluster.role}
                  systemRole={user?.role}
                  onConnect={async () => {
                    try {
                      await connectionApi.connect(cluster.clusterId);
                    } catch { /* connection might already exist */ }
                    navigate(`/workspace/${cluster.clusterId}`);
                  }}
                  onEdit={() => console.log('Edit:', cluster.clusterName)}
                  onDelete={() => handleDeleteCluster(cluster.clusterId, cluster.clusterName)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
