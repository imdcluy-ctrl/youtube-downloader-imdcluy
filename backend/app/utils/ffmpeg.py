import shutil
import subprocess
import os
import zipfile
import urllib.request
from pathlib import Path
from typing import Tuple, Optional
from ..config import BASE_DIR

TOOLS_DIR = BASE_DIR / "bin"
TOOLS_DIR.mkdir(exist_ok=True)

FFMPEG_WIN_URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

def get_ffmpeg_path() -> Optional[str]:
    # 1. Check local bin folder
    local_ffmpeg = TOOLS_DIR / "ffmpeg.exe"
    if local_ffmpeg.exists():
        return str(local_ffmpeg)

    # 2. Check system PATH
    sys_ffmpeg = shutil.which("ffmpeg")
    if sys_ffmpeg:
        return sys_ffmpeg

    return None

def check_ffmpeg() -> Tuple[bool, Optional[str]]:
    path = get_ffmpeg_path()
    if not path:
        return False, None
    try:
        res = subprocess.run([path, "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        if res.returncode == 0:
            first_line = res.stdout.splitlines()[0] if res.stdout else "Available"
            return True, first_line
    except Exception as e:
        print(f"[FFmpeg] Error checking version: {e}")
    return False, None

def download_portable_ffmpeg(progress_callback=None) -> bool:
    """Attempts to download and extract portable ffmpeg for Windows if not present."""
    if get_ffmpeg_path():
        return True

    zip_path = TOOLS_DIR / "ffmpeg.zip"
    try:
        if progress_callback:
            progress_callback("Downloading FFmpeg for Windows...")
        
        # Download
        urllib.request.urlretrieve(FFMPEG_WIN_URL, zip_path)
        
        if progress_callback:
            progress_callback("Extracting FFmpeg...")
            
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for member in zip_ref.namelist():
                filename = os.path.basename(member)
                if filename in ("ffmpeg.exe", "ffprobe.exe"):
                    source = zip_ref.open(member)
                    target = open(TOOLS_DIR / filename, "wb")
                    with source, target:
                        shutil.copyfileobj(source, target)

        if zip_path.exists():
            zip_path.unlink()
            
        return bool(get_ffmpeg_path())
    except Exception as e:
        print(f"[FFmpeg] Auto-download failed: {e}")
        if zip_path.exists():
            try:
                zip_path.unlink()
            except Exception:
                pass
        return False
