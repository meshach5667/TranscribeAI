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


async def download_file(url: str, dest_path: str, headers: dict = None):
    """Generic HTTP download with redirect-following."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, allow_redirects=True) as response:
            if response.status != 200:
                raise Exception(f"Failed to download file: HTTP {response.status}")

            async with aiofiles.open(dest_path, 'wb') as f:
                while True:
                    chunk = await response.content.read(8192)
                    if not chunk:
                        break
                    await f.write(chunk)


# ---------------------------------------------------------------------------
# Google Drive helpers
# ---------------------------------------------------------------------------

def _get_gdrive_service_account():
    """Return a Drive service built with a service-account, or None."""
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "google-credentials.json")
    if os.path.exists(creds_path):
        creds = service_account.Credentials.from_service_account_file(
            creds_path, scopes=["https://www.googleapis.com/auth/drive.readonly"]
        )
        return build("drive", "v3", credentials=creds)
    return None


async def _download_gdrive_via_api(file_id: str, dest_path: str) -> bool:
    """Try downloading with a service-account.  Returns True on success."""
    service = _get_gdrive_service_account()
    if service is None:
        return False

    try:
        request = service.files().get_media(fileId=file_id)
        fh = io.FileIO(dest_path, "wb")
        downloader = MediaIoBaseDownload(fh, request)

        def _do():
            done = False
            while not done:
                _status, done = downloader.next_chunk()

        await asyncio.to_thread(_do)
        return True
    except Exception:
        return False


async def _download_gdrive_direct(file_id: str, dest_path: str):
    """
    Download a Google Drive file shared via 'Anyone with the link'.
    Handles the large-file virus-scan confirmation page automatically.
    """
    base_url = "https://drive.google.com/uc?export=download"

    async with aiohttp.ClientSession() as session:
        # First request — may return the file directly or an HTML confirmation page
        params = {"id": file_id}
        async with session.get(base_url, params=params, allow_redirects=True) as resp:
            if resp.status != 200:
                raise Exception(
                    f"Google Drive returned HTTP {resp.status}. "
                    "The file may be private or the link may be invalid."
                )

            # Check if Google sent the confirmation page (large file virus scan)
            content_type = resp.headers.get("Content-Type", "")
            if "text/html" in content_type:
                # Parse the confirm token from cookies or page
                confirm_token = None
                for cookie in session.cookie_jar:
                    if cookie.key.startswith("download_warning"):
                        confirm_token = cookie.value
                        break

                if not confirm_token:
                    # Try to extract from the HTML body
                    body = await resp.text()
                    match = re.search(r'confirm=([0-9A-Za-z_-]+)', body)
                    if match:
                        confirm_token = match.group(1)

                if confirm_token:
                    params["confirm"] = confirm_token
                    async with session.get(base_url, params=params, allow_redirects=True) as resp2:
                        if resp2.status != 200:
                            raise Exception(f"Google Drive confirmed download returned HTTP {resp2.status}")
                        async with aiofiles.open(dest_path, "wb") as f:
                            while True:
                                chunk = await resp2.content.read(8192)
                                if not chunk:
                                    break
                                await f.write(chunk)
                    return

                # If we still got HTML without a confirm token, the file is likely
                # truly private or restricted.
                raise Exception(
                    "Google Drive requires sign-in to access this file. "
                    "Make sure the file sharing is set to 'Anyone with the link' "
                    "or configure a service-account (google-credentials.json)."
                )

            # Not HTML → it's the actual file bytes
            async with aiofiles.open(dest_path, "wb") as f:
                # Write the already-read first chunk, then stream the rest
                first_chunk = await resp.content.read(8192)
                while first_chunk:
                    await f.write(first_chunk)
                    first_chunk = await resp.content.read(8192)


async def download_gdrive_file(file_id: str, dest_path: str, access_token: str = ""):
    """
    Strategy:
    1. If user provided an OAuth access_token, use it (handles private files shared with the user).
    2. If a service-account is configured, try the API.
    3. Fall back to direct HTTP download (works for 'Anyone with the link' shares).
    """
    # Try user's OAuth token first
    if access_token:
        try:
            url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
            await download_file(url, dest_path, headers={"Authorization": f"Bearer {access_token}"})
            return
        except Exception:
            pass  # Fall through to other methods

    # Try service-account API download
    if await _download_gdrive_via_api(file_id, dest_path):
        return

    # Direct HTTP download — works for link-shared files
    await _download_gdrive_direct(file_id, dest_path)

async def process_cloud_link(link: str, sio, job_id: str, access_token: str = "") -> str:
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
            
            await download_gdrive_file(file_id, local_path, access_token=access_token)
        else:
            # Attempt direct download for everything else
            await download_file(link, local_path)
            
    except Exception as e:
        error_msg = str(e)
        if is_gdrive:
            error_msg += (
                " — Tip: make sure the file's sharing is set to "
                "'Anyone with the link' in Google Drive. "
                "For truly private files, configure a service-account "
                "(see google-credentials.json)."
            )
        raise Exception(f"Cannot access link: {error_msg}")
        
    return local_path
