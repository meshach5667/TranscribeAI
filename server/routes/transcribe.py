from fastapi import APIRouter, File, UploadFile, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uuid
import os
import asyncio

# Import the services
from server.services.cloud_fetcher import process_cloud_link
from server.services.transcriber import transcribe_audio
from server.services.llm_processor import generate_summary

# Import the shared Socket.IO instance (NOT from main — avoids circular import)
from server.socket_manager import sio

router = APIRouter()

# Temporary jobs store — use Redis or a DB in production
jobs: dict = {}


class LinkRequest(BaseModel):
    link: str
    access_token: str = ""


@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Poll endpoint so the frontend can check status even without Socket.IO."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


async def process_media(job_id: str, link: str = None, file_path: str = None, access_token: str = ""):
    local_file_path = file_path

    try:
        await sio.emit(f"job-{job_id}", {"status": "processing", "message": "Initializing job..."})

        if link:
            # Detect provider, download securely
            local_file_path = await process_cloud_link(link, sio, job_id, access_token=access_token)

        if not local_file_path:
            raise Exception("No file to process")

        # Transcribe with Gemini
        transcript = await transcribe_audio(local_file_path, sio, job_id)

        # Enhance with LangChain + Gemini
        summary = await generate_summary(transcript, sio, job_id)

        result = {
            "transcript": transcript,
            "summary": summary,
        }

        jobs[job_id] = {"status": "completed", "result": result}
        await sio.emit(f"job-{job_id}", {"status": "completed", "result": result})

    except Exception as error:
        print(f"Job {job_id} failed:", error)
        jobs[job_id] = {"status": "failed", "error": str(error)}
        await sio.emit(f"job-{job_id}", {"status": "failed", "error": str(error)})
    finally:
        # Cleanup temporary files
        if local_file_path and os.path.exists(local_file_path):
            try:
                os.remove(local_file_path)
            except OSError:
                pass


@router.post("/link")
async def transcribe_link(request: LinkRequest, background_tasks: BackgroundTasks):
    link = request.link
    if not link:
        raise HTTPException(status_code=400, detail="Link is required")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "pending", "type": "link", "link": link}

    background_tasks.add_task(process_media, job_id, link=link, access_token=request.access_token or "")

    return {"jobId": job_id}


@router.post("/file")
async def transcribe_file(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    job_id = str(uuid.uuid4())

    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    jobs[job_id] = {"status": "pending", "type": "file", "filePath": file_path}

    background_tasks.add_task(process_media, job_id, file_path=file_path)

    return {"jobId": job_id}
