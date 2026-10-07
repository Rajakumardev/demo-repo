import { Check, X } from 'lucide-react';

import { evaluatePassword } from '../lib/passwordStrength.js';

/**
 * Live strength meter and requirement checklist for a password.
 *
 * Purely advisory — it reads the current value and reports how strong it is.
 * The region is `aria-live="polite"` so assistive technology hears the score
 * and each requirement flip as the user types.
 */
export default function PasswordStrength({ password = '' }) {
  const { score, label, checks } = evaluatePassword(password);
  const percent = (score / 4) * 100;

  return (
    <div className="password-strength" aria-live="polite">
      <div className="password-strength-track">
        <span
          className={`password-strength-bar score-${score}`}
          style={{ width: `${percent}%` }}
          data-score={score}
        />
      </div>
      <p className="password-strength-label">
        Strength: <strong>{label}</strong>
      </p>
      <ul className="password-checklist">
        {checks.map((check) => (
          <li key={check.id} className={check.met ? 'is-met' : undefined}>
            {check.met ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <X size={14} aria-hidden="true" />
            )}
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
