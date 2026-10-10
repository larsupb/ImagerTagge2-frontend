export interface CaptionEntry {
  caption_type: string;
  content: string;
  is_active: boolean;
}

export interface ImageVersion {
  id: number;
  version_path: string;
  operation: string;
  original_width: number | null;
  original_height: number | null;
  original_size: number | null;
  created_at: string;
}

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
  captions: CaptionEntry[];
  category: string | null;
}

export interface GalleryItem {
  index: number;
  thumbnail_url: string;
  thumb_token: string;
  filename: string;
  is_bookmarked: boolean;
  has_caption: boolean;
  width: number | null;
  height: number | null;
  category: string | null;
  attributes?: AttributeMap;
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
  ignore_list: string[];
  upscaler: string;
  upscale_target_megapixels: number;
  default_tagger: string;
  tagger_instruction: string;
  combo_taggers: string[];
  florence_settings: { prompt: string };
  rembg: { model: string };
  white_balance_method?: string;
  vlm_endpoint: {
    api_key: string;
    base_url: string;
    model: string;
    prompt: string;
    target_megapixels: number;
    temperature: number;
    top_p: number;
    max_tokens: number;
  };
  llm_endpoint: {
    api_key: string;
    base_url: string;
    model: string;
  };
  comfyui?: {
    url?: string;
    api_token?: string;
    workflow_file?: string;
  };
  comfyui_fparams?: Record<string, Record<string, unknown>>;
}

export interface Tagger {
  id: string;
  name: string;
  description: string;
}

export interface TaggersResponse {
  taggers: Tagger[];
  default_tagger: string;
}

export interface WorkflowParam {
  key: string;
  label: string;
  type: "float" | "int" | "select" | "text";
  node_id: string;
  input_name: string;
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  hint?: string;
}

export interface Upscaler {
  name: string;
  filename: string | null;
  scale_factor: number;
  url: string | null;
  workflow_file?: string | null;
  display_name?: string | null;
  params?: WorkflowParam[];
}

export interface BackgroundRemover {
  name: string;
  description: string;
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

export interface ColorMatchPreviewItem {
  index: number;
  filename: string;
  before: string;
  after: string;
}

export interface ColorMatchPreviewResult {
  previews: ColorMatchPreviewItem[];
}

export interface ColorMatchMethod {
  id: string;
  name: string;
}

export interface TaskLogEntry {
  index: number;
  filename: string;
  message: string;
}

export type JobStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface BatchTask {
  task_id: string;
  name: string;
  operation: string;
  project_name: string | null;
  status: JobStatus;
  progress: number;
  current_index: number;
  current_filename: string | null;
  total: number;
  logs: TaskLogEntry[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export type Job = BatchTask;

export interface DedupImageInfo {
  index: number;
  filename: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  thumbnail_url: string;
  path: string;
}

export interface DedupGroup {
  images: DedupImageInfo[];
  keep_index: number;
}

export interface DedupScanResponse {
  groups: DedupGroup[];
}

export type PaintTool = "pencil" | "quad" | "eraser";

export interface AttributeSpec {
  applies_to: "all" | "person";
  values: string[];
}

export type AttributeSchema = Record<string, AttributeSpec>;

export type AttributeMap = Record<string, string>;

export type AttributeFootprint = Record<string, Record<string, number>>;

export interface AttributeQueryItem {
  id: number;
  index: number | null;
  filename: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  is_bookmarked: boolean;
  attributes: AttributeMap;
  captions: Record<string, string>;
}

export interface AttributeQueryResponse {
  total: number;
  items: AttributeQueryItem[];
}
