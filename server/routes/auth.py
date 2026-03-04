from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
import httpx

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
# In dev Vite proxies /api to :8000; the callback must hit the backend directly
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/api/auth/callback")

SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.readonly",
]


@router.get("/google")
async def google_login():
    """Redirect the user to Google's consent screen."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    qs = "&".join(f"{k}={httpx.URL('', params={k: v}).params}" for k, v in params.items())
    # Build URL cleanly
    from urllib.parse import urlencode
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)


@router.get("/callback")
async def google_callback(code: str = ""):
    """Exchange the auth code for tokens and redirect to frontend with them."""
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_resp.text}")

    tokens = token_resp.json()
    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")

    # Fetch user profile
    async with httpx.AsyncClient() as client:
        profile_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    profile = profile_resp.json() if profile_resp.status_code == 200 else {}

    name = profile.get("name", "")
    email = profile.get("email", "")
    picture = profile.get("picture", "")

    # Redirect to frontend with token info in the hash (never in query string for safety)
    from urllib.parse import urlencode as ue
    fragment = ue({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "name": name,
        "email": email,
        "picture": picture,
    })
    return RedirectResponse(f"/#/auth-callback?{fragment}")


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh")
async def refresh_access_token(req: RefreshRequest):
    """Use a refresh token to get a new access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "refresh_token": req.refresh_token,
                "grant_type": "refresh_token",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Token refresh failed")
    return resp.json()
