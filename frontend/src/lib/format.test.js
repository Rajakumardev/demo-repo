import { describe, expect, it } from 'vitest';

import {
  buildQuery,
  formatCurrency,
  formatDate,
  monthLabel,
  toDateInput,
  toISODate,
} from './format.js';

describe('formatCurrency', () => {
  it('formats a numeric amount', () => {
    expect(formatCurrency(1234.5, 'USD')).toMatch(/1,234\.50/);
  });

  it('coerces non-numeric input to zero', () => {
    expect(formatCurrency('not a number', 'USD')).toMatch(/0\.00/);
  });

  it('falls back to a plain string for an invalid currency code', () => {
    expect(formatCurrency(5, 'NOTACURRENCY')).toBe('NOTACURRENCY 5.00');
  });
});

describe('toISODate', () => {
  it('formats a local Date without a UTC shift', () => {
    expect(toISODate(new Date(2026, 0, 2))).toBe('2026-01-02');
  });

  it('accepts a parseable string', () => {
    expect(toISODate('2026-03-04T12:00:00')).toBe('2026-03-04');
  });

  it('returns an empty string for invalid dates', () => {
    expect(toISODate('nonsense')).toBe('');
  });
});

describe('toDateInput', () => {
  it('returns an empty string for falsy values', () => {
    expect(toDateInput()).toBe('');
    expect(toDateInput(null)).toBe('');
  });

  it('formats a provided value', () => {
    expect(toDateInput(new Date(2026, 5, 7))).toBe('2026-06-07');
  });
});

describe('formatDate', () => {
  it('uses an em dash for empty or invalid values', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate('nonsense')).toBe('—');
  });

  it('formats a valid date', () => {
    expect(formatDate(new Date(2026, 0, 2))).toMatch(/2026/);
  });
});

describe('monthLabel', () => {
  it('returns an empty string without input', () => {
    expect(monthLabel('')).toBe('');
  });

  it('renders a month and 2-digit year', () => {
    const label = monthLabel('2026-10');
    expect(label).toMatch(/26/);
    expect(label).toMatch(/Oct/);
  });
});

describe('buildQuery', () => {
  it('returns an empty string for no params', () => {
    expect(buildQuery()).toBe('');
  });

  it('skips empty values and encodes the rest', () => {
    expect(buildQuery({ a: 1, b: null, c: undefined, d: '', e: 'x y' })).toBe('?a=1&e=x+y');
  });
});
