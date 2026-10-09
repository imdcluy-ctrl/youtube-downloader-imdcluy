import React, { useState } from 'react';
import { 
  History, 
  FolderOpen, 
  Trash2, 
  Film, 
  Music, 
  Search, 
  CheckCircle2, 
  XCircle,
  FileText
} from 'lucide-react';
import { DownloadHistoryItem } from '../types';
import { openFolder, deleteHistoryItem, clearAllHistory } from '../services/api';

interface HistoryViewProps {
  history: DownloadHistoryItem[];
  onRefresh: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onRefresh }) => {
  const [filter, setFilter] = useState('');

  const filteredHistory = history.filter((item) =>
    (item.title || '').toLowerCase().includes(filter.toLowerCase())
  );

  const handleReveal = async (filePath?: string) => {
    await openFolder(filePath);
  };

  const handleDelete = async (id: number) => {
    await deleteHistoryItem(id);
    onRefresh();
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear your download history? (Your downloaded files on disk will not be deleted)')) {
      await clearAllHistory();
      onRefresh();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-16 px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Download History
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
              {history.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search filter */}
            {history.length > 0 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter history..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            )}

            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-slate-500 hover:text-red-600 transition-colors px-2 py-1"
              >
                Clear History
              </button>
            )}
          </div>
        </div>

        {/* List of items */}
        {history.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No download history yet.</p>
            <p className="text-xs text-slate-400 mt-1">Paste a YouTube link above to start downloading!</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No downloads match "{filter}"
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
            {filteredHistory.map((item) => {
              const isSuccess = item.status === 'completed';
              return (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    
                    {/* Thumbnail */}
                    <div className="w-14 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 relative">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          {item.media_type === 'audio' ? <Music className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        )}
                        <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {item.title || 'Untitled Download'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {item.format_desc}
                        </span>
                        {item.file_size > 0 && <span>• {formatBytes(item.file_size)}</span>}
                        <span>• {formatDate(item.created_at)}</span>
                      </div>
                    </div>

                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isSuccess && item.file_path && (
                      <button
                        type="button"
                        onClick={() => handleReveal(item.file_path)}
                        title="Show in Windows File Explorer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Show in Folder</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      title="Remove record"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
