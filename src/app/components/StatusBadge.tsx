import { Badge } from './ui/badge';

interface StatusBadgeProps {
  status: 'pending' | 'assigned' | 'on-the-way' | 'in-progress' | 'completed' | 'cancelled' | 'accepted';
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  assigned: { label: 'Assigned', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  'on-the-way': { label: 'On the way', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
  'in-progress': { label: 'In Progress', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  accepted: { label: 'Accepted', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}
