"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Settings, Upscaler, Tagger } from "@/lib/types";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error } = useQuery({ queryKey: ["settings"], queryFn: () => api.getSettings() });
  const { data: upscalers } = useQuery({ queryKey: ["upscalers"], queryFn: () => api.getUpscalers() });
  const { data: taggers } = useQuery({ queryKey: ["taggers"], queryFn: () => api.getTaggers() });

  const [localSettings, setLocalSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  if (isLoading) {
    return <div className="text-zinc-500">Loading settings...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error loading settings: {error instanceof Error ? error.message : "Unknown error"}</div>;
  }

  if (!localSettings) {
    return <div className="text-zinc-500">No settings available</div>;
  }

  const save = async (key: string, value: unknown) => {
    await api.updateSetting(key, value);
    queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <h2 className="text-lg font-medium">Settings</h2>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Upscaler</label>
        <select
          value={localSettings.upscaler}
          onChange={(e) => { setLocalSettings({ ...localSettings, upscaler: e.target.value }); save("upscaler", e.target.value); }}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm"
        >
          {upscalers?.map((u) => (
            <option key={u.name} value={u.name}>{u.name} ({u.scale_factor}x)</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Upscale Target (megapixels)</label>
        <input
          type="number"
          step="0.5"
          value={localSettings.upscale_target_megapixels}
          onChange={(e) => { const v = Number(e.target.value); setLocalSettings({ ...localSettings, upscale_target_megapixels: v }); save("upscale_target_megapixels", v); }}
          className="w-32 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Combo Taggers</label>
        <div className="flex gap-3">
          {taggers?.filter((t) => t.id !== "combo").map((t) => (
            <label key={t.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={localSettings.combo_taggers.includes(t.id)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...localSettings.combo_taggers, t.id]
                    : localSettings.combo_taggers.filter((x) => x !== t.id);
                  setLocalSettings({ ...localSettings, combo_taggers: next });
                  save("combo_taggers", next);
                }}
              />
              {t.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Florence Prompt</label>
        <select
          value={localSettings.florence_settings.prompt}
          onChange={(e) => {
            const next = { prompt: e.target.value };
            setLocalSettings({ ...localSettings, florence_settings: next });
            save("florence_settings", next);
          }}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm"
        >
          <option value="<GENERATE_PROMPT>">Generate Prompt</option>
          <option value="<DETAILED_CAPTION>">Detailed Caption</option>
          <option value="<MORE_DETAILED_CAPTION>">More Detailed Caption</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Tagger Instruction</label>
        <textarea
          value={localSettings.tagger_instruction}
          onChange={(e) => setLocalSettings({ ...localSettings, tagger_instruction: e.target.value })}
          onBlur={() => save("tagger_instruction", localSettings.tagger_instruction)}
          rows={3}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm resize-y"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Background Removal Model</label>
        <select
          value={localSettings.rembg.model}
          onChange={(e) => {
            const next = { model: e.target.value };
            setLocalSettings({ ...localSettings, rembg: next });
            save("rembg", next);
          }}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm"
        >
          <option value="u2net_human_seg">u2net_human_seg</option>
          <option value="u2net">u2net</option>
          <option value="u2net_cloth_seg">u2net_cloth_seg</option>
        </select>
      </div>

      <div className="border border-zinc-700 rounded p-4">
        <h3 className="text-sm font-medium mb-3">OpenAI-Compatible API</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Base URL</label>
            <input
              value={localSettings.openai_settings.base_url}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                openai_settings: { ...localSettings.openai_settings, base_url: e.target.value },
              })}
              onBlur={() => save("openai_settings", localSettings.openai_settings)}
              className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Model</label>
            <input
              value={localSettings.openai_settings.model}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                openai_settings: { ...localSettings.openai_settings, model: e.target.value },
              })}
              onBlur={() => save("openai_settings", localSettings.openai_settings)}
              className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">API Key</label>
            <input
              type="password"
              value={localSettings.openai_settings.api_key}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                openai_settings: { ...localSettings.openai_settings, api_key: e.target.value },
              })}
              onBlur={() => save("openai_settings", localSettings.openai_settings)}
              className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Prompt</label>
            <textarea
              value={localSettings.openai_settings.prompt}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                openai_settings: { ...localSettings.openai_settings, prompt: e.target.value },
              })}
              onBlur={() => save("openai_settings", localSettings.openai_settings)}
              rows={2}
              className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm resize-y"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Models Directory</label>
        <input
          value={localSettings.models_dir}
          onChange={(e) => setLocalSettings({ ...localSettings, models_dir: e.target.value })}
          onBlur={() => save("models_dir", localSettings.models_dir)}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm"
        />
      </div>
    </div>
  );
}
