from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
from google import genai

router = APIRouter()

SYSTEM_INSTRUCTION = (
    "You are TranscrybeAI, a highly intelligent transcription and extraction assistant. "
    "You help users summarize, extract, and understand their audio/video transcripts. "
    "You can also engage in normal helpful conversation."
)


def _get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=api_key)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("/")
async def process_chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages array is required")

    try:
        client = _get_client()

        contents = []
        for msg in request.messages:
            role = "user" if msg.role == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.content}],
            })

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=dict(system_instruction=SYSTEM_INSTRUCTION),
        )

        return {"response": response.text}

    except Exception as error:
        print(f"Chat error: {error}")
        raise HTTPException(status_code=500, detail=str(error))
