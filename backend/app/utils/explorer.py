import os
import subprocess
import sys
from pathlib import Path

def open_directory(dir_path: str) -> bool:
    try:
        path = Path(dir_path).resolve()
        if not path.exists():
            path.mkdir(parents=True, exist_ok=True)
            
        if sys.platform == "win32":
            os.startfile(str(path))
            return True
        elif sys.platform == "darwin":
            subprocess.run(["open", str(path)])
            return True
        else:
            subprocess.run(["xdg-open", str(path)])
            return True
    except Exception as e:
        print(f"[Explorer] Failed to open directory: {e}")
        return False

def reveal_in_explorer(file_path: str) -> bool:
    try:
        path = Path(file_path).resolve()
        if sys.platform == "win32":
            if path.exists():
                subprocess.run(["explorer", f"/select,{str(path)}"])
                return True
            elif path.parent.exists():
                os.startfile(str(path.parent))
                return True
        elif sys.platform == "darwin":
            if path.exists():
                subprocess.run(["open", "-R", str(path)])
                return True
        else:
            if path.parent.exists():
                subprocess.run(["xdg-open", str(path.parent)])
                return True
    except Exception as e:
        print(f"[Explorer] Failed to reveal file: {e}")
    return False
