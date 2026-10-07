import { describe, expect, it } from 'vitest';

import {
  PASSWORD_MIN_LENGTH,
  evaluatePassword,
  getConfirmPasswordError,
  validateRegistration,
} from './passwordStrength.js';

describe('evaluatePassword', () => {
  it('scores an empty password as the weakest', () => {
    const result = evaluatePassword();
    expect(result.score).toBe(0);
    expect(result.label).toBe('Too weak');
    expect(result.isValid).toBe(false);
    expect(result.checks).toHaveLength(5);
    expect(result.checks.some((check) => check.met)).toBe(false);
  });

  it('treats non-string input as empty', () => {
    expect(evaluatePassword(null).score).toBe(0);
  });

  it('does not count anything until the minimum length is met', () => {
    const result = evaluatePassword('aB1!');
    expect(result.isValid).toBe(false);
    expect(result.score).toBe(0);
    expect(result.checks.find((check) => check.id === 'length').met).toBe(false);
    expect(result.checks.find((check) => check.id === 'upper').met).toBe(true);
  });

  it('scores a length-only password as weak', () => {
    const result = evaluatePassword('aaaaaaaa');
    expect(result.score).toBe(1);
    expect(result.label).toBe('Weak');
    expect(result.isValid).toBe(true);
  });

  it('increases the score as character classes are added', () => {
    expect(evaluatePassword('aaaaaaaa').score).toBe(1);
    expect(evaluatePassword('aaaaaaaA').score).toBe(2);
    expect(evaluatePassword('aaaaaaA1').score).toBe(3);
    expect(evaluatePassword('aaaaaA1!').score).toBe(4);
  });

  it('caps the score at 4 for a strong password', () => {
    const result = evaluatePassword('Abcd1234!@#$');
    expect(result.score).toBe(4);
    expect(result.label).toBe('Strong');
  });

  it('reports every requirement with its label and state', () => {
    const { checks } = evaluatePassword('Abcd1234!');
    expect(checks.map((check) => check.id)).toEqual([
      'length',
      'lower',
      'upper',
      'digit',
      'symbol',
    ]);
    expect(checks.every((check) => check.met)).toBe(true);
  });
});

describe('getConfirmPasswordError', () => {
  it('stays quiet until the confirmation has content', () => {
    expect(getConfirmPasswordError('secret123', '')).toBe('');
  });

  it('is quiet when the passwords match', () => {
    expect(getConfirmPasswordError('secret123', 'secret123')).toBe('');
  });

  it('flags a mismatch', () => {
    expect(getConfirmPasswordError('secret123', 'secret124')).toBe('Passwords do not match');
  });
});

describe('validateRegistration', () => {
  it('rejects a short password with the backend message', () => {
    expect(validateRegistration({ password: 'short', confirmPassword: 'short' })).toBe(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  });

  it('rejects mismatched passwords', () => {
    expect(validateRegistration({ password: 'longenough', confirmPassword: 'other' })).toBe(
      'Passwords do not match',
    );
  });

  it('accepts a valid pair', () => {
    expect(validateRegistration({ password: 'longenough', confirmPassword: 'longenough' })).toBe(
      '',
    );
  });

  it('tolerates a missing argument', () => {
    expect(validateRegistration()).toBe(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  });
});
