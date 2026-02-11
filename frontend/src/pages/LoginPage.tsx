import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import kubernetesLogo from '../assets/Kubernetes_logo_without_workmark.svg';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axios/interceptor';
import { parseErrorMessage, parseFieldErrors } from '../utils/errorHandler';
import { useAuthStore, mapRole } from '../store/store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, token } = useAuth();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  useEffect(() => {
    if (token) {
      navigate('/launcher', { replace: true });
    }
  }, [token, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const response = await axiosInstance.post('/api/v1/login', {
          email,
          password,
        });

        const data = response.data;
        console.log(data.data);

        if (data.token) {
          login(data.token);
          setUser({
            ...data.data,
            role: mapRole(data.data.role),
          });
          navigate('/launcher');
        } else {
          setErrors({ general: 'Invalid response from server. No authentication token received.' });
        }
      } catch (error: unknown) {
        console.error('Login error:', error);

        // Parse field-specific errors first
        const fieldErrors = parseFieldErrors(error);

        // If we have field-specific errors, use them
        if (Object.keys(fieldErrors).length > 0) {
          setErrors({
            ...fieldErrors,
            general: parseErrorMessage(error, 'Login failed. Please check your credentials.')
          });
        } else {
          // Otherwise, show general error
          setErrors({
            general: parseErrorMessage(error, 'Login failed. Please check your credentials.')
          });
        }
      }
    }
  };

  return (
    <div className="h-screen flex items-center justify-center px-4 relative">
      <button onClick={() => navigate('/')} className="btn-secondary absolute top-6 left-6 text-xs px-3 py-2">
        ← Back
      </button>

      <div className="w-full max-w-md">

        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <img src={kubernetesLogo} alt="Kubernetes" className="w-12 h-12" />
          <div className="text-left">
            <div className="text-xl font-bold">K8sFlow</div>
            <div className="text-xs opacity-50">Kubernetes Workflow Management</div>
          </div>
        </Link>

        <div className="panel p-8">
          <div className="mb-8">
            <h1 className="text-xl font-semibold mb-2">Sign In</h1>
            <p className="text-sm opacity-60">Access your Kubernetes workflows</p>
          </div>

          {errors.general && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-500">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium opacity-70 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium opacity-70 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5" />
                <span className="opacity-60">Remember me</span>
              </label>
              <a href="#" className="opacity-60 hover:opacity-100">Forgot password?</a>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5">
              Sign In
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--color-border-dark)] text-center text-xs">
            <span className="opacity-60">Don't have an account?</span>{' '}
            <Link to="/register" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
