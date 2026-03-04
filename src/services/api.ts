// All API calls use relative paths.
// In dev, Vite proxies /api/* and /socket.io/* to the Python backend on port 8000.

export const API_BASE_URL = "";

export const endpoints = {
  transcribeLink: `${API_BASE_URL}/api/transcribe/link`,
  transcribeFile: `${API_BASE_URL}/api/transcribe/file`,
  chat: `${API_BASE_URL}/api/chat`,
  authGoogle: `${API_BASE_URL}/api/auth/google`,
  authRefresh: `${API_BASE_URL}/api/auth/refresh`,
};
