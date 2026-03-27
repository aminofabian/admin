/**
 * Message notifications - dual approach for reliability:
 * 1. Browser Notifications (system sound) - ONLY way to hear sound when admin tab
 *    is in background / another tab has video. Requires permission + OS sound on.
 * 2. Web Audio - when THIS tab is visible, plays in-page sound after "Enable" click.
 *
 * When another tab has video: in-page audio is blocked. Browser Notifications
 * are the only option - user must grant permission and ensure OS plays notification sounds.
 */

const PLAY_COOLDOWN_MS = 800;
const PERMISSION_KEY = 'notification_permission_granted';

function canUseNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Unlock audio for this page. MUST run synchronously during a user gesture.
 * Uses full-volume HTML5 Audio – quiet sounds may not satisfy autoplay.
 */
function unlockWebAudio(): void {
  // TODO: muted — see playNotificationSound
  return;
}

/** Play in-page sound immediately – used during user gesture to prime. */
function playInPageSoundNow(): void {
  try {
    tryInPageSound();
  } catch {
    /* ignore */
  }
}

/**
 * Request notification permission AND unlock audio (same user gesture).
 * Plays the actual notification sound during the gesture to prime the page.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!canUseNotifications()) return false;

  // MUST run during gesture – no await before this
  unlockWebAudio();
  playInPageSoundNow(); // Prime the exact sound path we use for notifications

  if (Notification.permission === 'granted') return true;
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    try {
      sessionStorage.setItem(PERMISSION_KEY, '1');
    } catch {
      /* ignore */
    }
    return true;
  }
  return false;
}

/**
 * Whether we have permission to show notifications.
 */
export function hasNotificationPermission(): boolean {
  if (!canUseNotifications()) return false;
  return Notification.permission === 'granted';
}

let lastNotifiedAt = 0;

export interface NotifyMessageOptions {
  senderName?: string;
  preview?: string;
}

/**
 * Show a browser notification for a new message. Plays system sound - works always
 * when permission is granted, regardless of autoplay policy or other tabs.
 */
export function notifyNewMessage(options: NotifyMessageOptions = {}): void {
  // TODO: muted — see playNotificationSound
  return;
  if (!canUseNotifications() || Notification.permission !== 'granted') return;

  const { senderName = 'Player', preview = 'New message' } = options;
  const title = `New message from ${senderName}`;
  const body = preview.length > 100 ? `${preview.slice(0, 97)}...` : preview;

  try {
    const n = new Notification(title, {
      body,
      icon: '/vercel.svg',
      tag: `chat-${Date.now()}`,
      requireInteraction: false,
      silent: false, // Explicitly request sound
    } as NotificationOptions);
    n.onclick = () => {
      window.focus();
      n.close();
    };
    setTimeout(() => n.close(), 4000);
  } catch {
    /* ignore */
  }
}

/**
 * Notify about new message:
 * 1. Browser Notification (system sound) - works when tab in background, other tab has video.
 *    ONLY way to hear sound in that scenario. User must grant permission + enable OS sound.
 * 2. In-page sound - ONLY when this tab is visible (document.hidden=false). Web Audio
 *    is suspended in background tabs and will never play.
 */
export function playNotificationSound(options?: NotifyMessageOptions): void {
  // TODO: sound fires at random times — muted until logic is refined
  return;
  try {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    if (now - lastNotifiedAt < PLAY_COOLDOWN_MS) return;
    lastNotifiedAt = now;

    if (hasNotificationPermission()) {
      notifyNewMessage(options);
    }

    // In-page sound only when this tab is visible - blocked/suspended when background
    if (!document.hidden) {
      tryInPageSound();
    }
  } catch {
    /* Never let notification sound break caller */
  }
}

/** Generate a minimal WAV beep for HTML5 Audio fallback */
function createBeepDataUri(): string {
  const sampleRate = 8000;
  const duration = 0.15;
  const freq = 880;
  const numSamples = Math.floor(sampleRate * duration);
  const data = new Uint8Array(44 + numSamples * 2);
  const view = new DataView(data.buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) data[offset + i] = str.charCodeAt(i);
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.8;
    const s = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, s, true);
  }
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]!);
  return 'data:audio/wav;base64,' + btoa(binary);
}

let beepDataUri: string | null = null;

function tryInPageSound(): void {
  // 1. Web Audio - louder two-tone for when tab is visible
  try {
    const ctx = getAudioContext();
    if (ctx && (ctx.state === 'running' || ctx.state === 'suspended')) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.06);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      return;
    }
  } catch {
    /* fall through to Audio element */
  }

  // 2. HTML5 Audio fallback - can work when Web Audio is suspended
  try {
    if (!beepDataUri) beepDataUri = createBeepDataUri();
    const a = new Audio(beepDataUri ?? undefined);
    a.volume = 0.8;
    a.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new Ctx();
  }
  return audioContext;
}

export function isNotificationSoundReady(): boolean {
  return hasNotificationPermission();
}

export async function enableNotificationSound(): Promise<boolean> {
  return requestNotificationPermission();
}

/**
 * Attach listeners so first interaction unlocks audio. Call when dashboard mounts.
 * Uses bubble phase (no capture) so the gesture is recognized for autoplay.
 */
export function attachUnlockListeners(): void {
  if (typeof document === 'undefined') return;
  const run = () => unlockWebAudio();
  const opts = { once: true } as AddEventListenerOptions;
  document.addEventListener('mousedown', run, opts);
  document.addEventListener('click', run, opts);
  document.addEventListener('keydown', run, opts);
  document.addEventListener('touchstart', run, opts);
}

/** @deprecated */
export const unlockAudioOnFirstInteraction = attachUnlockListeners;
