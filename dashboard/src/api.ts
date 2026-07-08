export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface CheckResponse {
  authenticated: boolean;
  username?: string;
  permissions?: string[];
}

export interface LoginResponse {
  ok: boolean;
  username?: string;
  error?: string;
}
