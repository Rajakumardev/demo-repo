import { useState } from 'react';
import CategoryIcon, { ICON_NAMES } from '../lib/icons.jsx';

const COLOR_PRESETS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#64748b',
];

export default function CategoryForm({ initial, onSubmit, onCancel, submitting, error }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    color: initial?.color || COLOR_PRESETS[0],
    icon: initial?.icon || 'tag',
  });
  const [localError, setLocalError] = useState('');

  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setLocalError('Name is required');
      return;
    }
    setLocalError('');
    onSubmit({ name: form.name.trim(), color: form.color, icon: form.icon });
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error || localError ? (
        <div className="alert alert-error">{error || localError}</div>
      ) : null}

      <label className="field">
        <span>Name</span>
        <input
          name="name"
          type="text"
          value={form.name}
          onChange={update}
          placeholder="e.g. Groceries"
          maxLength={80}
          required
          autoFocus
        />
      </label>

      <div className="field">
        <span>Color</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.15rem' }}>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm((current) => ({ ...current, color }))}
              aria-label={`Use color ${color}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: color,
                border: form.color === color ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <span>Icon</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.15rem' }}>
          {ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setForm((current) => ({ ...current, icon: name }))}
              aria-label={`Use icon ${name}`}
              className="icon-btn"
              style={{
                border: form.icon === name ? '1px solid var(--primary)' : '1px solid var(--border)',
                color: form.icon === name ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              <CategoryIcon name={name} size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add category'}
        </button>
      </div>
    </form>
  );
}
