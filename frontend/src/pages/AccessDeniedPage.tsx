import { useNavigate } from 'react-router-dom';
import kubernetesLogo from '../assets/Kubernetes_logo_without_workmark.svg';
import { useAuthStore } from '../store/store';
import { getRoleName } from '../utils/roleMapper';
import RoleBadge from '../components/RoleBadge';
import { Button } from '../components/ui/button';

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
          {/* Shield icon */}
          <div className="access-denied-icon mb-6">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-16 h-16 mx-auto opacity-40"
            >
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
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
              variant="secondary"
            >
              ← Go Back
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
