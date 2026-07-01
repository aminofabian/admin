import { describe, expect, it } from 'vitest';
import {
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
