export interface DatasetInfo {
  total_items: number;
  base_dir: string;
  masks_dir: string | null;
}

export interface MediaItem {
  index: number;
  filename: string;
  basename: string;
  extension: string;
  is_video: boolean;
  is_image: boolean;
  has_caption: boolean;
  has_mask: boolean;
  is_bookmarked: boolean;
  width: number | null;
  height: number | null;
  file_size: number | null;
  media_url: string;
  thumbnail_url: string;
  caption: string;
}

export interface GalleryItem {
  index: number;
  thumbnail_url: string;
  filename: string;
  is_bookmarked: boolean;
}

export interface GalleryResponse {
  items: GalleryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface TagCloudEntry {
  tag: string;
  count: number;
}

export interface SearchReplacePreview {
  matches: Array<{
    index: number;
    filename: string;
    before: string;
    after: string;
  }>;
  total_matches: number;
}

export interface BatchProgress {
  index: number;
  total: number;
  filename: string;
  progress: number;
  log: string;
}

export interface Settings {
  models_dir: string;
  ignore_list: string[];
  upscaler: string;
  upscale_target_megapixels: number;
  tagger_instruction: string;
  combo_taggers: string[];
  florence_settings: { prompt: string };
  rembg: { model: string };
  openai_settings: {
    api_key: string;
    base_url: string;
    model: string;
    prompt: string;
  };
}

export interface Tagger {
  id: string;
  name: string;
  description: string;
}

export interface Upscaler {
  name: string;
  filename: string;
  scale_factor: number;
  url: string | null;
}

export interface BucketResult {
  buckets: Array<{ width: number; height: number; count: number; images: string[] }>;
  total_images: number;
}

export interface Project {
  session_id: string;
  project_id: string;
  project_name: string;
  path: string;
  total_items: number;
  current_index: number;
  created_at: number;
  last_accessed: number;
}

export interface RecentProject {
  project_id: string;
  name: string;
  path: string;
  last_opened: string;
  open_count: number;
  is_active: boolean;
}

export interface ProjectOpenResponse {
  session_id: string;
  project_id: string;
  project_name: string;
  dataset_info: {
    total_items: number;
    base_dir: string;
    masks_dir: string | null;
  };
}

export interface ActiveProjectsResponse {
  projects: Project[];
}

export interface RecentProjectsResponse {
  projects: RecentProject[];
}
