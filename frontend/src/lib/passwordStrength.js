/**
 * Password guidance and registration validation.
 *
 * The backend only enforces a minimum length (`backend/src/utils/schemas.js`:
 * `min(8).max(128)`), so the character-class checks below are advisory: they
 * power the live checklist and strength meter but never block submission.
 * Keeping the policy in one place makes it easy to tighten both sides together
 * later without the UI and the API drifting apart.
 */

export const PASSWORD_MIN_LENGTH = 8;

const MIN_LABEL = `At least ${PASSWORD_MIN_LENGTH} characters`;
// Mirrors the backend message in `backend/src/utils/schemas.js`.
const MIN_LENGTH_ERROR = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;

const SCORE_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

/** Ordered requirements shown in the checklist under the password field. */
export const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: MIN_LABEL, test: (value) => value.length >= PASSWORD_MIN_LENGTH },
  { id: 'lower', label: 'A lowercase letter', test: (value) => /[a-z]/.test(value) },
  { id: 'upper', label: 'An uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { id: 'digit', label: 'A number', test: (value) => /\d/.test(value) },
  { id: 'symbol', label: 'A symbol', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

/**
 * Evaluate a password against the requirement list.
 *
 * @param {string} password
 * @returns {{ score: number, label: string, isValid: boolean, checks: Array<{ id: string, label: string, met: boolean }> }}
 *   `score` is 0–4: 0 while the minimum length is unmet, otherwise it
 *   grows with each satisfied requirement (length only → 1, all → 4).
 */
export function evaluatePassword(password = '') {
  const value = typeof password === 'string' ? password : '';

  const checks = PASSWORD_REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    met: requirement.test(value),
  }));

  const hasMinimum = checks.find((check) => check.id === 'length')?.met ?? false;
  const metCount = checks.filter((check) => check.met).length;
  const score = hasMinimum ? Math.min(4, Math.max(1, metCount - 1)) : 0;

  return { score, label: SCORE_LABELS[score], isValid: hasMinimum, checks };
}

/**
 * Inline error for the confirm-password field.
 *
 * Returns an empty string until the user has typed something in the
 * confirmation field, so a fresh form is not marked as invalid.
 */
export function getConfirmPasswordError(password, confirmPassword) {
  if (!confirmPassword || password === confirmPassword) return '';
  return 'Passwords do not match';
}

/**
 * Validate the registration form on submit. Returns an error message or an
 * empty string when the form is valid.
 */
export function validateRegistration({ password = '', confirmPassword = '' } = {}) {
  if (password.length < PASSWORD_MIN_LENGTH) return MIN_LENGTH_ERROR;
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
}
