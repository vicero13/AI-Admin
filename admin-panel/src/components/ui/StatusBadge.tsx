interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning';
  label: string;
}

const colors = {
  online: 'bg-green-100 text-green-800',
  offline: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
      <span className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500' : status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'}`} />
      {label}
    </span>
  );
}
