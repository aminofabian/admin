import { describe, it, expect } from 'vitest';
import { buildUpstreamError, createErrorRequestId } from '../upstream-error';

const build = (status: number, body: string) =>
  buildUpstreamError(status, body, 'req_test');

describe('buildUpstreamError', () => {
  it('never returns a Python traceback', () => {
    const traceback = [
      'Traceback (most recent call last):',
      '  File "/usr/lib/python3.11/site-packages/django/db/models/query.py", line 620, in get',
      '    return self._result_cache[k]',
      'KeyError: 42',
    ].join('\n');
    const { message, detail } = build(500, traceback);
    expect(message).not.toContain('Traceback');
    expect(message).not.toContain('site-packages');
    expect(detail).not.toContain('/usr/lib');
  });

  it('never returns a Django HTML error page', () => {
    const html = '<!DOCTYPE html><html><head><title>Server Error (500)</title></head><body><h1>Server Error</h1></body></html>';
    const { message, detail } = build(500, html);
    expect(message).not.toContain('<');
    expect(message).not.toContain('DOCTYPE');
    expect(detail).not.toContain('<');
  });

  it('surfaces a clean backend message', () => {
    const { message } = build(400, JSON.stringify({ message: 'Chatroom not found' }));
    expect(message).toBe('Chatroom not found');
  });

  it('surfaces field-level validation errors in the detail field clients expect', () => {
    // players/agents/games dashboards parse `detail` as a field-error payload.
    const body = JSON.stringify({
      message: 'Validation failed',
      errors: { balance: ['Must be a number'], username: ['Too short'] },
    });
    const { message, detail } = build(400, body);
    expect(message).toBe('Validation failed');
    expect(detail).toContain('balance');
    expect(detail).toContain('Must be a number');
  });

  it('keeps a short plain-text body', () => {
    const { message } = build(404, 'Not found');
    expect(message).toBe('Not found');
  });

  it('falls back to a generic message on an empty body', () => {
    const { message } = build(503, '');
    expect(message).toMatch(/could not be completed/i);
  });

  it('always returns a non-empty detail so existing UI fallbacks work', () => {
    for (const body of ['', 'x', '<html></html>', '{}', 'not json']) {
      expect(build(500, body).detail.length).toBeGreaterThan(0);
    }
  });

  it('passes the upstream status through without leaking status text', () => {
    const { upstreamStatus, message } = build(502, '');
    expect(upstreamStatus).toBe(502);
    expect(message).not.toContain('Bad Gateway');
  });

  it('caps a very long message', () => {
    const { message } = build(500, 'y'.repeat(5000));
    expect(message.length).toBeLessThanOrEqual(200);
  });
});

describe('createErrorRequestId', () => {
  it('produces a distinct id per call', () => {
    const ids = new Set(Array.from({ length: 50 }, createErrorRequestId));
    expect(ids.size).toBe(50);
  });

  it('is prefixed for easy log correlation', () => {
    expect(createErrorRequestId()).toMatch(/^req_/);
  });
});
