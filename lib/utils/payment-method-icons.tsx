'use client';

import type { ReactNode } from 'react';

const iconClass = 'w-5 h-5';

/** Payment logos from /public/payment-logos/ – maps normalized keys to path */
const PAYMENT_LOGOS: Record<string, string> = {
  alchemypay: '/payment-logos/alchemy pay.png',
  alchemy: '/payment-logos/alchemy pay.png',
  apex: '/payment-logos/apex.png',
  banxa: '/payment-logos/banxa.png',
  binpay: '/payment-logos/binpay.png',
  card: '/payment-logos/card.png',
  cards: '/payment-logos/card.png',
  cashapp: '/payment-logos/cashapp.png',
  chime: '/payment-logos/chime.png',
  litecoin: '/payment-logos/litecoin.png',
  ltc: '/payment-logos/litecoin.png',
  moonpay: '/payment-logos/moonpay.png',
  paypal: '/payment-logos/paypal.png',
  pay_pal: '/payment-logos/paypal.png',
  rampnetwork: '/payment-logos/ramp network.png',
  ramp: '/payment-logos/ramp network.png',
  robinhood: '/payment-logos/robinhood.png',
  stripe: '/payment-logos/stripe.png',
  tap: '/payment-logos/tap.png',
  tierlock: '/payment-logos/tierlock.png',
  topperpay: '/payment-logos/topper pay.png',
  topper: '/payment-logos/topper pay.png',
  unlimit: '/payment-logos/unlimit.png',
  venmo: '/payment-logos/venmo.png',
  visa: '/payment-logos/visa.png',
  wert: '/payment-logos/wert.png',
};

/** Renders a payment logo image when available */
function PaymentLogoImage({ src, sizeClass }: { src: string; sizeClass: string }) {
  const size = sizeClass === 'w-4 h-4' ? 16 : sizeClass === 'w-6 h-6' ? 24 : 20;
  const encodedSrc = src.includes(' ') ? src.replace(/ /g, '%20') : src;
  const padding = sizeClass === 'w-4 h-4' ? 'p-0.5' : sizeClass === 'w-6 h-6' ? 'p-1' : 'p-1';
  return (
    <span
      className={`
        relative flex shrink-0 items-center justify-center overflow-hidden
        rounded-xl border border-border/50 dark:border-border/60
        bg-gradient-to-br from-white to-muted/30
        dark:bg-slate-800 dark:from-slate-800 dark:to-slate-700/90
        shadow-sm dark:shadow-none ring-1 ring-black/5 dark:ring-white/5
        hover:shadow-md hover:ring-primary/20 dark:hover:ring-primary/30 transition-all duration-200
        ${sizeClass}
      `}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={encodedSrc}
        alt=""
        width={size}
        height={size}
        className={`block h-full w-full object-contain ${padding}`}
        loading="eager"
      />
    </span>
  );
}

/** Card / credit card icon */
const CardIcon = ({ className = iconClass }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);

/** Bitcoin icon */
const BitcoinIcon = ({ className = iconClass }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z" fill="#F7931A" />
    <path d="M17.065 10.255c.263-1.763-1.078-2.715-2.91-3.353l.595-2.383-1.452-.362-.58 2.324c-.382-.095-.774-.184-1.165-.273l.584-2.34-1.452-.362-.595 2.383c-.315-.072-.625-.14-.927-.212l.002-.007-2.005-.5-.387 1.549s1.078.247 1.055.262c.588.147.694.535.676.843l-.678 2.72c.041.01.094.023.153.045l-.156-.039-1.006 4.028c-.076.166-.268.415-.701.32.015.022-1.056-.263-1.056-.263l-.722 1.68 1.894.472c.352.088.696.18 1.036.267l-.6 2.405 1.45.362.595-2.384c.397.09.782.173 1.155.252l-.593 2.375 1.451.362.595-2.383c2.48.47 4.345.281 5.13-1.967.63-1.81-.031-2.854-1.334-3.532.95-.219 1.665-.84 1.855-2.164zm-3.755 4.367c-.448 1.798-3.475.825-4.458.582l.795-3.19c.984.246 4.137.736 3.663 2.608zm.448-4.352c-.407 1.636-2.916.806-3.728.602l.72-2.892c.813.203 3.419.494 3.008 2.29z" fill="#fff" />
  </svg>
);

/** Lightning / Bitcoin Lightning icon */
const LightningIcon = ({ className = iconClass }: { className?: string }) => (
  <svg className={className} fill="#FFB800" viewBox="0 0 24 24">
    <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
  </svg>
);

/** Generic crypto / wallet icon */
const CryptoIcon = ({ className = iconClass }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25H21M3 12a2.25 2.25 0 012.25 2.25H9a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 009 3.75H3m0 8.25a2.25 2.25 0 012.25 2.25v6A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25v-6a2.25 2.25 0 012.25-2.25H3z" />
  </svg>
);

/** Bank / wire transfer icon */
const BankIcon = ({ className = iconClass }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
  </svg>
);

/** BTCPay – Bitcoin payment processor */
const BtcpayIcon = ({ className = iconClass }: { className?: string }) => (
  <BitcoinIcon className={className} />
);

/** Default payment icon */
const DefaultPaymentIcon = ({ className = iconClass }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);

/** Fallback: first letter as badge */
const InitialIcon = ({ letter, className = 'w-8 h-8 text-xs font-bold' }: { letter: string; className?: string }) => (
  <span className={`flex items-center justify-center rounded-lg bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary shrink-0 ${className}`}>
    {letter}
  </span>
);

const normalizeKey = (s: string) => s?.toLowerCase().replace(/[\s_-]+/g, '') ?? '';

function resolveIcon(
  key: string,
  sizeClass: string,
  paymentMethod: string | null | undefined,
  methodType: string | null | undefined,
  asInitialFallback: boolean,
  providerKey?: string
): ReactNode {
  const typeKey = normalizeKey(methodType ?? '');

  // Payment logos (check first – use images when available)
  const logoKeys = [key, typeKey, providerKey].filter(Boolean);
  for (const k of logoKeys) {
    const exact = PAYMENT_LOGOS[k];
    if (exact) return <PaymentLogoImage src={exact} sizeClass={sizeClass} />;
  }
  const sortedLogoEntries = Object.entries(PAYMENT_LOGOS).sort(([a], [b]) => b.length - a.length);
  const allKeys = [key, typeKey, providerKey].filter(Boolean);
  for (const [logoKey, src] of sortedLogoEntries) {
    if (allKeys.some((k) => k.startsWith(logoKey))) {
      return <PaymentLogoImage src={src} sizeClass={sizeClass} />;
    }
  }

  // Providers (SVG fallback when no logo)
  if (/^btcpay|^btc_pay/.test(key) || /^btcpay/.test(typeKey)) {
    return <BtcpayIcon className={sizeClass} />;
  }

  // Main categories
  if (/^card$|^cards$|^credit|^debit/.test(key) || /^card/.test(typeKey)) {
    return <CardIcon className={sizeClass} />;
  }
  if (/^bitcoinlightning|^bitcoin_lightning|^lightning$|^ln$|^lnbtc/.test(key) || /^bitcoinlightning|^lightning|^ln/.test(typeKey)) {
    return <LightningIcon className={sizeClass} />;
  }
  if (/^bitcoin$|^btc$/.test(key) || /^bitcoin$|^btc/.test(typeKey)) {
    return <BitcoinIcon className={sizeClass} />;
  }
  if (/^crypto$|^cryptocurrency|^eth$|^ethereum|^usdt|^usdc/.test(key) || /^crypto/.test(typeKey)) {
    return <CryptoIcon className={sizeClass} />;
  }
  if (/^bank$|^wire|^transfer|^sepa/.test(key)) {
    return <BankIcon className={sizeClass} />;
  }

  if (asInitialFallback && paymentMethod?.trim()) {
    const letter = paymentMethod.trim().charAt(0).toUpperCase();
    const initialSize = sizeClass === 'w-4 h-4' ? 'w-6 h-6' : sizeClass === 'w-6 h-6' ? 'w-10 h-10' : 'w-8 h-8';
    return <InitialIcon letter={letter} className={`${initialSize} text-xs font-bold`} />;
  }

  return <DefaultPaymentIcon className={sizeClass} />;
}

/**
 * Returns the appropriate icon for a payment method.
 * Uses paymentMethod and optional methodType for matching.
 */
export function getPaymentMethodIcon(
  paymentMethod: string | null | undefined,
  options?: { size?: 'sm' | 'md' | 'lg'; methodType?: string | null; providerPaymentMethod?: string | null; asInitialFallback?: boolean }
): ReactNode {
  const key = normalizeKey(paymentMethod ?? '');
  const size = options?.size ?? 'md';
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const asInitialFallback = options?.asInitialFallback ?? false;
  const methodType = options?.methodType ?? null;
  const providerKey = normalizeKey(options?.providerPaymentMethod ?? '');

  const typeKey = normalizeKey(methodType ?? '');
  return resolveIcon(key, sizeClass, paymentMethod, typeKey || undefined, asInitialFallback, providerKey || undefined);
}
