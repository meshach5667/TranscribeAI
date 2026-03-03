import os
import aiofiles
import aiohttp
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
import uuid
import re
from googleapiclient.discovery import build
from google.oauth2 import service_account
from googleapiclient.http import MediaIoBaseDownload
import io
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def download_file(url: str, dest_path: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status != 200:
                raise Exception(f"Failed to download file: HTTP {response.status}")
            
            async with aiofiles.open(dest_path, 'wb') as f:
                while True:
                    chunk = await response.content.read(8192)
                    if not chunk:
                        break
                    await f.write(chunk)

def get_gdrive_service():
    creds = None
    if os.path.exists('google-credentials.json'):
        creds = service_account.Credentials.from_service_account_file(
            'google-credentials.json', scopes=['https://www.googleapis.com/auth/drive.readonly']
        )
    
    api_key = os.getenv("GOOGLE_DRIVE_API_KEY")
    
    if creds:
        return build('drive', 'v3', credentials=creds)
    elif api_key:
        return build('drive', 'v3', developerKey=api_key)
    else:
        return None

async def download_gdrive_file(file_id: str, dest_path: str):
    service = get_gdrive_service()
    if not service:
        # Fallback to direct HTTP download (frequently fails for large or private files)
        url = f"https://drive.google.com/uc?export=download&id={file_id}"
        await download_file(url, dest_path)
        return

    request = service.files().get_media(fileId=file_id)
    fh = io.FileIO(dest_path, 'wb')
    downloader = MediaIoBaseDownload(fh, request)
    
    def _download():
        _done = False
        while _done is False:
            status, _done = downloader.next_chunk()
    
    await asyncio.to_thread(_download)

async def process_cloud_link(link: str, sio, job_id: str) -> str:
    """
    Detects if link is Google Drive, Dropbox, or OneDrive.
    Transforms the URL to a direct-download link or uses specific SDKs to fetch the media securely.
    Returns the local file path.
    """
    await sio.emit(f"job-{job_id}", {"status": "processing", "message": "Analyzing link..."})
    
    parsed_url = urlparse(link)
    ext = os.path.splitext(parsed_url.path)[1] or ".mp3"
    
    is_dropbox = "dropbox.com" in parsed_url.netloc
    is_onedrive = "sharepoint.com" in parsed_url.netloc or "1drv.ms" in parsed_url.netloc
    is_gdrive = "drive.google.com" in parsed_url.netloc
    
    if is_dropbox:
        query = parse_qs(parsed_url.query)
        query['dl'] = ['1']
        new_query = urlencode(query, doseq=True)
        link = urlunparse(parsed_url._replace(query=new_query))
        
    elif is_onedrive:
        query = parse_qs(parsed_url.query)
        query['download'] = ['1']
        new_query = urlencode(query, doseq=True)
        link = urlunparse(parsed_url._replace(query=new_query))
        
    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    local_path = os.path.join(upload_dir, f"{uuid.uuid4()}{ext}")
    
    await sio.emit(f"job-{job_id}", {"status": "processing", "message": "Downloading media..."})
    
    try:
        if is_gdrive:
            # Extract file ID
            match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', parsed_url.path)
            if not match:
                query = parse_qs(parsed_url.query)
                file_id = query.get('id', [None])[0]
            else:
                file_id = match.group(1)
                
            if not file_id:
                raise Exception("Could not extract Google Drive file ID.")
            
            await download_gdrive_file(file_id, local_path)
        else:
            # Attempt direct download for everything else
            await download_file(link, local_path)
            
    except Exception as e:
        error_msg = str(e)
        if is_gdrive:
            error_msg += " (If this is a private Drive link, ensure google-credentials.json is configured)."
        raise Exception(f"Cannot access link: {error_msg}")
        
    return local_path
