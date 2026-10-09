---
title: StreamForge YouTube Downloader
emoji: ⚡
colorFrom: blue
colorTo: purple
sdk: gradio
app_file: app.py
pinned: false
license: mit
---

# StreamForge — Personal YouTube Downloader Web App

StreamForge is a high-speed personal YouTube and web media downloader built with **Gradio**, **FastAPI**, **yt-dlp**, and **FFmpeg**.

---

## ✨ Features

- **High-Resolution Video Downloads**: Support for 1080p, 1440p (2K), and 2160p (4K) MP4 video downloads with automatic FFmpeg video/audio stream merging.
- **High-Quality Audio Extraction**: 320kbps MP3, M4A (AAC), and lossless WAV with automatic album artwork thumbnail embedding and ID3 tag metadata injection.
- **Playlist & Batch Download**: Detects full YouTube playlists and presents an interactive checklist modal allowing you to select or deselect specific videos before downloading.
- **Smart Concurrency Queue**: Regulates simultaneous downloads (max 2 active) to avoid saturating network bandwidth and CPU cores during FFmpeg encoding.
- **Active Task Cancellation**: Cancel running downloads anytime with instant cleanup of lingering `.part` and `.temp` files.
- **Live Progress Updates**: WebSocket push updates for download percentage, transfer speed (MB/s), ETA, and post-processing stages.
- **Direct Windows File Explorer Integration**: Downloads save directly to your specified folder (defaults to `~/Downloads`) with a 1-click **"Show in Folder"** button.
- **Self-Healing FFmpeg**: Checks for FFmpeg on Windows and provides 1-click auto-download/setup if missing.
- **Persistent History & Settings**: Retains past downloads and folder configurations across restarts using SQLite.
- **Dark & Light Mode**: Built-in responsive theme switcher.

---

## 🚀 Quick Start (1-Click on Windows)

Double-click `run.bat` in the project root:
1. It automatically sets up a Python virtual environment (`.venv`).
2. Installs dependencies from `backend/requirements.txt`.
3. If Node.js is installed, it compiles the React frontend.
4. Opens your default browser at `http://localhost:8000`.

---

## 💻 Developer Mode (Dual Server with Hot-Reload)

To edit the frontend and backend with instant live reloading:

### 1. Start the FastAPI Backend:
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
python -m backend.main
```
The API and WebSocket server runs at `http://127.0.0.1:8000`.

### 2. Start the Vite Dev Server:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. API requests and WebSockets will proxy automatically to port 8000.

---

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, REST APIs & WebSocket hub
│   │   ├── config.py            # Settings persistence & default directories
│   │   ├── database.py          # SQLite database operations
│   │   ├── models.py            # Pydantic schemas
│   │   ├── downloader.py        # yt-dlp execution engine & hooks
│   │   ├── queue_manager.py     # Concurrency queue & task tracker
│   │   ├── ws_manager.py        # WebSocket connection manager
│   │   └── utils/
│   │       ├── ffmpeg.py        # FFmpeg detection & auto-downloader
│   │       └── explorer.py      # Windows Explorer launcher helper
│   ├── requirements.txt         # Python dependencies
│   └── main.py                  # Backend server entry point
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main dashboard view
│   │   ├── components/
│   │   │   ├── Header.tsx       # Navbar, directory status, theme switch
│   │   │   ├── UrlInput.tsx     # URL bar & 1-click preset buttons
│   │   │   ├── MediaInspector.tsx # Video details & resolution picker
│   │   │   ├── PlaylistModal.tsx  # Checklist for playlist selection
│   │   │   ├── QueueView.tsx    # Live download cards with cancel button
│   │   │   └── HistoryView.tsx  # Completed files & Explorer link
│   │   ├── hooks/useWebSocket.ts # Live WebSocket hook
│   │   └── services/api.ts      # REST API client
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── run.bat                      # Unified 1-click Windows runner
└── README.md
```
