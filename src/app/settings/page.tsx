"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProjectStore } from "@/stores/projectStore";
import { api } from "@/lib/api";
import type { Settings, Tagger, Upscaler, WorkflowParam } from "@/lib/types";
import EmptyState from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

function ParamControl({
  param,
  value,
  onChange,
}: {
  param: WorkflowParam;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `param-${param.key}`;

  if (param.type === "float" || param.type === "int") {
    const min = param.min ?? 0;
    const max = param.max ?? 100;
    const step = param.step ?? 1;
    const numValue = Number(value ?? param.default);

    return (
      <div className="flex flex-col gap-1">
        <label className="block text-sm text-text-secondary" htmlFor={id}>
          {param.label}
          {param.hint && (
            <span className="ml-2 text-xs text-text-muted">({param.hint})</span>
          )}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            id={id}
            min={min}
            max={max}
            step={step}
            value={numValue}
            onChange={(e) =>
              onChange(param.type === "int" ? parseInt(e.target.value) : parseFloat(e.target.value))
            }
            className="flex-1"
          />
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={numValue}
            onChange={(e) =>
              onChange(param.type === "int" ? parseInt(e.target.value) : parseFloat(e.target.value))
            }
            className="w-20 px-2 py-1 bg-background border border-border rounded text-sm text-text text-right"
          />
        </div>
      </div>
    );
  }

  if (param.type === "select") {
    return (
      <div className="flex flex-col gap-1">
        <label className="block text-sm text-text-secondary" htmlFor={id}>
          {param.label}
        </label>
        <select
          id={id}
          value={String(value ?? param.default)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-1.5 bg-background border border-border rounded text-sm text-text focus:outline-none focus:border-ring"
        >
          {param.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (param.type === "text") {
    return (
      <div className="flex flex-col gap-1">
        <label className="block text-sm text-text-secondary" htmlFor={id}>
          {param.label}
        </label>
        <textarea
          id={id}
          value={String(value ?? param.default)}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text resize-y focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
        />
      </div>
    );
  }

  return null;
}

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-surface rounded-lg border border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-surface-raised transition-colors rounded-lg"
      >
        <h3 className="text-base font-medium text-text">{title}</h3>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        )}
      </button>
      {isOpen && <div className="px-6 pb-6 flex flex-col gap-4">{children}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error } = useQuery({ queryKey: ["settings"], queryFn: () => api.getSettings() });
  const { data: upscalers } = useQuery({ queryKey: ["upscalers"], queryFn: () => api.getUpscalers() });
  const { data: taggersResponse } = useQuery({ queryKey: ["taggers"], queryFn: () => api.getTaggers() });

  const [localSettings, setLocalSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No project open"
        description="Open a project to view settings."
      />
    );
  }

  if (isLoading) {
    return <div className="text-text-muted text-center py-12">Loading settings...</div>;
  }

  if (error) {
    return (
      <div className="text-destructive text-center py-12">
        Error loading settings: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!localSettings) {
    return <div className="text-text-muted text-center py-12">No settings available</div>;
  }

  const save = async (key: string, value: unknown) => {
    try {
      await api.updateSetting(key, value);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Setting saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save setting");
    }
  };

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <Section title="Upscaling" defaultOpen>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Upscaler</label>
          <Select
            value={localSettings.upscaler || undefined}
            onValueChange={(v) => {
              if (v) {
                setLocalSettings({ ...localSettings, upscaler: v });
                save("upscaler", v);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {upscalers?.map((u) => (
                <SelectItem key={(u.display_name ?? u.name)} value={(u.display_name ?? u.name)}>
                  {(u.display_name ?? u.name)} ({u.scale_factor}x)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Upscale Target (megapixels)
          </label>
          <Input
            type="number"
            step="0.5"
            value={localSettings.upscale_target_megapixels}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalSettings({ ...localSettings, upscale_target_megapixels: v });
              save("upscale_target_megapixels", v);
            }}
            className="w-32"
          />
        </div>

        {localSettings.upscaler?.startsWith("comfyui-") && (
          upscalers?.find((u) => u.name === localSettings.upscaler)?.params && (
            <div className="mt-4 p-4 bg-surface-raised rounded-lg border border-border flex flex-col gap-4">
              <h4 className="text-sm font-medium text-text">Workflow Parameters</h4>
              {(upscalers?.find((u) => u.name === localSettings.upscaler)?.params ?? []).map((param) => {
                const currentValues = localSettings.comfyui_fparams?.[localSettings.upscaler!] ?? {};
                const value = currentValues[param.key] ?? param.default;

                return (
                  <ParamControl
                    key={param.key}
                    param={param}
                    value={value}
                    onChange={(newVal) => {
                      const nextFparams = {
                        ...(localSettings.comfyui_fparams ?? {}),
                        [localSettings.upscaler!]: {
                          ...(localSettings.comfyui_fparams?.[localSettings.upscaler!] ?? {}),
                          [param.key]: newVal,
                        },
                      };
                      setLocalSettings({ ...localSettings, comfyui_fparams: nextFparams });
                      save("comfyui_fparams", nextFparams);
                    }}
                  />
                );
              })}
            </div>
          )
        )}
      </Section>

      <Section title="Taggers">
        <div>
          <label className="block text-sm text-text-secondary mb-2">Default Tagger</label>
          <select
            value={localSettings?.default_tagger ?? "florence"}
            onChange={(e) => {
              save("default_tagger", e.target.value);
            }}
            className="w-48 px-3 py-1.5 bg-background border border-border rounded text-sm text-text focus:outline-none focus:border-ring"
          >
            {taggersResponse?.taggers.map((t: Tagger) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-2">Combo Taggers</label>
          <div className="flex flex-wrap gap-4">
            {taggersResponse?.taggers.filter((t: Tagger) => t.id !== "combo").map((t: Tagger) => (
              <label key={t.id} className="flex items-center gap-2 text-sm text-text">
                <Checkbox
                  checked={localSettings.combo_taggers.includes(t.id)}
                  onCheckedChange={(checked) => {
                    const next = checked
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
          <label className="block text-sm text-text-secondary mb-1">
            Tagger Instruction
          </label>
          <textarea
            value={localSettings.tagger_instruction}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, tagger_instruction: e.target.value })
            }
            onBlur={() => save("tagger_instruction", localSettings.tagger_instruction)}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text resize-y focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
          />
        </div>
      </Section>

      <Section title="Florence">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Florence Prompt</label>
          <Select
            value={localSettings.florence_settings.prompt || undefined}
            onValueChange={(v) => {
              if (v) {
                const next = { prompt: v };
                setLocalSettings({ ...localSettings, florence_settings: next });
                save("florence_settings", next);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="<GENERATE_PROMPT>">Generate Prompt</SelectItem>
              <SelectItem value="<DETAILED_CAPTION>">Detailed Caption</SelectItem>
              <SelectItem value="<MORE_DETAILED_CAPTION>">More Detailed Caption</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="Background Removal">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Model</label>
          <Select
            value={localSettings.rembg.model || undefined}
            onValueChange={(v) => {
              if (v) {
                const next = { model: v };
                setLocalSettings({ ...localSettings, rembg: next });
                save("rembg", next);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="u2net_human_seg">u2net_human_seg</SelectItem>
              <SelectItem value="u2net">u2net</SelectItem>
              <SelectItem value="u2net_cloth_seg">u2net_cloth_seg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="White Balance">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Default Method</label>
          <Select
            value={localSettings.white_balance_method || "gray_world"}
            onValueChange={(v) => {
              if (v) {
                setLocalSettings({ ...localSettings, white_balance_method: v });
                save("white_balance_method", v);
              }
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gray_world">Gray World</SelectItem>
              <SelectItem value="shades_of_gray">Shades of Gray</SelectItem>
              <SelectItem value="gray_edge">Gray Edge</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="VLM Endpoint (Image Tagging)">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Base URL</label>
          <Input
            value={localSettings.vlm_endpoint.base_url}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                vlm_endpoint: { ...localSettings.vlm_endpoint, base_url: e.target.value },
              })
            }
            onBlur={() => save("vlm_endpoint", localSettings.vlm_endpoint)}
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Model</label>
          <Input
            value={localSettings.vlm_endpoint.model}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                vlm_endpoint: { ...localSettings.vlm_endpoint, model: e.target.value },
              })
            }
            onBlur={() => save("vlm_endpoint", localSettings.vlm_endpoint)}
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">API Key</label>
          <Input
            type="password"
            value={localSettings.vlm_endpoint.api_key}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                vlm_endpoint: { ...localSettings.vlm_endpoint, api_key: e.target.value },
              })
            }
            onBlur={() => save("vlm_endpoint", localSettings.vlm_endpoint)}
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Prompt</label>
          <textarea
            value={localSettings.vlm_endpoint.prompt}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                vlm_endpoint: { ...localSettings.vlm_endpoint, prompt: e.target.value },
              })
            }
            onBlur={() => save("vlm_endpoint", localSettings.vlm_endpoint)}
            rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text resize-y focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
          />
        </div>
      </Section>

      <Section title="LLM Endpoint (PromptGen)">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Host (Base URL)</label>
          <Input
            value={localSettings.llm_endpoint.base_url}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                llm_endpoint: { ...localSettings.llm_endpoint, base_url: e.target.value },
              })
            }
            onBlur={() => save("llm_endpoint", localSettings.llm_endpoint)}
            placeholder="http://localhost:11434/v1"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Model</label>
          <Input
            value={localSettings.llm_endpoint.model}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                llm_endpoint: { ...localSettings.llm_endpoint, model: e.target.value },
              })
            }
            onBlur={() => save("llm_endpoint", localSettings.llm_endpoint)}
            placeholder="qwen3:32b"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">API Key</label>
          <Input
            type="password"
            value={localSettings.llm_endpoint.api_key}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                llm_endpoint: { ...localSettings.llm_endpoint, api_key: e.target.value },
              })
            }
            onBlur={() => save("llm_endpoint", localSettings.llm_endpoint)}
            placeholder="Leave empty for local endpoints"
          />
        </div>
      </Section>

      <Section title="ComfyUI">
        <div>
          <label className="block text-sm text-text-secondary mb-1">ComfyUI URL</label>
          <Input
            value={localSettings.comfyui?.url ?? "http://localhost:8188"}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                comfyui: { ...(localSettings.comfyui ?? {}), url: e.target.value },
              })
            }
            onBlur={() => {
              const cu = localSettings.comfyui;
              if (cu) save("comfyui", { url: cu.url, api_token: cu.api_token ?? "", workflow_file: cu.workflow_file ?? "" });
            }}
            placeholder="http://localhost:8188"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">API Token</label>
          <Input
            type="password"
            value={localSettings.comfyui?.api_token ?? ""}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                comfyui: { ...(localSettings.comfyui ?? {}), api_token: e.target.value },
              })
            }
            onBlur={() => {
              const cu = localSettings.comfyui;
              if (cu) save("comfyui", { url: cu.url ?? "http://localhost:8188", api_token: cu.api_token, workflow_file: cu.workflow_file ?? "" });
            }}
            placeholder="Leave empty if not configured"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Workflow</label>
          <Select
            value={
              upscalers?.find((u) => u.workflow_file && u.name.startsWith("comfyui-"))?.workflow_file ?? ""
            }
            onValueChange={(v) => {
              if (!v) return;
              const matched = upscalers?.find((u) => u.workflow_file === v);
              if (matched) {
                setLocalSettings({ ...localSettings, upscaler: matched.name, comfyui: { ...(localSettings.comfyui ?? {}), workflow_file: v } });
                save("upscaler", matched.name);
                save("comfyui", { ...(localSettings.comfyui ?? {}), workflow_file: v });
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select workflow" />
            </SelectTrigger>
            <SelectContent>
              {upscalers
                ?.filter((u) => u.workflow_file)
                .map((u) => (
                  <SelectItem key={(u.display_name ?? u.name)} value={u.workflow_file!}>
                    {(u.display_name ?? u.name)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-text-muted">
          Select a ComfyUI upscaler from the Upscaling section above, or choose a workflow here.
          ComfyUI must be running at the configured URL with the required models installed.
        </p>
      </Section>
    </div>
  );
}
