export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

type ApiOptions = RequestInit & { skipAuth?: boolean };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = localStorage.getItem('schoolos_token');
  if (token && !options.skipAuth) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `API error ${response.status}`);
  return payload as T;
}

export type SessionUser = { id: string; firstName: string; lastName: string; email: string; roles: string[]; school: string };
export type LoginResponse = { token: string; user: SessionUser };

export async function apiBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem('schoolos_token');
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error ?? `API error ${response.status}`); }
  return response.blob();
}
