import { MediaInfoResponse, DownloadTask, DownloadHistoryItem, AppSettings } from '../types';

const API_BASE = '/api';

export async function fetchMediaInfo(url: string): Promise<MediaInfoResponse> {
  const res = await fetch(`${API_BASE}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to inspect URL' }));
    throw new Error(errorData.detail || 'Failed to inspect URL');
  }
  return res.json();
}

export async function startDownload(params: {
  url: string;
  media_type: 'video' | 'audio';
  quality: string;
  audio_format?: string;
  download_dir?: string;
  is_playlist?: boolean;
  selected_indices?: number[];
}): Promise<{ success: boolean; task_ids: string[] }> {
  const res = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to queue download' }));
    throw new Error(errorData.detail || 'Failed to queue download');
  }
  return res.json();
}

export async function cancelDownload(taskId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success;
}

export async function fetchActiveTasks(): Promise<DownloadTask[]> {
  const res = await fetch(`${API_BASE}/tasks`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchHistory(): Promise<DownloadHistoryItem[]> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) return [];
  return res.json();
}

export async function deleteHistoryItem(id: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function clearAllHistory(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/history/clear`, { method: 'POST' });
  return res.ok;
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function updateSettings(downloadDir: string): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ download_dir: downloadDir }),
  });
  if (!res.ok) throw new Error('Failed to update download folder');
  return res.json();
}

export async function openFolder(path?: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/open-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  return res.ok;
}

export async function installFFmpeg(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/ffmpeg/install`, { method: 'POST' });
  return res.ok;
}
