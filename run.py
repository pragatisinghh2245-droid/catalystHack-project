"""
VaaniAccess - Server Launcher
Runs the FastAPI application on http://127.0.0.1:8000
"""

import sys
import uvicorn

def main():
    print("=" * 60)
    print("  VaaniAccess – Dialect-Adaptive Scheme Voice Navigator")
    print("  Starting server at: http://127.0.0.1:8000")
    print("=" * 60)
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    main()
