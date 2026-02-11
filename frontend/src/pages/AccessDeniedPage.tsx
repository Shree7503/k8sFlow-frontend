import { useNavigate } from 'react-router-dom';
import { IconAlertTriangle } from '@tabler/icons-react';
import kubernetesLogo from '../assets/Kubernetes_logo_without_workmark.svg';
import { useAuthStore } from '../store/store';
import { getRoleName } from '../utils/roleMapper';
import RoleBadge from '../components/RoleBadge';
import { Button } from '../components/ui/button';
import { BackIcon } from '../components/BackIcon';

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={kubernetesLogo} alt="Kubernetes" className="w-10 h-10" />
          <div className="text-left">
            <div className="text-lg font-bold">K8sFlow</div>
            <div className="text-xs opacity-50">Access Control</div>
          </div>
        </div>

        <div className="panel p-8 access-denied-card">
          {/* Alert icon */}
          <div className="access-denied-icon mb-6 flex justify-center">
            <IconAlertTriangle size={64} className="opacity-40" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-sm opacity-60 mb-6">
            You don't have the required permissions to access this page.
          </p>

          {user && (
            <div className="panel p-4 mb-6 text-sm">
              <div className="flex items-center justify-center gap-3">
                <span className="opacity-70">Your current role:</span>
                <RoleBadge role={user.role} size="md" />
              </div>
            </div>
          )}

          <p className="text-xs opacity-50 mb-6">
            If you believe you should have access, contact your system administrator
            to request a role upgrade to <strong>{getRoleName(2)}</strong>.
          </p>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <BackIcon className="w-3 h-3" />
              Go Back
            </Button>
            <Button
              onClick={() => navigate('/launcher')}
            >
              Go to Launcher
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
