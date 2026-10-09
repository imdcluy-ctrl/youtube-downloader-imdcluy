import sqlite3
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from .config import DATA_DIR

DB_PATH = DATA_DIR / "history.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS downloads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT UNIQUE NOT NULL,
                url TEXT NOT NULL,
                title TEXT,
                thumbnail TEXT,
                file_path TEXT,
                file_size INTEGER DEFAULT 0,
                media_type TEXT,
                format_desc TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                finished_at TEXT,
                error_message TEXT
            )
        """)
        conn.commit()

def add_download_record(task_id: str, url: str, title: str, thumbnail: str, media_type: str, format_desc: str) -> int:
    created_at = datetime.datetime.now().isoformat()
    with get_connection() as conn:
        cursor = conn.execute("""
            INSERT OR REPLACE INTO downloads (task_id, url, title, thumbnail, media_type, format_desc, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'downloading', ?)
        """, (task_id, url, title, thumbnail, media_type, format_desc, created_at))
        conn.commit()
        return cursor.lastrowid

def update_download_record(task_id: str, status: str, file_path: Optional[str] = None, file_size: int = 0, error_message: Optional[str] = None):
    finished_at = datetime.datetime.now().isoformat() if status in ('completed', 'failed', 'cancelled') else None
    with get_connection() as conn:
        conn.execute("""
            UPDATE downloads
            SET status = ?,
                file_path = COALESCE(?, file_path),
                file_size = CASE WHEN ? > 0 THEN ? ELSE file_size END,
                finished_at = COALESCE(?, finished_at),
                error_message = ?
            WHERE task_id = ?
        """, (status, file_path, file_size, file_size, finished_at, error_message, task_id))
        conn.commit()

def get_all_history(limit: int = 100) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.execute("""
            SELECT id, task_id, url, title, thumbnail, file_path, file_size, media_type, format_desc, status, created_at, finished_at, error_message
            FROM downloads
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def delete_history_record(record_id: int):
    with get_connection() as conn:
        conn.execute("DELETE FROM downloads WHERE id = ?", (record_id,))
        conn.commit()

def clear_all_history():
    with get_connection() as conn:
        conn.execute("DELETE FROM downloads")
        conn.commit()
