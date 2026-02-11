import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import kubernetesLogo from '../assets/Kubernetes_logo_without_workmark.svg';
import axiosInstance from '../axios/interceptor';
import { useAuth } from '../context/AuthContext';
import { parseErrorMessage, parseFieldErrors } from '../utils/errorHandler';
import { Button } from '../components/ui/button';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login, token } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', acceptTerms: false });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate('/launcher', { replace: true });
    }
  }, [token, navigate]);

  const getPasswordStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  };

  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const passwordStrength = getPasswordStrength(formData.password);

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (!formData.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email';
    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < 8) e.password = 'Min 8 characters';
    if (!formData.confirmPassword) e.confirmPassword = 'Confirm password';
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!formData.acceptTerms) e.acceptTerms = 'You must accept the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = ev.target;
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validateForm()) {
      try {
        const body = new FormData();
        body.append('name', formData.name);
        body.append('email', formData.email);
        body.append('password', formData.password);

        const res = await axiosInstance.post("/api/v1/register", body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // Extract token from response (adjust based on your API response structure)
        const token = res.data.token || res.data.access_token;

        if (token) {
          login(token);
          navigate('/launcher');
        } else {
          // Registration successful but no token - redirect to login
          setErrors({ general: 'Registration successful! Please login with your credentials.' });
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch (error: unknown) {
        console.error('Registration error:', error);

        // Parse field-specific errors first
        const fieldErrors = parseFieldErrors(error);

        // If we have field-specific errors, use them
        if (Object.keys(fieldErrors).length > 0) {
          setErrors({
            ...fieldErrors,
            general: parseErrorMessage(error, 'Registration failed. Please check your information.')
          });
        } else {
          // Otherwise, show general error
          setErrors({
            general: parseErrorMessage(error, 'Registration failed. Please try again.')
          });
        }
      }
    }
  };

  return (
    <div className="h-screen flex items-center justify-center px-4 py-8 overflow-auto relative">
      <Button onClick={() => navigate('/')} variant="secondary" size="xs" className="absolute top-6 left-6">
        ← Back
      </Button>

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
            <h1 className="text-xl font-semibold mb-2">Create Account</h1>
            <p className="text-sm opacity-60">Start managing your Kubernetes workflows</p>
          </div>

          {errors.general && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-500">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium opacity-70 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium opacity-70 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3].map(l => (
                      <div key={l} className={`h-1 flex-1 rounded-full ${l < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-[var(--color-border-dark)]'}`} />
                    ))}
                  </div>
                  <p className="text-xs opacity-60">
                    {strengthLabels[passwordStrength - 1] || 'Too weak'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium opacity-70 mb-2">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="••••••••"
              />
              {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            <label className="flex items-start gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-0.5 w-3.5 h-3.5"
              />
              <span className="opacity-60">
                I agree to the <a href="#" className="text-[var(--color-accent)]">Terms of Service</a> and{' '}
                <a href="#" className="text-[var(--color-accent)]">Privacy Policy</a>
              </span>
            </label>
            {errors.acceptTerms && <p className="text-xs text-red-500">{errors.acceptTerms}</p>}

            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--color-border-dark)] text-center text-xs">
            <span className="opacity-60">Already have an account?</span>{' '}
            <Link to="/login" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
