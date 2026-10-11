"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { FlattenedSettings } from "@/lib/types";

type OverridableKey =
  | "florence_settings.prompt"
  | "vlm_endpoint.prompt"
  | "upscaler"
  | "upscale_target_megapixels"
  | "rembg.model";

const REMBG_MODELS = ["u2net_human_seg", "u2net", "u2net_cloth_seg"];

function setNested(target: Record<string, unknown>, path: string, value: unknown): void {
  const [parent, leaf] = path.includes(".") ? path.split(".") : [path, ""];
  if (!leaf) {
    target[parent] = value;
    return;
  }
  const section = {
    ...(typeof target[parent] === "object" && target[parent] !== null
      ? (target[parent] as Record<string, unknown>)
      : {}),
  };
  section[leaf] = value;
  target[parent] = section;
}

function removeNested(target: Record<string, unknown>, path: string): void {
  const [parent, leaf] = path.includes(".") ? path.split(".") : [path, ""];
  if (!leaf) {
    delete target[parent];
    return;
  }
  const section = {
    ...(typeof target[parent] === "object" && target[parent] !== null
      ? (target[parent] as Record<string, unknown>)
      : {}),
  };
  delete section[leaf];
  if (Object.keys(section).length === 0) delete target[parent];
  else target[parent] = section;
}

function Field({
  label,
  globalValue,
  overridden,
  children,
  onReset,
}: {
  label: string;
  globalValue: string | number | boolean | null | undefined;
  overridden: boolean;
  children: React.ReactNode;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-sm text-text-secondary">{label}</label>
        {overridden ? (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onReset}>
            Reset to global
          </Button>
        ) : (
          <span className="text-xs text-text-muted">global</span>
        )}
      </div>
      {children}
      {overridden && (
        <p className="text-xs text-text-muted truncate">global: {String(globalValue ?? "")}</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const projects = useProjectStore((s) => s.projects);
  const activeSessionId = useProjectStore((s) => s.activeProjectId);
  const projectId = projects.find((p) => p.session_id === activeSessionId)?.project_id ?? null;
  const queryClient = useQueryClient();

  const { data: upscalers } = useQuery({ queryKey: ["upscalers"], queryFn: () => api.getUpscalers() });
  const { data: config } = useQuery({
    queryKey: ["project-config", projectId],
    queryFn: () => api.getProjectConfig(projectId as string),
    enabled: projectId !== null,
  });

  const [draft, setDraft] = useState<Record<string, string>>({});

  const disabled = projectId === null;
  const eff: FlattenedSettings = config?.settings.effective ?? {};
  const glob: FlattenedSettings = config?.settings.global ?? {};
  const overrides = config?.settings_overrides ?? {};

  const isOverridden = (key: OverridableKey): boolean => {
    const [parent, leaf] = key.includes(".") ? key.split(".") : [key, ""];
    const section = leaf ? overrides[parent] : undefined;
    return leaf
      ? typeof section === "object" && section !== null && leaf in (section as Record<string, unknown>)
      : parent in overrides;
  };

  const save = async (key: OverridableKey, value: unknown) => {
    if (projectId === null) return;
    const next: Record<string, unknown> = { ...overrides };
    if (value === undefined) removeNested(next, key);
    else setNested(next, key, value);
    try {
      await api.updateProjectConfig(projectId, next);
      queryClient.invalidateQueries({ queryKey: ["project-config", projectId] });
      toast.success("Project setting saved");
    } catch (e) {
      toast.error(`Failed to save: ${e}`);
    }
  };

  const valueOf = (key: OverridableKey): string => draft[key] ?? String(eff[key] ?? "");

  const commitDraft = (key: OverridableKey, parse: (v: string) => unknown = (v) => v) => {
    const v = draft[key];
    if (v !== undefined && v !== String(eff[key] ?? "")) save(key, parse(v));
    setDraft((d) => {
      const n = { ...d };
      delete n[key];
      return n;
    });
  };

  if (disabled) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-text mb-2">Project Settings</h2>
        <p className="text-sm text-text-muted">Open a project to edit its settings.</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-text">Project Settings</h2>
        <p className="text-sm text-text-muted mt-1">
          Overrides for this project. Unset fields follow the global settings.
        </p>
      </div>

      <section className="bg-surface rounded-lg border border-border p-6 flex flex-col gap-4">
        <h3 className="text-base font-medium text-text">Prompts</h3>
        {(
          [
            ["florence_settings.prompt", "Florence prompt"],
            ["vlm_endpoint.prompt", "VLM caption prompt"],
          ] as const
        ).map(([key, label]) => (
          <Field
            key={key}
            label={label}
            globalValue={glob[key]}
            overridden={isOverridden(key)}
            onReset={() => save(key, undefined)}
          >
            <textarea
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text resize-y focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
              value={valueOf(key)}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              onBlur={() => commitDraft(key)}
            />
          </Field>
        ))}
      </section>

      <section className="bg-surface rounded-lg border border-border p-6 flex flex-col gap-4">
        <h3 className="text-base font-medium text-text">Processing defaults</h3>
        <Field
          label="Upscaler"
          globalValue={glob.upscaler}
          overridden={isOverridden("upscaler")}
          onReset={() => save("upscaler", undefined)}
        >
          <select
            className="w-full px-3 py-1.5 bg-background border border-border rounded text-sm text-text focus:outline-none focus:border-ring"
            value={valueOf("upscaler")}
            onChange={(e) => save("upscaler", e.target.value)}
          >
            {(upscalers ?? []).map((u) => (
              <option key={u.name} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Upscale target megapixels"
          globalValue={glob.upscale_target_megapixels}
          overridden={isOverridden("upscale_target_megapixels")}
          onReset={() => save("upscale_target_megapixels", undefined)}
        >
          <input
            type="number"
            step="0.1"
            min="0.1"
            className="w-32 px-3 py-1.5 bg-background border border-border rounded text-sm text-text focus:outline-none focus:border-ring"
            value={valueOf("upscale_target_megapixels")}
            onChange={(e) => setDraft({ ...draft, upscale_target_megapixels: e.target.value })}
            onBlur={() => commitDraft("upscale_target_megapixels", (v) => parseFloat(v))}
          />
        </Field>
        <Field
          label="Background removal model"
          globalValue={glob["rembg.model"]}
          overridden={isOverridden("rembg.model")}
          onReset={() => save("rembg.model", undefined)}
        >
          <select
            className="w-full px-3 py-1.5 bg-background border border-border rounded text-sm text-text focus:outline-none focus:border-ring"
            value={valueOf("rembg.model")}
            onChange={(e) => save("rembg.model", e.target.value)}
          >
            {REMBG_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
      </section>
    </div>
  );
}
