import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { UrlInput } from './components/UrlInput';
import { MediaInspector } from './components/MediaInspector';
import { PlaylistModal } from './components/PlaylistModal';
import { QueueView } from './components/QueueView';
import { HistoryView } from './components/HistoryView';
import { useWebSocket } from './hooks/useWebSocket';
import { 
  MediaInfoResponse, 
  DownloadHistoryItem, 
  AppSettings 
} from './types';
import { 
  fetchMediaInfo, 
  startDownload, 
  fetchHistory, 
  fetchSettings 
} from './services/api';
import { AlertCircle, X } from 'lucide-react';

export function App() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [inspectedMedia, setInspectedMedia] = useState<MediaInfoResponse | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Load settings & history
  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchHistory();
      setHistory(data);
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadHistory();
  }, [loadSettings, loadHistory]);

  // WebSocket hook with history refresh on task completion
  const { isConnected, activeTasks, cancelTask } = useWebSocket(() => {
    loadHistory();
  });

  // Handle URL inspection
  const handleAnalyze = async (url: string) => {
    setIsInspecting(true);
    setErrorMessage(null);
    try {
      const data = await fetchMediaInfo(url);
      setInspectedMedia(data);
      if (data.is_playlist) {
        setIsPlaylistModalOpen(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to inspect link. Please verify the URL.');
    } finally {
      setIsInspecting(false);
    }
  };

  // Handle 1-click Quick Presets
  const handleQuickDownload = async (url: string, type: 'video' | 'audio', quality: string) => {
    setErrorMessage(null);
    try {
      await startDownload({
        url,
        media_type: type,
        quality,
        audio_format: 'mp3',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not queue download');
    }
  };

  // Handle customized download
  const handleDownload = async (params: {
    url: string;
    media_type: 'video' | 'audio';
    quality: string;
    audio_format: string;
  }) => {
    setErrorMessage(null);
    try {
      await startDownload(params);
      setInspectedMedia(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not queue download');
    }
  };

  // Handle batch download from playlist modal
  const handleDownloadBatch = async (params: {
    url: string;
    media_type: 'video' | 'audio';
    quality: string;
    audio_format: string;
    selected_indices: number[];
  }) => {
    setErrorMessage(null);
    try {
      await startDownload({
        ...params,
        is_playlist: true,
      });
      setInspectedMedia(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not queue playlist downloads');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* Header Bar */}
      <Header
        settings={settings}
        onSettingsUpdated={loadSettings}
        isDark={isDark}
        toggleTheme={toggleTheme}
        isWsConnected={isConnected}
      />

      {/* Main Content */}
      <main className="flex-grow pt-4">
        
        {/* Error Toast */}
        {errorMessage && (
          <div className="max-w-4xl mx-auto px-4 mb-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="p-1 hover:text-red-900 dark:hover:text-red-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* URL Input Bar & Quick Presets */}
        <UrlInput
          onAnalyze={handleAnalyze}
          onQuickDownload={handleQuickDownload}
          isLoading={isInspecting}
        />

        {/* Media Inspector Preview */}
        {inspectedMedia && (
          <MediaInspector
            info={inspectedMedia}
            onDownload={handleDownload}
            onOpenPlaylistModal={() => setIsPlaylistModalOpen(true)}
          />
        )}

        {/* Playlist Selection Modal */}
        {inspectedMedia && (
          <PlaylistModal
            info={inspectedMedia}
            isOpen={isPlaylistModalOpen}
            onClose={() => setIsPlaylistModalOpen(false)}
            onDownloadBatch={handleDownloadBatch}
          />
        )}

        {/* Active Queue with Real-time Progress */}
        <QueueView tasks={activeTasks} onCancel={cancelTask} />

        {/* Download History Table */}
        <HistoryView history={history} onRefresh={loadHistory} />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 text-center text-xs text-slate-400">
        <p>StreamForge • Powered by FastAPI & yt-dlp • Local Personal Downloader</p>
      </footer>
    </div>
  );
}

export default App;
