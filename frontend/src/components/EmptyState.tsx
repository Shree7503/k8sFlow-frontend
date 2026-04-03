import { IconFileText } from '@tabler/icons-react';
import { Button } from './ui/button';

interface EmptyStateProps {
  onAddCluster: () => void;
}

export default function EmptyState({ onAddCluster }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-4">
      <div className="mb-6 flex justify-center opacity-30">
        <IconFileText size={96} />
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
