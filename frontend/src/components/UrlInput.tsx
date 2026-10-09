import React, { useState } from 'react';
import { Search, Sparkles, Music, Film, Clapperboard, Loader2, Clipboard } from 'lucide-react';

interface UrlInputProps {
  onAnalyze: (url: string) => void;
  onQuickDownload: (url: string, type: 'video' | 'audio', quality: string) => void;
  isLoading: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({
  onAnalyze,
  onQuickDownload,
  isLoading
}) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onAnalyze(url.trim());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.includes('http')) {
        setUrl(text.trim());
        onAnalyze(text.trim());
      }
    } catch (err) {
      console.log('Clipboard permission not granted or empty');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
        
        {/* Main URL Bar */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 relative">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube video or playlist link here..."
              disabled={isLoading}
              className="w-full pl-11 pr-24 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all shadow-inner"
            />
            {/* Paste Button inside bar */}
            <button
              type="button"
              onClick={handlePaste}
              title="Paste from clipboard"
              className="absolute inset-y-1.5 right-2 px-2.5 flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Paste</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 text-white font-semibold rounded-xl shadow-lg shadow-rose-600/30 transition-all flex-shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Inspecting...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Inspect Media</span>
              </>
            )}
          </button>
        </form>

        {/* 1-Click Quick Presets */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Quick 1-Click Presets:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isLoading || !url.trim()}
              onClick={() => onQuickDownload(url.trim(), 'video', '1080p')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors disabled:opacity-40"
            >
              <Film className="w-3.5 h-3.5 text-rose-500" />
              1080p MP4
            </button>
            <button
              type="button"
              disabled={isLoading || !url.trim()}
              onClick={() => onQuickDownload(url.trim(), 'video', '2160p')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors disabled:opacity-40"
            >
              <Clapperboard className="w-3.5 h-3.5 text-indigo-500" />
              Best 4K Video
            </button>
            <button
              type="button"
              disabled={isLoading || !url.trim()}
              onClick={() => onQuickDownload(url.trim(), 'audio', '320kbps')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors disabled:opacity-40"
            >
              <Music className="w-3.5 h-3.5 text-emerald-500" />
              320k MP3 Audio
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
