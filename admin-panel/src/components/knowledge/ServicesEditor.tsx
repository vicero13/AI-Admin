import { useKnowledgeBase } from '../../hooks/useKnowledgeBase';
import JsonEditor from './JsonEditor';

export default function ServicesEditor() {
  const { data, loading, saving, error, save } = useKnowledgeBase<any>('services');

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return <JsonEditor data={data} saving={saving} onSave={save} title="services.json" />;
}
