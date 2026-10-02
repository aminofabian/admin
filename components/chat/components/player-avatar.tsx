'use client';

import { useEffect, useState } from 'react';

/**
 * Player avatar with an initials fallback.
 *
 * `ChatUser.avatar` is a URL, not an image element. Rendering
 * `{player.avatar || initials}` inside a styled circle put a clipped URL
 * fragment where the picture should be, for every player with an uploaded
 * picture. This component renders the image when there is a usable URL and the
 * initial otherwise.
 *
 * A plain `<img>` is used rather than `next/image` on purpose: avatar URLs are
 * player-supplied and can come from any host, which `images.remotePatterns`
 * would reject at runtime with an error. These are 24–32px circles, so the
 * image optimiser buys nothing here.
 */

/** Only real http(s) URLs are rendered; anything else falls back to initials. */
function isRenderableUrl(value: string | undefined | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

interface PlayerAvatarProps {
  avatarUrl?: string | null;
  username: string;
  /** Rendered width/height in pixels. */
  size?: number;
  className?: string;
  /** Gradient/initials styling. */
  wrapperClassName?: string;
}

export function PlayerAvatar({
  avatarUrl,
  username,
  size = 28,
  className = '',
  wrapperClassName = '',
}: PlayerAvatarProps) {
  const initial = username?.charAt(0).toUpperCase() || '?';
  const src = isRenderableUrl(avatarUrl) ? avatarUrl : null;

  // A URL that 404s (deleted upload, dead CDN link) must not leave a broken
  // image icon in the transcript.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const base =
    'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white shadow-md ring-2 ring-white/20 dark:ring-white/10';

  if (!src || failed) {
    return (
      <div
        className={`${base} bg-gradient-to-br from-blue-500 to-indigo-500 text-[10px] ${wrapperClassName} ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={`${base} bg-muted ${wrapperClassName} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- player avatars
          come from arbitrary user-supplied hosts that images.remotePatterns
          cannot enumerate; these are 24–32px circles where the optimiser adds
          nothing. */}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
