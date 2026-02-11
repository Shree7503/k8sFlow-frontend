import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import kubernetesLogo from '../assets/Kubernetes_logo_without_workmark.svg';
import { useAuth } from '../context/AuthContext';
import { useAuthStore } from '../store/store';
import UserManagementPanel from '../components/admin/UserManagementPanel';
import ClusterAccessPanel from "../components/admin/ClusterAccessPanel";
import { Button } from '../components/ui/button';

type AdminTab = 'users' | 'clusters';

export default function AdminPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { user, clearUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSignOut = () => {
    clearUser();
    logout();
    navigate('/', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel - Admin Navigation */}
      <div className="w-[300px] panel border-r flex flex-col p-6">
        <Button
          onClick={() => navigate('/launcher')}
          variant="secondary"
          size="xs"
          className="mb-6 justify-start w-full"
        >
          ← Back to Launcher
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <img src={kubernetesLogo} alt="Kubernetes" className="w-10 h-10" />
          <div>
            <h1 className="text-lg font-bold">K8sFlow</h1>
            <p className="text-xs opacity-50">Admin Panel</p>
          </div>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left text-sm py-2 px-3 rounded transition-colors ${
              activeTab === 'users'
                ? 'bg-[var(--color-hover-dark)] font-medium'
                : 'hover:bg-[var(--color-hover-dark)] opacity-70'
            }`}
          >
            👥 User Management
          </button>
          <button
            onClick={() => setActiveTab('clusters')}
            className={`w-full text-left text-sm py-2 px-3 rounded transition-colors ${
              activeTab === 'clusters'
                ? 'bg-[var(--color-hover-dark)] font-medium'
                : 'hover:bg-[var(--color-hover-dark)] opacity-70'
            }`}
          >
            🔗 Cluster Access
          </button>
        </nav>

        <div className="flex-1" />

        <div className="border-t border-[var(--color-border-dark)] pt-4 space-y-1">
          <button
            onClick={() => navigate('/account')}
            className="w-full text-left text-sm py-2 px-3 rounded hover:bg-[var(--color-hover-dark)] transition-colors"
          >
            👤 Account
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left text-sm py-2 px-3 rounded text-red-500 hover:bg-red-500/10 transition-colors"
          >
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl">
          {activeTab === 'users' && <UserManagementPanel />}
          {activeTab === 'clusters' && <ClusterAccessPanel />}
        </div>
      </div>
    </div>
  );
}
