// All API calls use relative paths.
// In dev, Vite proxies /api/* and /socket.io/* to the Python backend on port 8000.
// In production, serve both from the same origin or set API_BASE_URL.

export const API_BASE_URL = "";

export const endpoints = {
  transcribeLink: `${API_BASE_URL}/api/transcribe/link`,
  transcribeFile: `${API_BASE_URL}/api/transcribe/file`,
  chat: `${API_BASE_URL}/api/chat`,
};
