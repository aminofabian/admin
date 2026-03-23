/**
 * Browser push notifications - subscribes to backend push service.
 * Requires: GET /users/push/config/, POST /users/push/subscribe/
 * Service worker must be at /sw.js on the frontend origin (HTTPS).
 */

import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';

function getAuthHeaders(): HeadersInit {
  const token = storage.get(TOKEN_KEY);
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function base64UrlToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface PushConfig {
  publicKey?: string;
  vapidPublicKey?: string;
  public_key?: string;
  vapid_public_key?: string;
}

/** Fetch push config (VAPID public key) from backend */
export async function getPushConfig(): Promise<PushConfig> {
  const res = await fetch('/api/push-config', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch push config');
  return res.json();
}

function extractVapidKey(config: PushConfig): string {
  return (
    config.publicKey ??
    config.vapidPublicKey ??
    config.public_key ??
    config.vapid_public_key ??
    ''
  );
}

/** Register the service worker. Call before subscribing. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers not supported');
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return reg;
}

/** Subscribe to push and send subscription to backend */
export async function subscribeToPush(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const config = await getPushConfig();
    const vapidKey = extractVapidKey(config);
    if (!vapidKey) throw new Error('No VAPID public key in config');

    const reg = await registerServiceWorker();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidKey),
    });

    const body = sub.toJSON();
    const res = await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Subscribe failed');
    return true;
  } catch {
    return false;
  }
}

/** Unsubscribe from push (removes from backend) */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    const body = sub.toJSON();
    await fetch('/api/push-unsubscribe', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    await sub.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

/** Trigger a test push from the backend */
export async function sendTestPush(): Promise<boolean> {
  try {
    const res = await fetch('/api/push-test', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
    return res.ok;
  } catch {
    return false;
  }
}
