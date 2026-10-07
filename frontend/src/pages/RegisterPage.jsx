import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import PasswordField from '../components/PasswordField.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getConfirmPasswordError, validateRegistration } from '../lib/passwordStrength.js';

export default function RegisterPage() {
  const { user, ready, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (ready && user) return <Navigate to="/" replace />;

  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const confirmError = getConfirmPasswordError(form.password, form.confirmPassword);

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateRegistration(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      // The confirmation field is client-only — never send it to the API.
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create your account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            <Wallet size={22} />
          </span>
          <h1>Create your account</h1>
          <p>Start organising your expenses in seconds.</p>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <form onSubmit={handleSubmit} className="form" noValidate>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={update}
              placeholder="Ada Lovelace"
              required
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={update}
              placeholder="you@example.com"
              required
            />
          </label>

          <PasswordField
            label="Password"
            name="password"
            value={form.password}
            onChange={update}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
          >
            <PasswordStrength password={form.password} />
          </PasswordField>

          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={update}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            required
            error={confirmError}
          />

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
