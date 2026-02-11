import { Link } from 'react-router-dom';
import kubernetesLogo from '../assets/Kubernetes_logo_without_workmark.svg';
import { Button } from '../components/ui/button';

const features = [
  {
    title: 'Visual Workflow Builder',
    description: 'Drag-and-drop interface to create complex Kubernetes deployments without writing YAML.',
  },
  {
    title: 'One-Click Deploy',
    description: 'Deploy your workflows to any connected cluster with a single click.',
  },
  {
    title: 'Multi-Cluster Support',
    description: 'Manage multiple Kubernetes clusters from a single unified dashboard.',
  },
  {
    title: 'Real-Time Monitoring',
    description: 'Track deployment status and resource utilization in real-time.',
  },
];

export default function LandingPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="panel border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={kubernetesLogo} alt="Kubernetes" className="w-10 h-10" />
          <div>
            <h1 className="text-lg font-bold">K8sFlow</h1>
            <p className="text-xs opacity-50">Kubernetes Workflow Management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="secondary">
            <Link to="/login">
              Sign In
            </Link>
          </Button>
          <Button asChild>
            <Link to="/register">
              Get Started
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--color-border-dark)] mb-6 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="opacity-70">Beta • Free during early access</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Kubernetes Workflow Management
          </h1>
          
          <p className="text-lg opacity-70 max-w-2xl mx-auto mb-10">
            Visual workflow builder for Kubernetes deployments. Manage multiple clusters, 
            create workflows without YAML, and deploy with confidence.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link to="/register">
                Get Started
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-8 py-12">
          <h2 className="text-xs font-semibold opacity-50 uppercase mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="panel p-6">
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm opacity-70 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="max-w-6xl mx-auto px-8 py-12 border-t border-[var(--color-border-dark)]">
          <h2 className="text-xs font-semibold opacity-50 uppercase mb-6">Built For</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm opacity-70">
            <div className="panel p-4 text-center">Kubernetes</div>
            <div className="panel p-4 text-center">Docker</div>
            <div className="panel p-4 text-center">Helm</div>
            <div className="panel p-4 text-center">Multi-Cloud</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="panel border-t px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs opacity-50">
          <div className="flex items-center gap-2">
            <img src={kubernetesLogo} alt="Kubernetes" className="w-5 h-5 opacity-50" />
            <span>© 2026 K8sFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:opacity-100 transition-opacity">Documentation</a>
            <a href="#" className="hover:opacity-100 transition-opacity">GitHub</a>
          </div>
        </div>
      </div>
    </div>
  );
}
