/** Formatting and small helpers shared across the client. */

/** Format a number as currency, falling back to a plain string on bad input. */
export function formatCurrency(amount, currency = 'USD') {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Local `YYYY-MM-DD` for a Date, without the UTC shift `toISOString` causes. */
export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Value for an `<input type="date">` from a Date or ISO string. */
export function toDateInput(value) {
  if (!value) return '';
  return toISODate(value);
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/** Turn `2026-10` into `Oct 26`. */
export function monthLabel(ym) {
  if (!ym) return '';
  const [year, month] = ym.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  });
}

/** Build a query string, skipping empty values. */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
