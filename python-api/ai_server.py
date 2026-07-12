from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import spine_analysis
import tempfile
import os
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
    allow_origins=["*"],  # Restrict in production
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
            
            # Perform blocking AI analysis (TODO: wrap in asyncio.to_thread for better async throughput)
            result = spine_analysis.analyze_spine_image(input_path, output_dir)
            
            return result
            
    except Exception as e:
        # In a real system, log the exception stack trace
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("ai_server:app", host="0.0.0.0", port=8000, reload=True)