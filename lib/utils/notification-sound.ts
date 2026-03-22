/**
 * Notification sound using Web Audio API.
 * Browsers block audio until the AudioContext is created/resumed during a user gesture.
 * We must create the context ON FIRST CLICK - lazy creation in the gesture handler unlocks it.
 */
let audioContext: AudioContext | null = null;
let lastPlayedAt = 0;
const PLAY_COOLDOWN_MS = 600;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  return audioContext;
}

/**
 * Creates and unlocks the AudioContext. MUST be called from a user gesture (click, keydown, touch).
 * Plays a tiny silent buffer during the gesture to fully unlock the audio pipeline.
 */
function createAndUnlockContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext) {
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
    return audioContext;
  }
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  audioContext = new Ctx();

  // Play a 1ms silent buffer during the user gesture - this fully "unlocks" audio for the tab
  try {
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch {
    // Ignore - some browsers may block even this
  }

  return audioContext;
}

/**
 * Sets up one-time listeners to create/unlock audio on first user interaction.
 * Listeners on both document and window to catch all interaction types (sidebar, modals, etc.).
 */
export function unlockAudioOnFirstInteraction(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const unlock = () => {
    createAndUnlockContext();
  };

  const opts = { once: true, capture: true } as AddEventListenerOptions;

  document.addEventListener('click', unlock, opts);
  document.addEventListener('keydown', unlock, opts);
  document.addEventListener('touchstart', unlock, opts);
  window.addEventListener('click', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
  window.addEventListener('touchstart', unlock, opts);
}

export async function playNotificationSound(): Promise<void> {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (now - lastPlayedAt < PLAY_COOLDOWN_MS) return;
  lastPlayedAt = now;

  // Context may not exist yet if user hasn't clicked - create on first play attempt won't work
  // (browser blocks it). User must click first via unlockAudioOnFirstInteraction().
  const ctx = getAudioContext();
  if (!ctx || ctx.state === 'suspended') return;

  try {

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(660, ctx.currentTime);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.05);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25, ctx.currentTime + 0.25);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  } catch {
    // Silently fail if audio is blocked
  }
}
