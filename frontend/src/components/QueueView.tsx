import React from 'react';
import { 
  X, 
  Loader2, 
  Film, 
  Music, 
  CheckCircle, 
  AlertCircle, 
  ArrowDown, 
  Gauge, 
  Hourglass,
  Layers
} from 'lucide-react';
import { DownloadTask } from '../types';

interface QueueViewProps {
  tasks: DownloadTask[];
  onCancel: (taskId: string) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB/s`;
  }
  return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
}

function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export const QueueView: React.FC<QueueViewProps> = ({ tasks, onCancel }) => {
  if (tasks.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 px-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-rose-500" />
          Active Download Queue ({tasks.length})
        </h3>
        <span className="text-xs text-slate-400">Smart Queue (Max 2 Parallel)</span>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const isDownloading = task.status === 'downloading';
          const isProcessing = task.status === 'processing';
          const isQueued = task.status === 'queued';
          const isFailed = task.status === 'failed';

          return (
            <div
              key={task.task_id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all"
            >
              {/* Progress Background bar tint */}
              <div 
                className="absolute inset-y-0 left-0 bg-rose-500/5 dark:bg-rose-500/10 pointer-events-none transition-all duration-300"
                style={{ width: `${task.percent}%` }}
              />

              <div className="relative flex items-center gap-3 sm:gap-4">
                
                {/* Thumbnail / Icon */}
                <div className="w-16 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 relative">
                  {task.thumbnail ? (
                    <img src={task.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      {task.media_type === 'audio' ? <Music className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 text-[9px] font-semibold bg-black/80 text-white px-1 rounded uppercase">
                    {task.media_type === 'audio' ? task.audio_format : task.quality}
                  </span>
                </div>

                {/* Main Content */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {task.title || 'Processing video stream...'}
                    </h4>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isQueued && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                          Queued
                        </span>
                      )}
                      {isDownloading && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 font-bold flex items-center gap-1">
                          <ArrowDown className="w-3 h-3 animate-bounce" />
                          {task.percent.toFixed(0)}%
                        </span>
                      )}
                      {isProcessing && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 font-semibold flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Merging streams...
                        </span>
                      )}
                      {isFailed && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden my-2">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isFailed 
                          ? 'bg-red-500' 
                          : isProcessing
                          ? 'bg-indigo-500 animate-pulse'
                          : 'bg-gradient-to-r from-rose-600 to-red-500'
                      }`}
                      style={{ width: `${task.percent}%` }}
                    />
                  </div>

                  {/* Live Stats */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <div className="flex items-center gap-3">
                      {task.speed > 0 && (
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-slate-400" />
                          {formatSpeed(task.speed)}
                        </span>
                      )}
                      {task.eta > 0 && (
                        <span className="flex items-center gap-1">
                          <Hourglass className="w-3 h-3 text-slate-400" />
                          ETA: {formatEta(task.eta)}
                        </span>
                      )}
                      {task.downloaded_bytes > 0 && (
                        <span>
                          {formatBytes(task.downloaded_bytes)}
                          {task.total_bytes > 0 ? ` / ${formatBytes(task.total_bytes)}` : ''}
                        </span>
                      )}
                    </div>

                    {task.error_message && (
                      <span className="text-red-500 truncate max-w-xs">{task.error_message}</span>
                    )}
                  </div>
                </div>

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => onCancel(task.task_id)}
                  title="Cancel download"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
