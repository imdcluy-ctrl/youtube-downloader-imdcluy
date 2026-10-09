export interface VideoFormatOption {
  format_id: string;
  ext: string;
  resolution?: string;
  height?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  note?: string;
}

export interface VideoInfoItem {
  id: string;
  url: string;
  title: string;
  uploader?: string;
  duration?: number;
  duration_string?: string;
  thumbnail?: string;
  view_count?: number;
  description?: string;
  formats: VideoFormatOption[];
}

export interface MediaInfoResponse {
  is_playlist: boolean;
  title: string;
  uploader?: string;
  item_count: number;
  thumbnail?: string;
  items: VideoInfoItem[];
}

export interface DownloadTask {
  task_id: string;
  url: string;
  title: string;
  thumbnail?: string;
  media_type: 'video' | 'audio';
  quality: string;
  audio_format: string;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  percent: number;
  speed: number;
  eta: number;
  downloaded_bytes: number;
  total_bytes: number;
  file_path?: string;
  error_message?: string;
}

export interface DownloadHistoryItem {
  id: number;
  task_id: string;
  url: string;
  title: string;
  thumbnail?: string;
  file_path?: string;
  file_size: number;
  media_type: string;
  format_desc: string;
  status: string;
  created_at: string;
  finished_at?: string;
  error_message?: string;
}

export interface AppSettings {
  download_dir: string;
  ffmpeg_available: boolean;
  ffmpeg_version?: string;
}
