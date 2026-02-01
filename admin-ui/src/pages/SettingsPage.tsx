import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../components/ui/Toast';
import SaveButton from '../components/ui/SaveButton';
import ServerSection from '../components/config/ServerSection';
import AISection from '../components/config/AISection';
import PersonalitySection from '../components/config/PersonalitySection';
import SituationDetectionSection from '../components/config/SituationDetectionSection';
import HandoffSection from '../components/config/HandoffSection';
import TelegramSection from '../components/config/TelegramSection';
import RedisSection from '../components/config/RedisSection';
import DatabaseSection from '../components/config/DatabaseSection';
import LoggingSection from '../components/config/LoggingSection';

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    api.get('/settings').then((res) => {
      setConfig(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleChange = (path: string, value: unknown) => {
    setConfig((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let target = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = value;
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', config);
      toast('success', 'Configuration saved successfully.');
    } catch (e: any) {
      toast('error', `Failed to save: ${e.response?.data?.error || e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading configuration...</div>;
  if (!config) return <div className="text-red-500">Failed to load configuration</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <SaveButton saving={saving} onClick={handleSave} />
      </div>

      <div className="space-y-3">
        <ServerSection data={config.server || {}} onChange={handleChange} />
        <AISection data={config.ai || {}} onChange={handleChange} />
        <PersonalitySection data={config.personality || {}} onChange={handleChange} />
        <SituationDetectionSection data={config.situationDetection || {}} onChange={handleChange} />
        <HandoffSection data={config.handoff || {}} onChange={handleChange} />
        <TelegramSection data={config.telegram || {}} onChange={handleChange} />
        <RedisSection data={config.redis || {}} onChange={handleChange} />
        <DatabaseSection data={config.database || {}} onChange={handleChange} />
        <LoggingSection data={config.logging || {}} onChange={handleChange} />
      </div>

      <div className="mt-6">
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}
