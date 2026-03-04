from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
from google import genai

router = APIRouter()

SYSTEM_INSTRUCTION = (
    "You are TranscrybeAI, a highly intelligent transcription and extraction assistant. "
    "You help users summarize, extract, and understand their audio/video transcripts. "
    "You can also engage in normal helpful conversation. "
    "IMPORTANT: Always respond in plain, human-readable text. "
    "NEVER output JSON, code blocks, or markdown fences. "
    "Use headings, bullet points (•), and paragraphs for structure."
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

        raw = []
        for msg in request.messages:
            role = "user" if msg.role == "user" else "model"
            raw.append({"role": role, "text": msg.content})

        # Drop leading model messages
        while raw and raw[0]["role"] != "user":
            raw.pop(0)

        if not raw:
            raise HTTPException(status_code=400, detail="No user message found")

        # Collapse consecutive same-role messages
        contents = []
        for item in raw:
            if contents and contents[-1]["role"] == item["role"]:
                contents[-1]["parts"].append({"text": item["text"]})
            else:
                contents.append({"role": item["role"], "parts": [{"text": item["text"]}]})

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=dict(system_instruction=SYSTEM_INSTRUCTION),
        )

        text = (response.text or "").strip()

        # Strip accidental markdown code fences if model still wraps in ```json ... ```
        import re
        text = re.sub(r'^```(?:json|text)?\s*\n?', '', text)
        text = re.sub(r'\n?```\s*$', '', text)

        return {"response": text}

    except Exception as error:
        print(f"Chat error: {error}")
        raise HTTPException(status_code=500, detail=str(error))
