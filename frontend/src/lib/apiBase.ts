/**
 * The base URL for all API and WebSocket calls.
 *
 * - In development on the same PC: Vite proxies /api/* and /socket.io/* to localhost:4000
 * - On a phone on the same WiFi: same proxy handles it transparently
 * - In production: set VITE_API_BASE_URL to your deployed backend URL
 *
 * Using '' (empty string / relative URL) means all requests go to whatever
 * host served the frontend — Vite proxy intercepts and forwards to the backend.
 */
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
    ? import.meta.env.VITE_API_BASE_URL
    : ''; // relative URL → Vite proxy → backend
