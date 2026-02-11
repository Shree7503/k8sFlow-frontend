import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import kubernetesLogo from '../assets/Kubernetes_logo_without_workmark.svg';
import { useAuth } from '../context/AuthContext';
import { useAuthStore, mapRole } from '../store/store';
import axiosInstance from '../axios/interceptor';
import { getRoleName } from '../utils/roleMapper';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

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
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel - Navigation */}
      <div className="w-[300px] panel border-r flex flex-col p-6">
        <Button onClick={() => navigate('/launcher')} variant="secondary" size="xs" className="mb-6 justify-start w-full">
          ← Back to Launcher
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <img src={kubernetesLogo} alt="Kubernetes" className="w-10 h-10" />
          <div>
            <h1 className="text-lg font-bold">K8sFlow</h1>
            <p className="text-xs opacity-50">Account Settings</p>
          </div>
        </div>

        <nav className="space-y-1">
          <button className="w-full text-left text-sm py-2 px-3 rounded bg-[var(--color-hover-dark)] font-medium">
            Profile
          </button>
          <button className="w-full text-left text-sm py-2 px-3 rounded hover:bg-[var(--color-hover-dark)] transition-colors opacity-70">
            Security
          </button>
          <button className="w-full text-left text-sm py-2 px-3 rounded hover:bg-[var(--color-hover-dark)] transition-colors opacity-70">
            Preferences
          </button>
        </nav>

        <div className="flex-1" />

        <button
          onClick={handleSignOut}
          className="w-full text-left text-sm py-2 px-3 rounded text-red-500 hover:bg-red-500/10 transition-colors"
        >
          🚪 Sign Out
        </button>
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
  );
}
