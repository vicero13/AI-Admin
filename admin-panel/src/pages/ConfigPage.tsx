import { useConfig } from '../hooks/useConfig';
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

export default function ConfigPage() {
  const { config, loading, saving, error, saveConfig, updateField } = useConfig();
  const { toast } = useToast();

  if (loading) return <div className="text-gray-500">Loading configuration...</div>;
  if (!config) return <div className="text-red-500">Failed to load configuration: {error}</div>;

  const handleSave = async () => {
    const ok = await saveConfig(config);
    if (ok) {
      toast('success', 'Configuration saved successfully. Restart the app to apply changes.');
    } else {
      toast('error', 'Failed to save configuration. Check the server logs.');
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Changes require restarting the main application.</p>
        </div>
        <SaveButton saving={saving} onClick={handleSave} />
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="space-y-3">
        <ServerSection data={config.server} onChange={updateField} />
        <AISection data={config.ai} onChange={updateField} />
        <PersonalitySection data={config.personality} onChange={updateField} />
        <SituationDetectionSection data={config.situationDetection} onChange={updateField} />
        <HandoffSection data={config.handoff} onChange={updateField} />
        <TelegramSection data={config.telegram} onChange={updateField} />
        <RedisSection data={config.redis} onChange={updateField} />
        <DatabaseSection data={config.database} onChange={updateField} />
        <LoggingSection data={config.logging} onChange={updateField} />
      </div>

      <div className="mt-6 flex justify-end">
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}
