import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List

from backend.engine import SchemeEngine

app = FastAPI(
    title="VaaniAccess API",
    description="Dialect-Adaptive Public Scheme Voice Navigator API",
    version="1.0.0"
)

# Enable CORS for local cross-origin development if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SchemeEngine()

class MatchRequest(BaseModel):
    query: str
    dialect: Optional[str] = None

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "VaaniAccess Voice Navigator",
        "schemes_loaded": len(engine.schemes),
        "categories_count": len(engine.categories)
    }

@app.post("/api/match")
def match_scheme(req: MatchRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    result = engine.match_intent(req.query, req.dialect)
    return result

@app.get("/api/schemes")
def get_all_schemes():
    return {
        "total": len(engine.schemes),
        "schemes": engine.schemes,
        "categories": list(engine.categories.values())
    }

@app.get("/api/schemes/{scheme_id}")
def get_scheme(scheme_id: str):
    scheme = engine.schemes_by_id.get(scheme_id)
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return scheme

@app.get("/api/categories")
def get_categories():
    return {
        "categories": list(engine.categories.values())
    }

# Mount static frontend
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "VaaniAccess API running. Static frontend not yet compiled."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
