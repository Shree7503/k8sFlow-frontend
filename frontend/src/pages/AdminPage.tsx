import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconUsers, IconServer, IconSettings, IconLogout } from '@tabler/icons-react';
import kubernetesLogo from '../assets/Kubernetes_logo_without_workmark.svg';
import { useAuth } from '../context/AuthContext';
import { useAuthStore } from '../store/store';
import UserManagementPanel from '../components/admin/UserManagementPanel';
import ClusterAccessPanel from "../components/admin/ClusterAccessPanel";
import { Button } from '../components/ui/button';
import { BackIcon } from '../components/BackIcon';

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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header - Back to Launcher */}
      <div className="panel border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={kubernetesLogo} alt="Kubernetes" className="w-6 h-6" />
          <h1 className="text-sm font-bold">K8sFlow Admin</h1>
        </div>
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

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <div className="w-[280px] panel border-r flex flex-col bg-[#1e1e1e]">
          {/* Main Navigation Section */}
          <div className="px-4 py-6">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Management
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 text-sm py-2 px-3 rounded transition-colors ${
                  activeTab === 'users'
                    ? 'bg-[#326CE5] text-white font-medium'
                    : 'text-gray-300 hover:bg-[#2d2d2d] transition-colors'
                }`}
              >
                <IconUsers size={16} className="flex-shrink-0" />
                <span>User Management</span>
              </button>
              <button
                onClick={() => setActiveTab('clusters')}
                className={`w-full flex items-center gap-3 text-sm py-2 px-3 rounded transition-colors ${
                  activeTab === 'clusters'
                    ? 'bg-[#326CE5] text-white font-medium'
                    : 'text-gray-300 hover:bg-[#2d2d2d] transition-colors'
                }`}
              >
                <IconServer size={16} className="flex-shrink-0" />
                <span>Cluster Access</span>
              </button>
            </nav>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 my-2" />

          {/* Settings Section */}
          <div className="px-4 py-6 flex-1">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Settings
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => navigate('/account')}
                className="w-full flex items-center gap-3 text-sm py-2 px-3 rounded text-gray-300 hover:bg-[#2d2d2d] transition-colors"
              >
                <IconSettings size={16} className="flex-shrink-0" />
                <span>Account</span>
              </button>
            </nav>
          </div>

          {/* Sign Out Section */}
          <div className="px-4 py-6 border-t border-gray-700">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 text-sm py-2 px-3 rounded text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <IconLogout size={16} className="flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="max-w-5xl">
              {activeTab === 'users' && <UserManagementPanel />}
              {activeTab === 'clusters' && <ClusterAccessPanel />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
