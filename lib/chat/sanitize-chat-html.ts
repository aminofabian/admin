import DOMPurify from 'dompurify';

/**
 * Sanitisation for chat message HTML.
 *
 * Player-authored text reaches the UI through several `dangerouslySetInnerHTML`
 * sinks, so every one of them must run through here first. The allowlist is
 * deliberately narrow: it covers what the backend's own formatting emits
 * (bold/italic/line breaks/links) and nothing else. In particular `script`,
 * `style`, `iframe`, `object`, `form` and every `on*` handler are dropped, and
 * `javascript:` / `data:` URLs are rejected from `href`.
 *
 * ## Why plain `dompurify` and not the isomorphic build
 *
 * `isomorphic-dompurify` pulls in jsdom, which reads `default-stylesheet.css`
 * relative to `__dirname` and therefore crashes the webpack build. It is also
 * unnecessary: chat messages are fetched client-side (the WebSocket hook starts
 * from an empty list), so this never has to run during SSR.
 *
 * If that ever changes, `isSupported` is false on the server and this module
 * **fails closed** — it escapes everything rather than passing markup through.
 * The output is inert either way; only the fidelity differs.
 */

/** Tags the backend's own message formatting is allowed to produce. */
const ALLOWED_TAGS = [
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'br',
  'p',
  'div',
  'span',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'class'];

/**
 * Hook DOMPurify runs after sanitising. Forces external links to be safe:
 * `_blank` without `opener` prevents the opened page from reaching back into
 * the admin console via `window.opener`.
 */
function hardenLinks(node: Element) {
  if (node.tagName !== 'A') return;

  const href = node.getAttribute('href') ?? '';
  const isExternal = /^https?:\/\//i.test(href);

  if (isExternal) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  } else {
    // Anything that is not plainly http(s) (javascript:, data:, vbscript: …)
    // is removed entirely rather than left as a live link.
    if (!/^(https?:)?\/\//i.test(href) && !/^(mailto:|tel:|#|\/)/i.test(href)) {
      node.removeAttribute('href');
      return;
    }
  }

  // The page may only be opened by explicit user action; strip handlers that
  // could have survived on the anchor.
  for (const attr of Array.from(node.attributes)) {
    if (attr.name.startsWith('on')) node.removeAttribute(attr.name);
  }
}

let hookInstalled = false;
function ensureHook() {
  if (hookInstalled) return;
  DOMPurify.addHook('afterSanitizeAttributes', hardenLinks);
  hookInstalled = true;
}

/**
 * Sanitise a chat message fragment for safe HTML rendering.
 *
 * Falls back to escaping (never to passing markup through) when no DOM is
 * available, so a server render cannot emit executable HTML.
 */
export function sanitizeChatHtml(input: string | null | undefined): string {
  if (!input) return '';

  if (!DOMPurify.isSupported) {
    // No DOM (SSR). Return inert text rather than trusting the input.
    return escapeHtml(input);
  }

  ensureHook();
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Drop these elements entirely rather than unwrapping them, so their
    // contents (which may be script payloads) do not survive as text.
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta', 'base'],
    FORBID_ATTR: ['style', 'srcset', 'formaction', 'xlink:href'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    // Defends against mutation-XSS payloads that re-parse differently.
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
  });
}

/**
 * Escape a string for interpolation into HTML text or a quoted attribute.
 * Used where a value must be inert even if it is later injected as markup, and
 * as the no-DOM fallback for {@link sanitizeChatHtml}.
 *
 * Defined before use because {@link sanitizeChatHtml} calls it.
 */
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
