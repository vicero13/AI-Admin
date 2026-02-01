import { useState, useEffect } from 'react';
import api from '../../api/client';
import JsonEditor from './JsonEditor';

export default function FAQEditor() {
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/knowledge/faq').then((res) => {
      setFiles(res.data.files);
      if (res.data.files.length > 0) {
        setSelected(res.data.files[0]);
        setData(res.data.data[res.data.files[0]]);
      }
      setLoading(false);
    });
  }, []);

  const loadFile = async (filename: string) => {
    setSelected(filename);
    const res = await api.get(`/knowledge/faq/${filename}`);
    setData(res.data);
  };

  const handleSave = async (newData: unknown): Promise<boolean> => {
    setSaving(true);
    try {
      await api.put(`/knowledge/faq/${selected}`, newData);
      setData(newData);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {files.map((f) => (
          <button
            key={f}
            onClick={() => loadFile(f)}
            className={`px-3 py-1.5 text-sm rounded-lg ${selected === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {f}
          </button>
        ))}
      </div>
      {data && <JsonEditor data={data} saving={saving} onSave={handleSave} title={selected} />}
    </div>
  );
}
