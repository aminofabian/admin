'use client';

import { useState, useEffect } from 'react';
import {
  hasNotificationPermission,
  requestNotificationPermission,
  notifyNewMessage,
} from '@/lib/utils/notification-sound';
import { subscribeToPush } from '@/lib/push';
import { Bell } from 'lucide-react';

/**
 * Prompts user to enable notifications. Clicking unlocks BOTH:
 * - Browser notifications (system sound) – ONLY way to hear sound when admin tab
 *   is in background or another tab has video
 * - In-page sound when this tab is focused
 */
export function NotificationSoundEnabler() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    setShow(!hasNotificationPermission());
  }, [mounted]);

  const handleClick = async () => {
    setLoading(true);
    const granted = await requestNotificationPermission();
    setLoading(false);
    if (granted) {
      setShow(false);
      notifyNewMessage({ senderName: 'Test', preview: 'Sound enabled! You will hear new messages.' });
      subscribeToPush().catch(() => {}); // Push subscription for when tab is in background
    }
  };

  if (!show || !mounted) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 transition-colors border border-amber-500/30 disabled:opacity-60"
      aria-label="Enable message notifications (required for sound when another tab has video)"
      title="Required for sound when you're in other tabs or watching video"
    >
      <Bell className="w-3.5 h-3.5" />
      {loading ? 'Enabling…' : 'Enable notifications'}
    </button>
  );
}
