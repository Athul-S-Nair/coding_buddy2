export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'

const TOKEN_KEY = 'cb_token'

// Auth token persisted client-side. Sent as a Bearer header so auth works
// across origins (e.g. Vercel frontend + Render backend), where third-party
// cookies are blocked by browsers like Safari.
export function setToken(token: string) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(TOKEN_KEY, token) } catch (e) {}
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(TOKEN_KEY) } catch (e) { return null }
}

export function clearToken() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(TOKEN_KEY) } catch (e) {}
}

// Authorization header for authenticated requests. Empty when no token is stored.
export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
