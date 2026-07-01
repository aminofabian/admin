import { describe, expect, it } from 'vitest';
import {
  appendSanitizedGameBalanceFields,
  appendSanitizedGameEntriesFields,
  sanitizeGameActionEntriesInput,
  sanitizeGameActionNumericInput,
} from '../game-action-payload';

describe('sanitizeGameActionNumericInput', () => {
  it('strips currency formatting', () => {
    expect(sanitizeGameActionNumericInput('$1,234.50')).toBe('1234.50');
    expect(sanitizeGameActionNumericInput(' 500 ')).toBe('500');
  });

  it('rejects invalid values', () => {
    expect(sanitizeGameActionNumericInput('')).toBeNull();
    expect(sanitizeGameActionNumericInput('abc')).toBeNull();
    expect(sanitizeGameActionNumericInput('$')).toBeNull();
  });
});

describe('sanitizeGameActionEntriesInput', () => {
  it('truncates fractional entries to whole numbers', () => {
    expect(sanitizeGameActionEntriesInput('500.9')).toBe('500');
    expect(sanitizeGameActionEntriesInput('1,250')).toBe('1250');
  });
});

describe('appendSanitizedGameBalanceFields', () => {
  it('writes both balance field names', () => {
    const params = new URLSearchParams();
    expect(appendSanitizedGameBalanceFields(params, '$100.50')).toBe(true);
    expect(params.get('new_balance')).toBe('100.50');
    expect(params.get('new_game_balance')).toBe('100.50');
  });
});

describe('appendSanitizedGameEntriesFields', () => {
  it('writes both entries field names', () => {
    const params = new URLSearchParams();
    expect(appendSanitizedGameEntriesFields(params, '250')).toBe(true);
    expect(params.get('new_entries')).toBe('250');
    expect(params.get('entries')).toBe('250');
  });
});
