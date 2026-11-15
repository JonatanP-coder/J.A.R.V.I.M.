import { activeLanguage, translateCurrent } from '../i18n/integratedCopy';
export const STORAGE_KEY = 'jamt:academy:v1';
export function readStored<T>(key: string, fallback: T, validate?: (v: unknown) => boolean): T {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value && (!validate || validate(value)) ? value : fallback; } catch { return fallback; }
}
export function writeStored(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function downloadJSON(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function academyRequest(path: string, body?: unknown, credentials: RequestCredentials = 'same-origin') {
  let res: Response;
  try { res = await fetch('/api/academy/' + path, { method: body === undefined ? 'GET' : 'POST', credentials, headers: { 'Content-Type': 'application/json', 'Accept-Language': activeLanguage() }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) }); }
  catch { throw new Error(translateCurrent('No se pudo conectar con la academia.')); }
  const data = await res.json(); if (!res.ok) throw new Error(translateCurrent(data.error || 'No se pudo conectar con la academia.')); return data;
}
