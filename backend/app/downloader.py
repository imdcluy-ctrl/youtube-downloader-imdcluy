import asyncio
import os
import re
import glob
from pathlib import Path
from typing import Dict, Any, Optional, Callable
import yt_dlp

from .models import MediaInfoResponse, VideoInfoItem, VideoFormatOption
from .utils.ffmpeg import get_ffmpeg_path

class DownloadCancelledException(Exception):
    """Raised when a download is cancelled by the user."""
    pass

def format_duration(seconds: Optional[int]) -> str:
    if not seconds:
        return "0:00"
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def extract_media_info(url: str) -> Dict[str, Any]:
    """Synchronous extraction of video or playlist metadata."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': 'in_playlist',
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return info

def parse_media_info(raw_info: Dict[str, Any], original_url: str) -> MediaInfoResponse:
    if not raw_info:
        raise ValueError("No metadata returned by yt-dlp")

    is_playlist = 'entries' in raw_info and raw_info.get('_type') == 'playlist'
    
    if is_playlist:
        entries = list(raw_info.get('entries', []))
        items = []
        for idx, entry in enumerate(entries):
            if not entry:
                continue
            entry_id = entry.get('id', str(idx))
            video_url = entry.get('url') or entry.get('webpage_url') or f"https://www.youtube.com/watch?v={entry_id}"
            items.append(VideoInfoItem(
                id=entry_id,
                url=video_url,
                title=entry.get('title', f"Video #{idx+1}"),
                uploader=entry.get('uploader') or entry.get('channel') or "Unknown",
                duration=entry.get('duration', 0),
                duration_string=format_duration(entry.get('duration', 0)),
                thumbnail=entry.get('thumbnail') or (entry.get('thumbnails', [{}])[-1].get('url') if entry.get('thumbnails') else None),
                view_count=entry.get('view_count', 0),
                description=entry.get('description', '')[:200] if entry.get('description') else "",
                formats=[]
            ))
        return MediaInfoResponse(
            is_playlist=True,
            title=raw_info.get('title', 'YouTube Playlist'),
            uploader=raw_info.get('uploader') or raw_info.get('channel') or "Unknown",
            item_count=len(items),
            thumbnail=items[0].thumbnail if items else None,
            items=items
        )

    # Single video: parse format options
    formats_list = raw_info.get('formats', [])
    parsed_formats: Dict[str, VideoFormatOption] = {}
    
    height_targets = [2160, 1440, 1080, 720, 480, 360]
    
    for f in formats_list:
        height = f.get('height')
        ext = f.get('ext')
        if height and height in height_targets and f.get('vcodec') != 'none':
            res_key = f"{height}p"
            if res_key not in parsed_formats or (f.get('filesize', 0) or 0) > (parsed_formats[res_key].filesize_approx or 0):
                parsed_formats[res_key] = VideoFormatOption(
                    format_id=f.get('format_id', ''),
                    ext=ext or 'mp4',
                    resolution=f"{f.get('width', 0)}x{height}" if f.get('width') else res_key,
                    height=height,
                    filesize_approx=f.get('filesize') or f.get('filesize_approx'),
                    vcodec=f.get('vcodec'),
                    acodec=f.get('acodec'),
                    note=f"{height}p ({ext})"
                )

    sorted_formats = sorted(parsed_formats.values(), key=lambda x: x.height or 0, reverse=True)

    single_item = VideoInfoItem(
        id=raw_info.get('id', ''),
        url=raw_info.get('webpage_url', original_url),
        title=raw_info.get('title', 'YouTube Video'),
        uploader=raw_info.get('uploader') or raw_info.get('channel') or "Unknown",
        duration=raw_info.get('duration', 0),
        duration_string=format_duration(raw_info.get('duration', 0)),
        thumbnail=raw_info.get('thumbnail'),
        view_count=raw_info.get('view_count', 0),
        description=raw_info.get('description', '')[:200] if raw_info.get('description') else "",
        formats=sorted_formats
    )

    return MediaInfoResponse(
        is_playlist=False,
        title=single_item.title,
        uploader=single_item.uploader,
        item_count=1,
        thumbnail=single_item.thumbnail,
        items=[single_item]
    )

def cleanup_partial_files(download_dir: str, video_id: Optional[str] = None):
    """Deletes temporary .part, .ytdl, and related temp files."""
    try:
        dir_path = Path(download_dir)
        patterns = ["*.part", "*.ytdl", "*.temp.*"]
        if video_id:
            patterns.extend([f"*{video_id}*.part", f"*{video_id}*.ytdl", f"*{video_id}*.temp.*"])
        
        for pattern in patterns:
            for file_path in dir_path.glob(pattern):
                try:
                    file_path.unlink()
                except Exception:
                    pass
    except Exception as e:
        print(f"[Cleanup] Error cleaning partial files: {e}")

def run_download(
    task_id: str,
    url: str,
    media_type: str,
    quality: str,
    audio_format: str,
    download_dir: str,
    cancel_event: asyncio.Event,
    progress_callback: Callable[[Dict[str, Any]], None]
) -> Dict[str, Any]:
    """Synchronous download worker intended to run in a thread."""
    
    Path(download_dir).mkdir(parents=True, exist_ok=True)
    ffmpeg_bin = get_ffmpeg_path()
    
    final_filepath: Optional[str] = None
    video_id: Optional[str] = None

    def ytdl_progress_hook(d):
        if cancel_event.is_set():
            raise DownloadCancelledException("Download cancelled by user")
        
        status = d.get('status')
        if status == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            percent = (downloaded / total * 100) if total > 0 else 0
            speed = d.get('speed') or 0
            eta = d.get('eta') or 0
            
            progress_callback({
                "status": "downloading",
                "percent": round(percent, 1),
                "downloaded_bytes": downloaded,
                "total_bytes": total,
                "speed": speed,
                "eta": eta
            })
        elif status == 'finished':
            progress_callback({
                "status": "processing",
                "percent": 99.0,
                "message": "Processing and converting media..."
            })

    def ytdl_postprocess_hook(d):
        nonlocal final_filepath
        if cancel_event.is_set():
            raise DownloadCancelledException("Download cancelled by user")
        if d.get('status') == 'finished':
            info_dict = d.get('info_dict', {})
            filepath = info_dict.get('filepath') or d.get('filepath')
            if filepath and os.path.exists(filepath):
                final_filepath = filepath

    ydl_opts: Dict[str, Any] = {
        'outtmpl': os.path.join(download_dir, '%(title).150B [%(id)s].%(ext)s'),
        'progress_hooks': [ytdl_progress_hook],
        'postprocessor_hooks': [ytdl_postprocess_hook],
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
    }

    if ffmpeg_bin:
        ydl_opts['ffmpeg_location'] = ffmpeg_bin

    if media_type == 'audio':
        chosen_ext = audio_format.lower() if audio_format in ('mp3', 'm4a', 'wav') else 'mp3'
        ydl_opts.update({
            'format': 'bestaudio/best',
            'writethumbnail': True,
            'postprocessors': [
                {
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': chosen_ext,
                    'preferredquality': '320' if chosen_ext == 'mp3' else '0',
                },
                {'key': 'FFmpegMetadata'},
                {'key': 'EmbedThumbnail'},
            ]
        })
    else:
        # Video download
        height_limit = 1080
        if '2160' in quality or '4k' in quality.lower():
            height_limit = 2160
        elif '1440' in quality or '2k' in quality.lower():
            height_limit = 1440
        elif '1080' in quality:
            height_limit = 1080
        elif '720' in quality:
            height_limit = 720
        elif '480' in quality:
            height_limit = 480
        elif '360' in quality:
            height_limit = 360

        ydl_opts.update({
            'format': f'bestvideo[height<={height_limit}]+bestaudio/best[height<={height_limit}]/best',
            'merge_output_format': 'mp4',
            'postprocessors': [{'key': 'FFmpegMetadata'}]
        })

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info to get metadata and video ID
            info = ydl.extract_info(url, download=False)
            video_id = info.get('id') if info else None
            title = info.get('title', 'Unknown') if info else 'Unknown'
            thumbnail = info.get('thumbnail') if info else None

            # Now perform download
            ydl.download([url])
            
            # If final_filepath wasn't captured by hook, locate it
            if not final_filepath:
                expected_base = os.path.join(download_dir, f"*[{video_id}].*")
                matches = glob.glob(expected_base)
                # Ignore .part or .temp
                valid_matches = [m for m in matches if not m.endswith(('.part', '.ytdl', '.temp', '.jpg', '.webp', '.png'))]
                if valid_matches:
                    final_filepath = valid_matches[0]

            filesize = os.path.getsize(final_filepath) if final_filepath and os.path.exists(final_filepath) else 0

            return {
                "success": True,
                "task_id": task_id,
                "video_id": video_id,
                "title": title,
                "thumbnail": thumbnail,
                "file_path": final_filepath,
                "file_size": filesize
            }
            
    except DownloadCancelledException:
        cleanup_partial_files(download_dir, video_id)
        raise
    except Exception as e:
        cleanup_partial_files(download_dir, video_id)
        raise e
