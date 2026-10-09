import React, { useState } from 'react';
import { 
  Film, 
  Music, 
  Download, 
  Clock, 
  Eye, 
  ListMusic, 
  Sparkles,
  Layers
} from 'lucide-react';
import { MediaInfoResponse } from '../types';

interface MediaInspectorProps {
  info: MediaInfoResponse;
  onDownload: (params: {
    url: string;
    media_type: 'video' | 'audio';
    quality: string;
    audio_format: string;
  }) => void;
  onOpenPlaylistModal: () => void;
}

export const MediaInspector: React.FC<MediaInspectorProps> = ({
  info,
  onDownload,
  onOpenPlaylistModal,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');
  const [selectedQuality, setSelectedQuality] = useState<string>('1080p');
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<string>('mp3');

  const item = info.items[0];

  if (info.is_playlist) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-8 px-4">
        <div className="bg-gradient-to-r from-rose-600/10 via-purple-600/10 to-indigo-600/10 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-600/25">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Playlist Detected
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
                {info.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {info.uploader} • {info.item_count} tracks ready for batch download
              </p>
            </div>
          </div>
          <button
            onClick={onOpenPlaylistModal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-md shadow-rose-600/20 flex-shrink-0 transition-transform active:scale-95"
          >
            <ListMusic className="w-4 h-4" />
            Select Playlist Videos
          </button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 px-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex flex-col md:flex-row">
          
          {/* Thumbnail preview */}
          <div className="md:w-5/12 relative aspect-video md:aspect-auto bg-black flex-shrink-0">
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Film className="w-12 h-12" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white font-mono text-xs px-2 py-1 rounded">
              {item.duration_string}
            </div>
          </div>

          {/* Details & Format Selection */}
          <div className="p-5 md:p-6 flex-grow flex flex-col justify-between">
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white line-clamp-2 mb-1">
                {item.title}
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                <span>{item.uploader}</span>
                {item.view_count ? (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {item.view_count.toLocaleString()} views
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {item.duration_string}
                </span>
              </div>

              {/* Type Switcher Tabs */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab('video')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'video'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  Video (MP4)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('audio')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'audio'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  Audio Only
                </button>
              </div>

              {/* Quality Options */}
              {activeTab === 'video' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Resolution Quality
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['2160p', '1440p', '1080p', '720p', '480p'].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSelectedQuality(q)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-all ${
                          selectedQuality === q
                            ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {q === '2160p' ? '4K (2160p)' : q === '1440p' ? '2K (1440p)' : q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Audio Format (Includes embedded cover art & ID3 tags)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'mp3', label: 'MP3 (320kbps High Quality)' },
                      { id: 'm4a', label: 'M4A (AAC Audio)' },
                      { id: 'wav', label: 'WAV (Uncompressed Lossless)' }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setSelectedAudioFormat(fmt.id)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-all ${
                          selectedAudioFormat === fmt.id
                            ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  onDownload({
                    url: item.url,
                    media_type: activeTab,
                    quality: selectedQuality,
                    audio_format: selectedAudioFormat,
                  })
                }
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 transition-transform active:scale-95"
              >
                <Download className="w-4 h-4" />
                Download {activeTab === 'video' ? `${selectedQuality} Video` : `${selectedAudioFormat.toUpperCase()} Audio`}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
