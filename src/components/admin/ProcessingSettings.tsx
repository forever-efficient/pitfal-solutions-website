'use client';

import { useState, useEffect } from 'react';
import { adminProcessing, ProcessingSettings as SettingsType } from '@/lib/api';
import { useToast } from './Toast';

export function ProcessingSettings() {
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState<SettingsType>({ processingMode: 'auto', imagenProfileId: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminProcessing.getSettings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleModeToggle(mode: 'auto' | 'manual') {
    setSaving(true);
    try {
      await adminProcessing.updateSettings({ processingMode: mode });
      setSettings(prev => ({ ...prev, processingMode: mode }));
      showSuccess(`Processing mode set to ${mode}`);
    } catch {
      showError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">RAW Processing</h2>
        <a
          href="https://app.imagen-ai.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary-600 hover:text-primary-700"
        >
          ImagenAI dashboard →
        </a>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-neutral-700 mb-2">Processing mode</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleModeToggle('auto')}
              disabled={saving}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                settings.processingMode === 'auto'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
              } disabled:opacity-50`}
            >
              Auto
            </button>
            <button
              onClick={() => handleModeToggle('manual')}
              disabled={saving}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                settings.processingMode === 'manual'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
              } disabled:opacity-50`}
            >
              Manual
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-1.5">
            {settings.processingMode === 'auto'
              ? 'RAW files are processed automatically after upload.'
              : 'Upload RAW files, then click "Process Now" when ready.'}
          </p>
        </div>
        {settings.imagenProfileId && (
          <div>
            <p className="text-sm font-medium text-neutral-700">AI profile</p>
            <p className="text-sm text-neutral-500 mt-0.5 font-mono">{settings.imagenProfileId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
