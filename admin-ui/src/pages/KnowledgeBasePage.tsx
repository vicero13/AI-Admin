import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../components/ui/Toast';
import JsonEditor from '../components/knowledge/JsonEditor';
import FAQEditor from '../components/knowledge/FAQEditor';
import PolicyEditor from '../components/knowledge/PolicyEditor';
import FileUploader from '../components/dialogs/FileUploader';
import DialogPreview from '../components/dialogs/DialogPreview';
import type { DialogExample } from '../types';

const tabs = ['Business Info', 'Services', 'Team', 'FAQ', 'Policies', 'Dialogs'];

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [services, setServices] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadedDialogs, setUploadedDialogs] = useState<DialogExample[]>([]);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get('/knowledge/business-info').catch(() => ({ data: {} })),
      api.get('/knowledge/services').catch(() => ({ data: [] })),
      api.get('/knowledge/team').catch(() => ({ data: {} })),
    ]).then(([bi, srv, tm]) => {
      setBusinessInfo(bi.data);
      setServices(srv.data);
      setTeam(tm.data);
      setLoading(false);
    });
  }, []);

  const saveData = async (endpoint: string, data: unknown, setter: (d: any) => void) => {
    setSaving(true);
    try {
      await api.put(`/knowledge/${endpoint}`, data);
      setter(data);
      toast('success', `${endpoint} saved successfully.`);
      return true;
    } catch {
      toast('error', `Failed to save ${endpoint}.`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/knowledge/dialogs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedDialogs(res.data.dialogs);
      toast('info', `Parsed ${res.data.count} dialog(s). Review and import.`);
    } catch (e: any) {
      toast('error', `Upload failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleImport = async () => {
    if (uploadedDialogs.length === 0) return;
    setImporting(true);
    try {
      const res = await api.post('/knowledge/dialogs/import', { dialogs: uploadedDialogs });
      toast('success', `Imported ${res.data.added} dialog(s). Total: ${res.data.total}.`);
      setUploadedDialogs([]);
    } catch {
      toast('error', 'Failed to import dialogs.');
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading knowledge base...</div>;

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Knowledge Base</h2>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && businessInfo && (
        <JsonEditor
          data={businessInfo}
          saving={saving}
          onSave={(d) => saveData('business-info', d, setBusinessInfo)}
          title="business-info.json"
        />
      )}

      {activeTab === 1 && services && (
        <JsonEditor
          data={services}
          saving={saving}
          onSave={(d) => saveData('services', d, setServices)}
          title="services.json"
        />
      )}

      {activeTab === 2 && team && (
        <JsonEditor
          data={team}
          saving={saving}
          onSave={(d) => saveData('team', d, setTeam)}
          title="team.json"
        />
      )}

      {activeTab === 3 && <FAQEditor />}
      {activeTab === 4 && <PolicyEditor />}

      {activeTab === 5 && (
        <div>
          {uploadedDialogs.length === 0 ? (
            <FileUploader onFileSelect={handleFileUpload} />
          ) : (
            <>
              <DialogPreview dialogs={uploadedDialogs} onRemove={(i) => setUploadedDialogs((prev) => prev.filter((_, idx) => idx !== i))} />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : `Import ${uploadedDialogs.length} dialog(s)`}
                </button>
                <button
                  onClick={() => setUploadedDialogs([])}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
