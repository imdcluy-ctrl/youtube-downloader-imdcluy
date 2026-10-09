import os
import sys
import glob
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import yt_dlp
import gradio as gr
from backend.app.downloader import extract_media_info, parse_media_info
from backend.app.utils.ffmpeg import get_ffmpeg_path

# Download directory with guaranteed write permissions
DOWNLOAD_DIR = Path(tempfile.gettempdir()) / "streamforge_downloads"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

def fetch_info(url: str) -> Tuple[Optional[str], str, Any]:
    """Fetch video metadata and available format resolutions."""
    if not url or not url.strip():
        return None, "⚠️ Please enter a valid video or playlist URL.", gr.update(choices=[], value=None)
    
    url = url.strip()
    try:
        raw_info = extract_media_info(url)
        parsed = parse_media_info(raw_info, url)
        
        if parsed.is_playlist:
            first_item = parsed.items[0] if parsed.items else None
            thumb = first_item.thumbnail if first_item else None
            info_text = (
                f"### 📋 Playlist: **{parsed.title}**\n"
                f"- **Channel / Uploader:** {parsed.uploader}\n"
                f"- **Total Videos:** {parsed.item_count}\n"
            )
            choices = ["Best Available", "1080p", "720p", "480p", "360p"]
            return thumb, info_text, gr.update(choices=choices, value="Best Available")
        else:
            item = parsed.items[0]
            thumb = item.thumbnail
            info_text = (
                f"### 🎬 **{item.title}**\n"
                f"- **Channel:** {item.uploader}\n"
                f"- **Duration:** {item.duration_string}\n"
            )
            
            # Extract resolution options
            choices = []
            if item.formats:
                for f in item.formats:
                    choices.append(f"{f.height}p ({f.ext})")
            if not choices:
                choices = ["1080p", "720p", "480p", "360p", "Best Available"]
            
            default_val = choices[0] if choices else "Best Available"
            return thumb, info_text, gr.update(choices=choices, value=default_val)
    except Exception as e:
        return None, f"❌ **Error fetching metadata:** {str(e)}", gr.update(choices=[], value=None)

def download_video_or_audio(
    url: str,
    media_mode: str,
    video_res: str,
    audio_codec: str,
    progress=gr.Progress(track_tqdm=True)
) -> Tuple[Optional[str], Optional[str], Optional[str], str]:
    """
    Downloads media and returns:
    (video_preview_path, audio_preview_path, file_download_path, status_markdown)
    """
    if not url or not url.strip():
        return None, None, None, "⚠️ Please provide a valid URL."

    url = url.strip()
    ffmpeg_path = get_ffmpeg_path()
    
    final_file = None

    def progress_hook(d):
        status = d.get('status')
        if status == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            if total > 0:
                p = downloaded / total
                speed = d.get('speed') or 0
                speed_str = f"{speed / (1024*1024):.1f} MB/s" if speed else ""
                progress(p, desc=f"Downloading... {int(p*100)}% {speed_str}")
        elif status == 'finished':
            progress(0.95, desc="Post-processing with FFmpeg...")

    def postprocess_hook(d):
        nonlocal final_file
        if d.get('status') == 'finished':
            info = d.get('info_dict', {})
            path = info.get('filepath') or d.get('filepath')
            if path and os.path.exists(path):
                final_file = path

    ydl_opts: Dict[str, Any] = {
        'outtmpl': str(DOWNLOAD_DIR / '%(title).150B [%(id)s].%(ext)s'),
        'progress_hooks': [progress_hook],
        'postprocessor_hooks': [postprocess_hook],
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
    }

    if ffmpeg_path:
        ydl_opts['ffmpeg_location'] = ffmpeg_path

    is_audio = "Audio" in media_mode

    if is_audio:
        codec = audio_codec.lower() if audio_codec.lower() in ('mp3', 'm4a', 'wav') else 'mp3'
        ydl_opts.update({
            'format': 'bestaudio/best',
            'writethumbnail': True,
            'postprocessors': [
                {
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': codec,
                    'preferredquality': '320' if codec == 'mp3' else '0',
                },
                {'key': 'FFmpegMetadata'},
                {'key': 'EmbedThumbnail'},
            ]
        })
    else:
        # Video
        height_limit = 1080
        if video_res:
            for num in [2160, 1440, 1080, 720, 480, 360]:
                if str(num) in video_res:
                    height_limit = num
                    break

        ydl_opts.update({
            'format': f'bestvideo[height<={height_limit}]+bestaudio/best[height<={height_limit}]/best',
            'merge_output_format': 'mp4',
            'postprocessors': [{'key': 'FFmpegMetadata'}]
        })

    try:
        progress(0.05, desc="Starting download...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if not final_file or not os.path.exists(final_file):
            # Fallback search newest file in download dir
            candidates = sorted(DOWNLOAD_DIR.glob("*"), key=os.path.getmtime, reverse=True)
            if candidates:
                final_file = str(candidates[0])

        if not final_file or not os.path.exists(final_file):
            return None, None, None, "❌ Download finished but output file could not be located."

        file_size_mb = os.path.getsize(final_file) / (1024 * 1024)
        filename = os.path.basename(final_file)
        success_msg = f"✅ **Download Complete!**\n- **File:** `{filename}`\n- **Size:** `{file_size_mb:.2f} MB`\n\n*Click the file below to save it to your device.*"

        if is_audio:
            return None, final_file, final_file, success_msg
        else:
            return final_file, None, final_file, success_msg

    except Exception as e:
        return None, None, None, f"❌ **Download failed:** {str(e)}"

# Custom CSS for modern styling
custom_css = """
.main-header { text-align: center; margin-bottom: 1.5rem; }
.main-header h1 { font-size: 2.2rem; font-weight: 800; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.main-header p { font-size: 1.05rem; color: #64748b; margin-top: 0.25rem; }
"""

with gr.Blocks(title="StreamForge - YouTube Downloader") as demo:
    gr.HTML("""
    <div class="main-header">
        <h1>⚡ StreamForge Media Downloader</h1>
        <p>Ultra-fast YouTube, Video & Audio Downloader powered by yt-dlp & FFmpeg</p>
    </div>
    """)

    with gr.Row():
        url_input = gr.Textbox(
            label="Video or Playlist URL",
            placeholder="Paste YouTube, Vimeo, or web video link here... (e.g. https://www.youtube.com/watch?v=...)",
            scale=4
        )
        fetch_btn = gr.Button("🔍 Fetch Info", variant="secondary", scale=1)

    with gr.Row():
        with gr.Column(scale=1):
            thumb_preview = gr.Image(label="Thumbnail", interactive=False)
        with gr.Column(scale=2):
            info_markdown = gr.Markdown("Paste a URL and click **Fetch Info** to preview.")

    with gr.Row():
        mode_radio = gr.Radio(
            choices=["🎬 Video (MP4)", "🎵 Audio Only (MP3/M4A)"],
            value="🎬 Video (MP4)",
            label="Download Type"
        )
        quality_dropdown = gr.Dropdown(
            choices=["Best Available", "1080p", "720p", "480p", "360p"],
            value="Best Available",
            label="Video Resolution"
        )
        audio_codec_dropdown = gr.Dropdown(
            choices=["MP3 (320kbps)", "M4A", "WAV"],
            value="MP3 (320kbps)",
            label="Audio Format",
            visible=False
        )

    def toggle_mode(choice):
        if "Audio" in choice:
            return gr.update(visible=False), gr.update(visible=True)
        else:
            return gr.update(visible=True), gr.update(visible=False)

    mode_radio.change(
        fn=toggle_mode,
        inputs=[mode_radio],
        outputs=[quality_dropdown, audio_codec_dropdown]
    )

    fetch_btn.click(
        fn=fetch_info,
        inputs=[url_input],
        outputs=[thumb_preview, info_markdown, quality_dropdown]
    )

    download_btn = gr.Button("⬇️ Start Download", variant="primary", size="lg")

    status_output = gr.Markdown()

    with gr.Row():
        with gr.Column():
            video_preview = gr.Video(label="Video Preview", interactive=False)
            audio_preview = gr.Audio(label="Audio Preview", interactive=False)
        with gr.Column():
            file_download = gr.File(label="💾 Click to Save / Download File to Device", interactive=False)

    download_btn.click(
        fn=download_video_or_audio,
        inputs=[url_input, mode_radio, quality_dropdown, audio_codec_dropdown],
        outputs=[video_preview, audio_preview, file_download, status_output]
    )

    gr.HTML("""
    <div style="text-align: center; margin-top: 2rem; color: #94a3b8; font-size: 0.85rem;">
        StreamForge Cloud • Built with FastAPI, yt-dlp, FFmpeg, and Gradio • Running on Hugging Face Spaces
    </div>
    """)

if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        theme=gr.themes.Soft(primary_hue="blue"),
        css=custom_css
    )
