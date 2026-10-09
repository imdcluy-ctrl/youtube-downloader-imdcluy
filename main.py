import sys
import os
import uvicorn

# Add current directory to python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 StreamForge YouTube Downloader is starting...")
    print("👉 Open your browser at: http://localhost:8000")
    print("=" * 60)
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
