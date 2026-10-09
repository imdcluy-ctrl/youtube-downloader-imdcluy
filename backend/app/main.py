import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from .config import BASE_DIR, app_config
from .database import init_db, get_all_history, delete_history_record, clear_all_history
from .models import (
    MediaInfoResponse,
    DownloadRequest,
    CancelRequest,
    SettingsUpdateRequest,
    SettingsResponse
)
from .utils.ffmpeg import check_ffmpeg, download_portable_ffmpeg
from .utils.explorer import open_directory, reveal_in_explorer
from .downloader import extract_media_info, parse_media_info
from .ws_manager import ws_manager
from .queue_manager import queue_manager, thread_pool

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    queue_manager.start()
    yield
    # Shutdown

app = FastAPI(title="YouTube Downloader API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UrlPayload(BaseModel):
    url: str

class RevealPayload(BaseModel):
    path: Optional[str] = None

@app.post("/api/info", response_model=MediaInfoResponse)
async def get_media_info(payload: UrlPayload):
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")
    
    loop = asyncio.get_running_loop()
    try:
        raw_info = await loop.run_in_executor(thread_pool, extract_media_info, url)
        parsed = parse_media_info(raw_info, url)
        return parsed
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch metadata: {str(e)}")

@app.post("/api/download")
async def start_download(req: DownloadRequest):
    if not req.url:
        raise HTTPException(status_code=400, detail="URL is required")

    task_ids = []
    
    if req.is_playlist and req.selected_indices is not None:
        loop = asyncio.get_running_loop()
        try:
            raw_info = await loop.run_in_executor(thread_pool, extract_media_info, req.url)
            parsed = parse_media_info(raw_info, req.url)
            
            for idx in req.selected_indices:
                if 0 <= idx < len(parsed.items):
                    item = parsed.items[idx]
                    tid = await queue_manager.add_task(
                        url=item.url,
                        title=item.title,
                        thumbnail=item.thumbnail,
                        media_type=req.media_type,
                        quality=req.quality,
                        audio_format=req.audio_format,
                        download_dir=req.download_dir
                    )
                    task_ids.append(tid)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process playlist download: {str(e)}")
    else:
        tid = await queue_manager.add_task(
            url=req.url,
            media_type=req.media_type,
            quality=req.quality,
            audio_format=req.audio_format,
            download_dir=req.download_dir
        )
        task_ids.append(tid)

    return {"success": True, "task_ids": task_ids}

@app.post("/api/cancel")
async def cancel_task(payload: CancelRequest):
    success = await queue_manager.cancel_task(payload.task_id)
    return {"success": success, "task_id": payload.task_id}

@app.get("/api/tasks")
async def get_active_tasks():
    return queue_manager.get_all_active_tasks()

@app.get("/api/history")
async def get_history():
    return get_all_history()

@app.delete("/api/history/{record_id}")
async def delete_history(record_id: int):
    delete_history_record(record_id)
    return {"success": True}

@app.post("/api/history/clear")
async def clear_history():
    clear_all_history()
    return {"success": True}

@app.get("/api/settings", response_model=SettingsResponse)
async def get_settings():
    ff_ok, ff_ver = check_ffmpeg()
    return SettingsResponse(
        download_dir=app_config.download_dir,
        ffmpeg_available=ff_ok,
        ffmpeg_version=ff_ver
    )

@app.post("/api/settings")
async def update_settings(payload: SettingsUpdateRequest):
    success = app_config.update_download_dir(payload.download_dir)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid folder path")
    return {"success": True, "download_dir": app_config.download_dir}

@app.post("/api/open-folder")
async def open_folder_endpoint(payload: RevealPayload):
    if payload.path:
        # If specific file path given, reveal it
        path_obj = Path(payload.path)
        if path_obj.is_file():
            reveal_in_explorer(payload.path)
            return {"success": True}
        elif path_obj.is_dir():
            open_directory(payload.path)
            return {"success": True}
    
    # Fallback to current download directory
    open_directory(app_config.download_dir)
    return {"success": True}

@app.post("/api/ffmpeg/install")
async def install_ffmpeg(background_tasks: BackgroundTasks):
    loop = asyncio.get_running_loop()
    try:
        ok = await loop.run_in_executor(thread_pool, download_portable_ffmpeg)
        return {"success": ok}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep alive and receive any client ping
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Serve Frontend (built Vite app or built-in standalone UI)
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
STATIC_DIR = BASE_DIR / "app" / "static"

if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    async def serve_root():
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse({"status": "running", "message": "StreamForge API is ready"})

    @app.get("/{full_path:path}")
    async def serve_fallback(full_path: str):
        target = STATIC_DIR / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse({"status": "running", "message": "StreamForge API is ready"})
