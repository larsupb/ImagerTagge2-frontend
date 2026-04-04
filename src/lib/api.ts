let sessionId: string | null = null;

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
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API error");
  }
  return res.json();
}

import type {
  DatasetInfo, MediaItem, GalleryResponse, TagCloudEntry,
  SearchReplacePreview, Settings, Tagger, Upscaler, BucketResult,
} from "./types";

export const api = {
  loadDataset: (path: string, masksPath?: string, onlyMissing = false, subdirs = false) =>
    apiFetch<DatasetInfo>("/api/dataset/load", {
      method: "POST",
      body: JSON.stringify({
        path, masks_path: masksPath,
        only_missing_captions: onlyMissing,
        include_subdirectories: subdirs,
      }),
    }),

  getItem: (index: number) =>
    apiFetch<MediaItem>(`/api/dataset/item/${index}`),

  getGallery: (page = 0, pageSize = 50) =>
    apiFetch<GalleryResponse>(`/api/dataset/gallery?page=${page}&page_size=${pageSize}`),

  toggleBookmark: (index: number) =>
    apiFetch<{ is_bookmarked: boolean }>(`/api/dataset/bookmark/${index}`, { method: "POST" }),

  deleteItem: (index: number) =>
    apiFetch<{ total_items: number }>(`/api/dataset/item/${index}`, { method: "DELETE" }),

  renameItem: (index: number, newName: string) =>
    apiFetch<MediaItem>(`/api/dataset/item/${index}/rename?new_name=${encodeURIComponent(newName)}`, { method: "PUT" }),

  saveCaption: (index: number, caption: string) =>
    apiFetch("/api/captions/save", {
      method: "PUT",
      body: JSON.stringify({ index, caption }),
    }),

  getTagCloud: (sortBy = "frequency") =>
    apiFetch<TagCloudEntry[]>(`/api/captions/tags?sort_by=${sortBy}`),

  removeTags: (tags: string[]) =>
    apiFetch("/api/captions/tags/remove", { method: "POST", body: JSON.stringify({ tags }) }),

  appendTag: (tag: string) =>
    apiFetch("/api/captions/tags/append", { method: "POST", body: JSON.stringify({ tag }) }),

  prependTag: (tag: string) =>
    apiFetch("/api/captions/tags/prepend", { method: "POST", body: JSON.stringify({ tag }) }),

  cleanupTags: () =>
    apiFetch("/api/captions/tags/cleanup", { method: "POST" }),

  replaceUnderscores: () =>
    apiFetch("/api/captions/tags/replace-underscores", { method: "POST" }),

  searchReplacePreview: (search: string, replace: string) =>
    apiFetch<SearchReplacePreview>("/api/captions/search-replace/preview", {
      method: "POST",
      body: JSON.stringify({ search, replace }),
    }),

  searchReplaceApply: (search: string, replace: string) =>
    apiFetch("/api/captions/search-replace/apply", {
      method: "POST",
      body: JSON.stringify({ search, replace }),
    }),

  exportJsonl: () =>
    apiFetch<{ path: string; count: number }>("/api/captions/export", { method: "POST" }),

  moveToSubdir: (tags: string[], inverse: boolean, subdirectoryName: string) =>
    apiFetch("/api/captions/move-to-subdir", {
      method: "POST",
      body: JSON.stringify({ tags, inverse, subdirectory_name: subdirectoryName }),
    }),

  generateCaption: (index: number, tagger: string) =>
    apiFetch<{ caption: string }>("/api/tagging/generate", {
      method: "POST",
      body: JSON.stringify({ index, tagger }),
    }),

  upscale: (index: number, upscaler?: string, targetMp?: number) =>
    apiFetch("/api/processing/upscale", {
      method: "POST",
      body: JSON.stringify({ index, upscaler, target_megapixels: targetMp }),
    }),

  saveUpscaled: (index: number) =>
    apiFetch("/api/processing/upscale/save?index=" + index, { method: "POST" }),

  removeBackground: (index: number) =>
    apiFetch("/api/processing/remove-background?index=" + index, { method: "POST" }),

  generateMask: (index: number) =>
    apiFetch("/api/processing/mask/generate", {
      method: "POST",
      body: JSON.stringify({ index }),
    }),

  batchProcess: (options: {
    rename?: boolean; upscale?: boolean; bucket_resize?: boolean;
    mask?: boolean; caption?: boolean; tagger?: string;
  }) => {
    return getSessionId().then((sid) => {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([k, v]) => {
        if (v !== undefined) params.set(k, String(v));
      });
      const source = new EventSource(`/api/batch/process?session_id=${sid}&${params.toString()}`);
      return source;
    });
  },

  analyzeBuckets: (resolution = 1024, step = 64, maxSteps = 4) =>
    apiFetch<BucketResult>("/api/batch/analyze-buckets", {
      method: "POST",
      body: JSON.stringify({ resolution, step, max_steps: maxSteps }),
    }),

  getSettings: () => apiFetch<Settings>("/api/settings/"),
  updateSetting: (key: string, value: unknown) =>
    apiFetch("/api/settings/", { method: "PUT", body: JSON.stringify({ key, value }) }),
  getUpscalers: () => apiFetch<Upscaler[]>("/api/settings/upscalers"),
  getTaggers: () => apiFetch<Tagger[]>("/api/settings/taggers"),

  copyImages: (targetDir: string, option: string) =>
    apiFetch("/api/settings/tools/copy", {
      method: "POST",
      body: JSON.stringify({ target_directory: targetDir, copy_option: option }),
    }),

  validate: () => apiFetch("/api/settings/validation"),

  mediaUrl: getMediaUrl,
  thumbnailUrl: getThumbnailUrl,
};
