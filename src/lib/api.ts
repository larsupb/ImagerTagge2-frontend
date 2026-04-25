import type {
  DatasetInfo,
  MediaItem,
  GalleryResponse,
  TagCloudEntry,
  SearchReplacePreview,
  Settings,
  Tagger,
  TaggersResponse,
  Upscaler,
  BackgroundRemover,
  BucketResult,
  ProjectOpenResponse,
  ActiveProjectsResponse,
  RecentProjectsResponse,
  ImageVersion,
  ColorMatchPreviewResult,
  BatchTask,
} from "./types";
import { toast } from "sonner";
import { useProjectStore } from "@/stores/projectStore";

let sessionId: string | null = null;

export function setSessionId(id: string | null) {
  sessionId = id;
}

export function getCurrentSessionId(): string | null {
  return sessionId;
}

function clearSession() {
  sessionId = null;
  useProjectStore.getState().reset();
}

export async function getSessionId(): Promise<string> {
  if (sessionId) return sessionId;
  const res = await fetch("/api/dataset/session", { method: "POST" });
  const data = await res.json();
  sessionId = data.session_id;
  return sessionId!;
}

export function getMediaUrl(index: number): string {
  return `/api/media/file/${index}?session_id=${sessionId}`;
}

export function getThumbnailUrl(index: number): string {
  return `/api/media/thumbnail/${index}?session_id=${sessionId}`;
}

export function getMaskUrl(index: number): string {
  return `/api/media/mask/${index}?session_id=${sessionId}`;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const sid = await getSessionId();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sid,
      ...options.headers,
    },
  });
  if (res.status === 401) {
    toast.warning("Session expired, please open your project again");
    clearSession();
    window.location.href = "/browse";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API error");
  }
  return res.json();
}

export const api = {
  // Project management
  openProject: (path: string, onlyMissing = false, subdirs = false) =>
    fetch("/api/projects/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path,
        only_missing_captions: onlyMissing,
        include_subdirectories: subdirs,
      }),
    }).then((res) => {
      if (!res.ok) throw new Error("Failed to open project");
      return res.json() as Promise<ProjectOpenResponse>;
    }),

  closeProject: (sessionId: string) =>
    fetch(`/api/projects/${sessionId}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) throw new Error("Failed to close project");
      return res.json();
    }),

  getActiveProjects: () =>
    fetch("/api/projects/").then((res) => {
      if (!res.ok) throw new Error("Failed to get active projects");
      return res.json() as Promise<ActiveProjectsResponse>;
    }),

  getRecentProjects: (limit = 10) =>
    fetch(`/api/projects/recent?limit=${limit}`).then((res) => {
      if (!res.ok) throw new Error("Failed to get recent projects");
      return res.json() as Promise<RecentProjectsResponse>;
    }),

  // Dataset (backward compatible)
  loadDataset: (path: string, onlyMissing = false, subdirs = false) =>
    apiFetch<DatasetInfo>("/api/dataset/load", {
      method: "POST",
      body: JSON.stringify({
        path,
        only_missing_captions: onlyMissing,
        include_subdirectories: subdirs,
      }),
    }),

  getItem: (index: number) => apiFetch<MediaItem>(`/api/dataset/item/${index}`),

  getDatasetInfo: () => apiFetch<DatasetInfo>("/api/dataset/info"),

  getHistogram: (index: number) =>
    apiFetch<{ l: number[]; a: number[]; b: number[] }>(`/api/dataset/histogram/${index}`),

  getGallery: (page = 0, pageSize = 50) =>
    apiFetch<GalleryResponse>(`/api/dataset/gallery?page=${page}&page_size=${pageSize}`),

  toggleBookmark: (index: number) =>
    apiFetch<{ is_bookmarked: boolean }>(`/api/dataset/bookmark/${index}`, { method: "POST" }),

  deleteItem: (index: number) =>
    apiFetch<{ total_items: number }>(`/api/dataset/item/${index}`, { method: "DELETE" }),

  uploadImages: async (files: File[]): Promise<{ added: Array<{ index: number; filename: string }>; total_items: number }> => {
    const sid = await getSessionId();
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch("/api/dataset/upload", {
      method: "POST",
      headers: { "X-Session-ID": sid },
      body: formData,
    });
    if (res.status === 401) {
      toast.warning("Session expired, please open your project again");
      clearSession();
      window.location.href = "/browse";
      throw new Error("Session expired");
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || "Upload failed");
    }
    return res.json();
  },

  renameItem: (index: number, newName: string) =>
    apiFetch<MediaItem>(`/api/dataset/item/${index}/rename?new_name=${encodeURIComponent(newName)}`, {
      method: "PUT",
    }),

  // Captions
  getCaptionTypes: () => apiFetch<string[]>("/api/captions/types"),

  renameCaptionType: (oldType: string, newType: string) =>
    apiFetch<{ updated: number }>("/api/captions/types/rename", {
      method: "POST",
      body: JSON.stringify({ old_type: oldType, new_type: newType }),
    }),

  deleteCaptionType: (captionType: string) =>
    apiFetch<{ deleted: number }>("/api/captions/types/delete", {
      method: "POST",
      body: JSON.stringify({ caption_type: captionType }),
    }),

  saveCaption: async (index: number, caption: string, captionType: string = "tags") => {
    return apiFetch("/api/captions/save", {
      method: "PUT",
      body: JSON.stringify({ index, caption, caption_type: captionType }),
    });
  },

  setActiveCaptionType: async (index: number, captionType: string) => {
    return apiFetch("/api/captions/set-active", {
      method: "PUT",
      body: JSON.stringify({ index, caption_type: captionType }),
    });
  },

  exportCaptionsTxt: async (captionType: string = "tags") => {
    return apiFetch<{ count: number }>("/api/captions/export-txt", {
      method: "POST",
      body: JSON.stringify({ caption_type: captionType }),
    });
  },

  getTagCloud: (sortBy = "frequency", captionType = "tags") =>
    apiFetch<TagCloudEntry[]>(`/api/captions/tags?sort_by=${sortBy}&caption_type=${encodeURIComponent(captionType)}`),

  removeTags: (tags: string[], captionType = "tags") =>
    apiFetch("/api/captions/tags/remove", { method: "POST", body: JSON.stringify({ tags, caption_type: captionType }) }),

  appendTag: (tag: string, captionType = "tags") =>
    apiFetch("/api/captions/tags/append", { method: "POST", body: JSON.stringify({ tag, caption_type: captionType }) }),

  prependTag: (tag: string, captionType = "tags") =>
    apiFetch("/api/captions/tags/prepend", { method: "POST", body: JSON.stringify({ tag, caption_type: captionType }) }),

  cleanupTags: (captionType = "tags") =>
    apiFetch("/api/captions/tags/cleanup", { method: "POST", body: JSON.stringify({ caption_type: captionType }) }),

  replaceUnderscores: (captionType = "tags") =>
    apiFetch("/api/captions/tags/replace-underscores", { method: "POST", body: JSON.stringify({ caption_type: captionType }) }),

  searchReplacePreview: (search: string, replace: string, captionType = "tags") =>
    apiFetch<SearchReplacePreview>("/api/captions/search-replace/preview", {
      method: "POST",
      body: JSON.stringify({ search, replace, caption_type: captionType }),
    }),

  searchReplaceApply: (search: string, replace: string, captionType = "tags") =>
    apiFetch("/api/captions/search-replace/apply", {
      method: "POST",
      body: JSON.stringify({ search, replace, caption_type: captionType }),
    }),

  exportJsonl: () =>
    apiFetch<{ path: string; count: number }>("/api/captions/export", { method: "POST" }),

  moveToSubdir: (tags: string[], inverse: boolean, subdirectoryName: string, captionType = "tags") =>
    apiFetch("/api/captions/move-to-subdir", {
      method: "POST",
      body: JSON.stringify({ tags, inverse, subdirectory_name: subdirectoryName, caption_type: captionType }),
    }),

  // Categories
  getCategories: () => apiFetch<string[]>("/api/categories/"),

  setCategory: (index: number, category: string | null) =>
    apiFetch<{ category: string | null }>(`/api/categories/item/${index}`, {
      method: "PUT",
      body: JSON.stringify({ category }),
    }),

  setBulkCategory: (indices: number[], category: string | null) =>
    apiFetch<{ updated: number; category: string | null }>("/api/categories/bulk", {
      method: "POST",
      body: JSON.stringify({ indices, category }),
    }),

  renameCategory: (oldName: string, newName: string) =>
    apiFetch("/api/categories/rename", {
      method: "POST",
      body: JSON.stringify({ old_name: oldName, new_name: newName }),
    }),

  deleteCategory: (name: string) =>
    apiFetch(`/api/categories/${encodeURIComponent(name)}`, { method: "DELETE" }),

  // Tagging
  generateCaption: (index: number, tagger: string) =>
    apiFetch<{ caption: string }>("/api/tagging/generate", {
      method: "POST",
      body: JSON.stringify({ index, tagger }),
    }),

  // Processing
  upscale: (index: number, upscaler?: string, targetMp?: number) =>
    apiFetch("/api/processing/upscale", {
      method: "POST",
      body: JSON.stringify({ index, upscaler, target_megapixels: targetMp }),
    }),

  saveUpscaled: (index: number) =>
    apiFetch("/api/processing/upscale/save?index=" + index, { method: "POST" }),

  removeBackground: (index: number, model?: string) =>
    apiFetch("/api/processing/remove-background?index=" + index + (model ? "&model=" + model : ""), { method: "POST" }),

  generateMask: (index: number) =>
    apiFetch("/api/processing/mask/generate", {
      method: "POST",
      body: JSON.stringify({ index }),
    }),

  crop: async (index: number, x: number, y: number, width: number, height: number) => {
    return apiFetch("/api/processing/crop", {
      method: "POST",
      body: JSON.stringify({ index, x, y, width, height }),
    });
  },

  whiteBalance: async (index: number, method: string) => {
    return apiFetch("/api/processing/white-balance", {
      method: "POST",
      body: JSON.stringify({ index, method }),
    });
  },

  getVersions: async (index: number) => {
    return apiFetch<ImageVersion[]>(`/api/processing/versions/${index}`);
  },

  getVersionImageUrl: (versionId: number, projectId: string) => {
    return `/api/media/version/${versionId}?session_id=${projectId}`;
  },

  restoreVersion: async (versionId: number, index: number) => {
    return apiFetch(`/api/processing/versions/${versionId}/restore?index=${index}`, {
      method: "POST",
    });
  },

  deleteVersion: async (versionId: number) => {
    return apiFetch(`/api/processing/versions/${versionId}`, {
      method: "DELETE",
    });
  },

  // Batch
  batchProcess: (options: Record<string, unknown>) => {
    return getSessionId().then((sid) => {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([k, v]) => {
        if (v !== undefined) params.set(k, String(v));
      });
      const source = new EventSource(`/api/batch/process?session_id=${sid}&${params.toString()}`);
      return source;
    });
  },

  startBatchTask: async (options: Record<string, unknown>): Promise<{ task_id: string }> => {
    const sid = await getSessionId();
    const response = await fetch("/api/batch/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": sid,
      },
      body: JSON.stringify(options),
    });
    if (!response.ok) {
      throw new Error(`Failed to start batch: ${response.statusText}`);
    }
    return response.json();
  },

  getTaskStatus: async (taskId: string): Promise<BatchTask> => {
    const sid = await getSessionId();
    const response = await fetch(`/api/tasks/${taskId}`, {
      headers: { "X-Session-ID": sid },
    });
    if (!response.ok) {
      throw new Error(`Task not found: ${response.statusText}`);
    }
    return response.json();
  },

  analyzeBuckets: (resolution = 1024, step = 64, maxSteps = 4) =>
    apiFetch<BucketResult>("/api/batch/analyze-buckets", {
      method: "POST",
      body: JSON.stringify({ resolution, step, max_steps: maxSteps }),
    }),

  previewColorMatch: (method: string, reference: number, sampleCount = 4) =>
    apiFetch<ColorMatchPreviewResult>("/api/batch/preview-color-match", {
      method: "POST",
      body: JSON.stringify({ method, reference, sample_count: sampleCount }),
    }),

  previewWhiteBalance: (method: string, sampleCount = 4) =>
    apiFetch<ColorMatchPreviewResult>("/api/batch/preview-white-balance", {
      method: "POST",
      body: JSON.stringify({ method, sample_count: sampleCount }),
    }),

  // Export
  startExportTask: async (options: Record<string, unknown>): Promise<{ task_id: string }> => {
    const sid = await getSessionId();
    const response = await fetch("/api/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": sid,
      },
      body: JSON.stringify(options),
    });
    if (!response.ok) {
      throw new Error(`Failed to start export: ${response.statusText}`);
    }
    return response.json();
  },

  getExportStatus: async (taskId: string): Promise<BatchTask> => {
    const sid = await getSessionId();
    const response = await fetch(`/api/export/progress/${taskId}`, {
      headers: { "X-Session-ID": sid },
    });
    if (!response.ok) {
      throw new Error(`Task not found: ${response.statusText}`);
    }
    return response.json();
  },

  // Settings
  getSettings: () => apiFetch<Settings>("/api/settings/"),
  updateSetting: (key: string, value: unknown) =>
    apiFetch("/api/settings/", { method: "PUT", body: JSON.stringify({ key, value }) }),
  getUpscalers: () => apiFetch<Upscaler[]>("/api/settings/upscalers"),
  getBackgroundRemovers: () => apiFetch<BackgroundRemover[]>("/api/settings/background-removers"),
  getTaggers: () => apiFetch<TaggersResponse>("/api/settings/taggers"),

  // PromptGen
  generatePrompt: (captionType: string, exampleCount: number, userPrompt: string) =>
    apiFetch<{ prompt: string }>("/api/promptgen/generate", {
      method: "POST",
      body: JSON.stringify({
        caption_type: captionType,
        example_count: exampleCount,
        user_prompt: userPrompt
      }),
    }),

  // Media URLs
  mediaUrl: getMediaUrl,
  thumbnailUrl: getThumbnailUrl,
};

// Task polling exports
export async function getTaskStatus(taskId: string): Promise<BatchTask> {
  const sid = await getSessionId();
  const response = await fetch(`/api/tasks/${taskId}`, {
    headers: { "X-Session-ID": sid },
  });
  if (!response.ok) {
    throw new Error(`Task not found: ${response.statusText}`);
  }
  return response.json();
}

export async function startBatchTask(options: Record<string, unknown>): Promise<{ task_id: string }> {
  const sid = await getSessionId();
  const response = await fetch("/api/batch/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sid,
    },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    throw new Error(`Failed to start batch: ${response.statusText}`);
  }
  return response.json();
}
