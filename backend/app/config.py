import json
import os
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

CONFIG_FILE = DATA_DIR / "settings.json"
DEFAULT_DOWNLOAD_DIR = Path.home() / "Downloads"

class Config:
    def __init__(self):
        self.download_dir = str(DEFAULT_DOWNLOAD_DIR)
        self.max_concurrent_downloads = 2
        self.load()

    def load(self):
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.download_dir = data.get("download_dir", str(DEFAULT_DOWNLOAD_DIR))
                    self.max_concurrent_downloads = data.get("max_concurrent_downloads", 2)
            except Exception as e:
                print(f"[Config] Error loading settings: {e}")

    def save(self):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "download_dir": self.download_dir,
                    "max_concurrent_downloads": self.max_concurrent_downloads
                }, f, indent=2)
        except Exception as e:
            print(f"[Config] Error saving settings: {e}")

    def update_download_dir(self, new_path: str) -> bool:
        path = Path(new_path).expanduser().resolve()
        try:
            path.mkdir(parents=True, exist_ok=True)
            self.download_dir = str(path)
            self.save()
            return True
        except Exception as e:
            print(f"[Config] Failed to set download dir: {e}")
            return False

app_config = Config()
