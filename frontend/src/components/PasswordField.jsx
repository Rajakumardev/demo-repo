import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';

/**
 * Password input with an accessible show/hide toggle.
 *
 * Wraps `<input type="password">` and mirrors the value into a text input when
 * revealed. The toggle reports its state through `aria-pressed` and is wired to
 * the input via `aria-controls`, so screen-reader users can tell what it does.
 *
 * @param {object} props
 * @param {string} props.label        Visible field label.
 * @param {string} props.name         Input name, passed to `onChange`.
 * @param {string} props.value        Controlled value.
 * @param {(event: object) => void} props.onChange
 * @param {string} [props.autoComplete]
 * @param {string} [props.placeholder]
 * @param {boolean} [props.required]
 * @param {string} [props.error]      Inline validation message.
 * @param {string} [props.hint]       Helper text, hidden while an error shows.
 * @param {import('react').ReactNode} [props.children] Rendered after the input.
 */
export default function PasswordField({
  label,
  name,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  required = false,
  error = '',
  hint = '',
  children,
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-field">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={inputId}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && !error ? (
        <span id={hintId} className="field-help">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      ) : null}
      {children}
    </div>
  );
}
