import { describe, expect, it } from 'vitest';
import { timeOfDayGreeting } from '../time-of-day-greeting';

function at(hour: number) {
  return new Date(2026, 10, 14, hour, 30);
}

describe('timeOfDayGreeting', () => {
  it.each([
    [5, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [21, 'Good evening'],
    [22, 'Working late'],
    [2, 'Working late'],
  ])('at %i:30 says %s', (hour, expected) => {
    expect(timeOfDayGreeting(at(hour))).toBe(expected);
  });
});
