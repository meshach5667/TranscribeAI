from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
fastapi_app = FastAPI(
    title="TranscrybeAI API",
    description="AI-powered transcription and chat service",
)

# Setup CORS
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@fastapi_app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "TranscrybeAI"}


# Import routers *after* app is created to avoid circular imports
from server.routes import transcribe, chat, auth  # noqa: E402

fastapi_app.include_router(transcribe.router, prefix="/api/transcribe", tags=["transcribe"])
fastapi_app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
fastapi_app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# Import the shared sio instance and wrap FastAPI with Socket.IO
from server.socket_manager import sio  # noqa: E402

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
