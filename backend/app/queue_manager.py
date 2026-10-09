import asyncio
import uuid
from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor

from .config import app_config
from .database import add_download_record, update_download_record
from .downloader import run_download, DownloadCancelledException
from .ws_manager import ws_manager

thread_pool = ThreadPoolExecutor(max_workers=4)

class DownloadTask:
    def __init__(
        self,
        task_id: str,
        url: str,
        title: str,
        thumbnail: Optional[str],
        media_type: str,
        quality: str,
        audio_format: str,
        download_dir: str
    ):
        self.task_id = task_id
        self.url = url
        self.title = title
        self.thumbnail = thumbnail
        self.media_type = media_type
        self.quality = quality
        self.audio_format = audio_format
        self.download_dir = download_dir
        
        self.status = "queued" # queued, downloading, processing, completed, failed, cancelled
        self.percent = 0.0
        self.speed = 0.0
        self.eta = 0
        self.downloaded_bytes = 0
        self.total_bytes = 0
        self.file_path: Optional[str] = None
        self.error_message: Optional[str] = None
        self.cancel_event = asyncio.Event()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "url": self.url,
            "title": self.title,
            "thumbnail": self.thumbnail,
            "media_type": self.media_type,
            "quality": self.quality,
            "audio_format": self.audio_format,
            "status": self.status,
            "percent": self.percent,
            "speed": self.speed,
            "eta": self.eta,
            "downloaded_bytes": self.downloaded_bytes,
            "total_bytes": self.total_bytes,
            "file_path": self.file_path,
            "error_message": self.error_message
        }

class QueueManager:
    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.tasks: Dict[str, DownloadTask] = {}
        self.semaphore = asyncio.Semaphore(app_config.max_concurrent_downloads)
        self._worker_task: Optional[asyncio.Task] = None

    def start(self):
        if self._worker_task is None or self._worker_task.done():
            self._worker_task = asyncio.create_task(self._process_queue())

    async def add_task(
        self,
        url: str,
        title: str = "Fetching title...",
        thumbnail: Optional[str] = None,
        media_type: str = "video",
        quality: str = "1080p",
        audio_format: str = "mp3",
        download_dir: Optional[str] = None
    ) -> str:
        task_id = str(uuid.uuid4())
        dest_dir = download_dir or app_config.download_dir
        task = DownloadTask(
            task_id=task_id,
            url=url,
            title=title,
            thumbnail=thumbnail,
            media_type=media_type,
            quality=quality,
            audio_format=audio_format,
            download_dir=dest_dir
        )
        self.tasks[task_id] = task

        format_desc = f"{quality} ({media_type})" if media_type == 'video' else f"{audio_format.upper()} (Audio)"
        add_download_record(
            task_id=task_id,
            url=url,
            title=title,
            thumbnail=thumbnail or "",
            media_type=media_type,
            format_desc=format_desc
        )

        await self.queue.put(task)
        await ws_manager.broadcast({
            "type": "task_added",
            "task": task.to_dict()
        })
        return task_id

    async def cancel_task(self, task_id: str) -> bool:
        task = self.tasks.get(task_id)
        if not task:
            return False
        if task.status in ("completed", "failed", "cancelled"):
            return False
        
        task.cancel_event.set()
        task.status = "cancelled"
        update_download_record(task_id=task_id, status="cancelled", error_message="Cancelled by user")
        
        await ws_manager.broadcast({
            "type": "task_cancelled",
            "task_id": task_id
        })
        return True

    def get_all_active_tasks(self) -> List[Dict[str, Any]]:
        # Return tasks that are queued, downloading, or processing
        return [t.to_dict() for t in self.tasks.values() if t.status in ("queued", "downloading", "processing")]

    async def _process_queue(self):
        while True:
            task: DownloadTask = await self.queue.get()
            if task.cancel_event.is_set():
                self.queue.task_done()
                continue

            asyncio.create_task(self._run_task_worker(task))
            self.queue.task_done()

    async def _run_task_worker(self, task: DownloadTask):
        async with self.semaphore:
            if task.cancel_event.is_set():
                return

            loop = asyncio.get_running_loop()
            task.status = "downloading"
            
            await ws_manager.broadcast({
                "type": "task_status_change",
                "task_id": task.task_id,
                "status": "downloading"
            })

            def on_progress(p_data: Dict[str, Any]):
                task.percent = p_data.get("percent", task.percent)
                task.speed = p_data.get("speed", task.speed)
                task.eta = p_data.get("eta", task.eta)
                task.downloaded_bytes = p_data.get("downloaded_bytes", task.downloaded_bytes)
                task.total_bytes = p_data.get("total_bytes", task.total_bytes)
                if p_data.get("status"):
                    task.status = p_data["status"]

                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast({
                        "type": "task_progress",
                        "task_id": task.task_id,
                        "data": task.to_dict()
                    }),
                    loop
                )

            try:
                result = await loop.run_in_executor(
                    thread_pool,
                    run_download,
                    task.task_id,
                    task.url,
                    task.media_type,
                    task.quality,
                    task.audio_format,
                    task.download_dir,
                    task.cancel_event,
                    on_progress
                )
                
                task.status = "completed"
                task.percent = 100.0
                task.title = result.get("title", task.title)
                task.thumbnail = result.get("thumbnail", task.thumbnail)
                task.file_path = result.get("file_path")
                filesize = result.get("file_size", 0)

                update_download_record(
                    task_id=task.task_id,
                    status="completed",
                    file_path=task.file_path,
                    file_size=filesize
                )

                await ws_manager.broadcast({
                    "type": "task_completed",
                    "task_id": task.task_id,
                    "task": task.to_dict()
                })

            except DownloadCancelledException:
                task.status = "cancelled"
                update_download_record(task_id=task.task_id, status="cancelled", error_message="Cancelled by user")
                await ws_manager.broadcast({
                    "type": "task_cancelled",
                    "task_id": task.task_id
                })
            except Exception as e:
                task.status = "failed"
                task.error_message = str(e)
                update_download_record(task_id=task.task_id, status="failed", error_message=str(e))
                await ws_manager.broadcast({
                    "type": "task_failed",
                    "task_id": task.task_id,
                    "error": str(e)
                })

queue_manager = QueueManager()
