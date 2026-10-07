import { useState } from 'react';
import { toDateInput } from '../lib/format.js';

export default function ExpenseForm({ categories, initial, onSubmit, onCancel, submitting, error }) {
  const [form, setForm] = useState({
    amount: initial?.amount != null ? String(initial.amount) : '',
    description: initial?.description || '',
    categoryId: initial?.category_id || '',
    spentAt: toDateInput(initial?.spent_at) || toDateInput(new Date()),
  });
  const [localError, setLocalError] = useState('');

  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  function handleSubmit(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setLocalError('Enter an amount greater than 0');
      return;
    }
    setLocalError('');
    onSubmit({
      amount,
      description: form.description.trim(),
      categoryId: form.categoryId || null,
      // Anchor to midday so the stored UTC timestamp maps back to the same day.
      spentAt: form.spentAt ? new Date(`${form.spentAt}T12:00:00`).toISOString() : undefined,
    });
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error || localError ? (
        <div className="alert alert-error">{error || localError}</div>
      ) : null}

      <div className="form-row">
        <label className="field">
          <span>Amount</span>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={form.amount}
            onChange={update}
            placeholder="0.00"
            required
            autoFocus
          />
        </label>
        <label className="field">
          <span>Date</span>
          <input name="spentAt" type="date" value={form.spentAt} onChange={update} />
        </label>
      </div>

      <label className="field">
        <span>Description</span>
        <input
          name="description"
          type="text"
          value={form.description}
          onChange={update}
          placeholder="What was it for?"
          maxLength={500}
        />
      </label>

      <label className="field">
        <span>Category</span>
        <select name="categoryId" value={form.categoryId} onChange={update}>
          <option value="">Uncategorised</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  );
}
