import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import kubernetesLogo from '../assets/Kubernetes_logo_without_workmark.svg';
import { useAuth } from '../context/AuthContext';
import { useAuthStore, mapRole } from '../store/store';
import axiosInstance from '../axios/interceptor';
import { getRoleName } from '../utils/roleMapper';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

// SVG Icon Components
const BackIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const SignOutIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
);

export default function AccountPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { user, setUser, clearUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        navigate('/', { replace: true });
        return;
      }

      try {
        const response = await axiosInstance.get(`/api/v1/users/${user.id}`);
        const data = response.data;

        // Backend may return user data as { user: {...} } or directly as {...}
        const userData = data.user || data;
        if (userData && userData.id) {
          setUser({
            ...userData,
            role: mapRole(userData.role),
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, user?.id, navigate, setUser]);

  const handleSignOut = () => {
    clearUser(); // Clear user from store
    logout(); // Clear auth token
    navigate('/', { replace: true });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="panel p-8 text-center">
          <div className="animate-pulse mb-4">Loading...</div>
          <p className="text-sm opacity-60">Fetching account information</p>
        </div>
      </div>
    );
  }

  // Ensure user is not null before rendering
  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header Bar */}
      <div className="panel border-b px-6 py-3 flex items-center justify-between bg-gradient-to-r from-[#1a1a1a] to-[#252525]">
        <div className="flex items-center gap-3">
          <img src={kubernetesLogo} alt="Kubernetes" className="w-6 h-6" />
          <div>
            <h1 className="text-sm font-bold">K8sFlow</h1>
            <p className="text-xs opacity-40">Account Settings</p>
          </div>
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
        <div className="w-[240px] panel border-r flex flex-col bg-[#1e1e1e] p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Settings
          </div>
          <nav className="space-y-1">
            <button className="w-full text-left text-sm py-2 px-3 rounded bg-[#326CE5] text-white font-medium transition-colors">
              Profile
            </button>
            <button className="w-full text-left text-sm py-2 px-3 rounded text-gray-300 hover:bg-[#2d2d2d] transition-colors">
              Security
            </button>
            <button className="w-full text-left text-sm py-2 px-3 rounded text-gray-300 hover:bg-[#2d2d2d] transition-colors">
              Preferences
            </button>
          </nav>

          <div className="flex-1" />

          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 text-sm py-2 px-3 rounded text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <SignOutIcon className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold mb-2">Profile</h1>
          <p className="text-sm opacity-60 mb-8">Manage your account settings and preferences</p>

          {/* Profile Information */}
          <div className="panel p-6 mb-6">
            <h2 className="text-sm font-semibold opacity-50 uppercase mb-4">Profile Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium opacity-70 mb-2">Full Name</label>
                <Input
                  type="text"
                  defaultValue={user.name}
                  className="max-w-md"
                />
              </div>

              <div>
                <label className="block text-xs font-medium opacity-70 mb-2">Email</label>
                <Input
                  type="email"
                  defaultValue={user.email}
                  className="max-w-md"
                  disabled
                />
                <p className="text-xs opacity-50 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-xs font-medium opacity-70 mb-2">Role</label>
                <div className="text-sm font-mono opacity-70">{getRoleName(user.role)}</div>
              </div>

              <div>
                <label className="block text-xs font-medium opacity-70 mb-2">Member Since</label>
                <div className="text-sm opacity-70">{user.joined}</div>
              </div>

              <div className="pt-4">
                <Button>Save Changes</Button>
              </div>
            </div>
          </div>

          {/* Account Stats */}
          <div className="panel p-6 mb-6">
            <h2 className="text-sm font-semibold opacity-50 uppercase mb-4">Account Statistics</h2>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold font-mono">3</div>
                <div className="text-xs opacity-60">Clusters</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono">12</div>
                <div className="text-xs opacity-60">Workflows</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono">48</div>
                <div className="text-xs opacity-60">Deployments</div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="panel p-6 border-red-500/20">
            <h2 className="text-sm font-semibold opacity-50 uppercase mb-4 text-red-500">Danger Zone</h2>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium mb-1">Delete Account</h3>
                <p className="text-xs opacity-60 mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
