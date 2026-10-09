import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  Sun, 
  Moon, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { AppSettings } from '../types';
import { openFolder, updateSettings, installFFmpeg } from '../services/api';

interface HeaderProps {
  settings: AppSettings | null;
  onSettingsUpdated: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  isWsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onSettingsUpdated,
  isDark,
  toggleTheme,
  isWsConnected,
}) => {
  const [isEditingDir, setIsEditingDir] = useState(false);
  const [dirInput, setDirInput] = useState('');
  const [isInstallingFFmpeg, setIsInstallingFFmpeg] = useState(false);

  const handleOpenFolder = async () => {
    await openFolder(settings?.download_dir);
  };

  const handleSaveDir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirInput.trim()) return;
    try {
      await updateSettings(dirInput.trim());
      onSettingsUpdated();
      setIsEditingDir(false);
    } catch (err) {
      alert('Failed to set folder path. Please ensure the path is valid.');
    }
  };

  const handleInstallFFmpeg = async () => {
    setIsInstallingFFmpeg(true);
    try {
      await installFFmpeg();
      onSettingsUpdated();
    } catch (err) {
      alert('Could not auto-download FFmpeg. Please install FFmpeg and add it to your Windows PATH.');
    } finally {
      setIsInstallingFFmpeg(false);
    }
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/25">
            <Download className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">StreamForge</h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Personal High-Speed YouTube Downloader</p>
          </div>
        </div>

        {/* System & Directory Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          
          {/* FFmpeg Badge */}
          {settings && (
            settings.ffmpeg_available ? (
              <div 
                title={settings.ffmpeg_version || 'FFmpeg is ready'}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-medium hidden md:inline">FFmpeg Ready</span>
              </div>
            ) : (
              <button 
                onClick={handleInstallFFmpeg}
                disabled={isInstallingFFmpeg}
                title="FFmpeg is needed for 1080p/4K merging & MP3s. Click to auto-install."
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 transition-colors"
              >
                {isInstallingFFmpeg ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="font-semibold">{isInstallingFFmpeg ? 'Installing...' : 'Get FFmpeg'}</span>
              </button>
            )
          )}

          {/* Download Directory Selector */}
          {settings && (
            <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 max-w-xs">
              <HardDrive className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <button 
                onClick={() => {
                  setDirInput(settings.download_dir);
                  setIsEditingDir(true);
                }}
                title="Click to edit destination folder"
                className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors max-w-[140px] sm:max-w-[180px]"
              >
                {settings.download_dir}
              </button>
              <button
                onClick={handleOpenFolder}
                title="Open download folder in Windows Explorer"
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Theme Switch */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Dark / Light Mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* WS Status Indicator */}
          <div 
            title={isWsConnected ? "Live WebSocket Connected" : "Connecting..."}
            className={`w-2.5 h-2.5 rounded-full ${isWsConnected ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-rose-500 animate-pulse'}`}
          />
        </div>
      </div>

      {/* Directory Edit Modal */}
      {isEditingDir && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base flex items-center gap-2">
              <Folder className="w-5 h-5 text-rose-500" />
              Set Download Destination
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter the full folder path on your computer where downloaded videos and audio files will be saved.
            </p>
            <form onSubmit={handleSaveDir} className="space-y-4">
              <input
                type="text"
                value={dirInput}
                onChange={(e) => setDirInput(e.target.value)}
                placeholder="e.g. C:\Users\YourName\Downloads"
                className="w-full text-xs font-mono px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDir(false)}
                  className="px-3 py-1.5 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
                >
                  Save Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
