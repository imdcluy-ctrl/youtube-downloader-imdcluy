from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class VideoFormatOption(BaseModel):
    format_id: str
    ext: str
    resolution: Optional[str] = None
    height: Optional[int] = None
    filesize_approx: Optional[int] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    note: Optional[str] = None

class VideoInfoItem(BaseModel):
    id: str
    url: str
    title: str
    uploader: Optional[str] = "Unknown"
    duration: Optional[int] = 0
    duration_string: Optional[str] = "0:00"
    thumbnail: Optional[str] = None
    view_count: Optional[int] = 0
    description: Optional[str] = ""
    formats: List[VideoFormatOption] = []

class MediaInfoResponse(BaseModel):
    is_playlist: bool
    title: str
    uploader: Optional[str] = "Unknown"
    item_count: int = 1
    thumbnail: Optional[str] = None
    items: List[VideoInfoItem] = []

class DownloadRequest(BaseModel):
    url: str
    media_type: str = Field(default="video", description="'video' or 'audio'")
    format_id: Optional[str] = Field(default=None, description="Specific yt-dlp format id or 'best'")
    quality: Optional[str] = Field(default="1080p", description="e.g. 2160p, 1440p, 1080p, 720p, 480p, or '320kbps' for audio")
    audio_format: Optional[str] = Field(default="mp3", description="mp3, m4a, wav")
    download_dir: Optional[str] = None
    # For playlists:
    is_playlist: bool = False
    selected_indices: Optional[List[int]] = None

class CancelRequest(BaseModel):
    task_id: str

class SettingsUpdateRequest(BaseModel):
    download_dir: str

class SettingsResponse(BaseModel):
    download_dir: str
    ffmpeg_available: bool
    ffmpeg_version: Optional[str] = None
