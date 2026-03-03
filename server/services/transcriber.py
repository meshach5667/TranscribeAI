import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_mime_type(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".mp3":
        return "audio/mp3"
    elif ext == ".wav":
        return "audio/wav"
    elif ext == ".m4a":
        return "audio/m4a"
    elif ext == ".mp4":
        return "video/mp4"
    elif ext == ".webm":
        return "video/webm"
    return "audio/mp3"

async def transcribe_audio(file_path: str, sio, job_id: str) -> str:
    """
    Transcribes the audio/video file using Gemini API.
    """
    await sio.emit(f"job-{job_id}", {"status": "processing", "message": "Uploading file to Gemini..."})
    
    try:
        mime_type = get_mime_type(file_path)
        
  
        gemini_file = client.files.upload(file=file_path, config={'mime_type': mime_type})
        
        await sio.emit(f"job-{job_id}", {"status": "processing", "message": "Transcribing audio using Gemini..."})
        
        # We use gemini-2.5-flash for audio processing/transcription
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                gemini_file,
                "Please provide a highly accurate transcription of this audio/video file. Include timestamps and speaker labels if possible. Format the output cleanly."
            ]
        )
        
        # Clean up the file from Gemini storage
        client.files.delete(name=gemini_file.name)
        
        return response.text
    except Exception as e:
        print(f"Transcription error: {e}")
        raise Exception(f"Gemini transcription failed: {str(e)}")
