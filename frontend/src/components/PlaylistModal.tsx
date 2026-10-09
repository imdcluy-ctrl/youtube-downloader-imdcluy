import React, { useState } from 'react';
import { X, CheckSquare, Square, Download, Film, Music, Layers } from 'lucide-react';
import { MediaInfoResponse } from '../types';

interface PlaylistModalProps {
  info: MediaInfoResponse;
  isOpen: boolean;
  onClose: () => void;
  onDownloadBatch: (params: {
    url: string;
    media_type: 'video' | 'audio';
    quality: string;
    audio_format: string;
    selected_indices: number[];
  }) => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  info,
  isOpen,
  onClose,
  onDownloadBatch,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    info.items.map((_, idx) => idx)
  );
  const [mediaType, setMediaType] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState('1080p');
  const [audioFormat, setAudioFormat] = useState('mp3');

  if (!isOpen) return null;

  const toggleIndex = (idx: number) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSelectAll = () => {
    setSelectedIndices(info.items.map((_, idx) => idx));
  };

  const handleDeselectAll = () => {
    setSelectedIndices([]);
  };

  const handleStartBatch = () => {
    if (selectedIndices.length === 0) return;
    onDownloadBatch({
      url: info.items[0]?.url || '',
      media_type: mediaType,
      quality,
      audio_format: audioFormat,
      selected_indices: selectedIndices,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                {info.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {info.item_count} items in playlist • {selectedIndices.length} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Batch Settings Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Format:</span>
            <div className="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                  mediaType === 'video'
                    ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Film className="w-3 h-3" /> Video (MP4)
              </button>
              <button
                type="button"
                onClick={() => setMediaType('audio')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                  mediaType === 'audio'
                    ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Music className="w-3 h-3" /> Audio (MP3)
              </button>
            </div>

            {mediaType === 'video' ? (
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-900 dark:text-white"
              >
                <option value="1080p">1080p Full HD</option>
                <option value="720p">720p HD</option>
                <option value="2160p">4K UHD</option>
                <option value="480p">480p SD</option>
              </select>
            ) : (
              <select
                value={audioFormat}
                onChange={(e) => setAudioFormat(e.target.value)}
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-900 dark:text-white"
              >
                <option value="mp3">MP3 320kbps</option>
                <option value="m4a">M4A AAC</option>
                <option value="wav">WAV Lossless</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-slate-600 dark:text-slate-300 hover:text-rose-600 font-medium"
            >
              Select All
            </button>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-slate-600 dark:text-slate-300 hover:text-rose-600 font-medium"
            >
              Deselect All
            </button>
          </div>

        </div>

        {/* Scrollable Items List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {info.items.map((it, idx) => {
            const isSelected = selectedIndices.includes(idx);
            return (
              <div
                key={it.id || idx}
                onClick={() => toggleIndex(idx)}
                className={`pt-2 flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-rose-50/50 dark:bg-rose-950/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-60'
                }`}
              >
                <button
                  type="button"
                  className="text-rose-600 flex-shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 fill-rose-600 text-white" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex-shrink-0 relative">
                  {it.thumbnail ? (
                    <img src={it.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : null}
                  <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] text-white font-mono px-1 rounded">
                    {it.duration_string}
                  </span>
                </div>

                <div className="flex-grow min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {idx + 1}. {it.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {it.uploader}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-500">
            {selectedIndices.length} videos will be queued
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIndices.length === 0}
              onClick={handleStartBatch}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-md shadow-rose-600/25"
            >
              <Download className="w-4 h-4" />
              Download Selected ({selectedIndices.length})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
