from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
import spine_analysis
import tempfile
import os
import urllib.request
import urllib.error
import uvicorn
from typing import List, Dict, Any, Optional

app = FastAPI(
    title="SpineGuard Medical AI - Diagnostic Neural Engine",
    description="Backend API for spinal disorder detection, Grad-CAM visualization, and severity classification.",
    version="2.0.0",
)

# CORS middleware for Next.js frontend or Node.js bridge communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthCheck(BaseModel):
    status: str
    version: str

@app.get("/health", response_model=HealthCheck, tags=["System"])
def health_check():
    """Returns the health status of the medical AI backend."""
    return {"status": "operational", "version": "2.0.0"}

@app.post("/analyze", tags=["Diagnostics"])
async def analyze(image: UploadFile = File(...)):
    """
    Analyzes an uploaded MRI or X-ray image of the spine.
    Expects a multi-part form data upload with the key 'image'.
    """
    if not image:
        raise HTTPException(status_code=400, detail="No image provided")
    
    # Optional: Basic validation on file type
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be an image.")

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = os.path.join(temp_dir, "input_image.png")
            output_dir = os.path.join(temp_dir, "output")
            os.makedirs(output_dir, exist_ok=True)
            
            # Read file contents and save locally for processing
            content = await image.read()
            with open(input_path, "wb") as f:
                f.write(content)
            
            result = spine_analysis.analyze_spine_image(input_path, output_dir)
            return result
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Locate the compiled frontend in dist/public
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist", "public"))
NODE_PORT = os.environ.get("PORT", "5000")
NODE_BACKEND_URL = f"http://127.0.0.1:{NODE_PORT}"

# Mount static assets if they exist
assets_dir = os.path.join(DIST_DIR, "assets")
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Proxy /api requests to the Node.js backend
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_to_node(path: str, request: Request):
    target_url = f"{NODE_BACKEND_URL}/api/{path}"
    if request.url.query:
        target_url += f"?{request.url.query}"
    
    body = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)
    
    req = urllib.request.Request(
        target_url,
        data=body if body else None,
        headers=headers,
        method=request.method
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            content = resp.read()
            resp_headers = dict(resp.headers)
            # Remove content-encoding and content-length if proxied
            resp_headers.pop("content-encoding", None)
            resp_headers.pop("content-length", None)
            return Response(content=content, status_code=resp.status, headers=resp_headers)
    except urllib.error.HTTPError as e:
        content = e.read()
        return Response(content=content, status_code=e.code)
    except Exception as e:
        return Response(content=f'{{"error": "Backend unavailable: {e}"}}'.encode("utf-8"), status_code=502, media_type="application/json")

# Catch-all route to serve the React SPA
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    target_file = os.path.join(DIST_DIR, full_path)
    if full_path and os.path.isfile(target_file):
        return FileResponse(target_file)
    
    index_html = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html)
    return {"message": "SpineGuard AI", "status": "operational"}

if __name__ == "__main__":
    uvicorn.run("ai_server:app", host="0.0.0.0", port=8000, reload=True)
