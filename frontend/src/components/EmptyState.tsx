import { Button } from './ui/button';

interface EmptyStateProps {
  onAddCluster: () => void;
}

export default function EmptyState({ onAddCluster }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-4">
      <div className="w-24 h-24 mb-6 opacity-30">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      
      <h2 className="text-lg font-semibold mb-2">No Clusters Connected</h2>
      <p className="text-sm opacity-60 mb-6 text-center max-w-sm">
        Add your first Kubernetes cluster to start managing deployments and workflows.
      </p>
      
      <Button onClick={onAddCluster}>
        + Add Cluster
      </Button>
    </div>
  );
}
