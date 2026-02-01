interface SaveButtonProps {
  saving: boolean;
  onClick: () => void;
  label?: string;
}

export default function SaveButton({ saving, onClick, label = 'Save' }: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {saving ? 'Saving...' : label}
    </button>
  );
}
