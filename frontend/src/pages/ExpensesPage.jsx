import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { buildQuery, formatCurrency, formatDate } from '../lib/format.js';
import CategoryBadge from '../components/CategoryBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';

const PAGE_SIZE = 10;

const EMPTY_FILTERS = { from: '', to: '', categoryId: '', search: '', sort: 'date_desc' };

export default function ExpensesPage() {
  const { user } = useAuth();
  const currency = user?.currency || 'USD';

  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ expenses: [], meta: { total: 0, amount: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editor, setEditor] = useState(null); // { mode: 'create' | 'edit', expense? }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const searchTimer = useRef(null);

  useEffect(() => {
    api
      .get('/categories')
      .then((result) => setCategories(result.categories))
      .catch(() => setCategories([]));
  }, []);

  // Debounce the free-text search so we do not fire a request per keystroke.
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters((current) =>
        current.search === searchInput ? current : { ...current, search: searchInput },
      );
      setPage(0);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = buildQuery({ ...filters, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      const result = await api.get(`/expenses${query}`);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(data.meta.total / PAGE_SIZE));

  async function handleSubmit(payload) {
    setSaving(true);
    setFormError('');
    try {
      if (editor?.mode === 'edit') {
        await api.put(`/expenses/${editor.expense.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setEditor(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense) {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    try {
      await api.del(`/expenses/${expense.id}`);
      // Step back a page if we just removed the last row on it.
      if (data.expenses.length === 1 && page > 0) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>Track and manage your transactions.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setFormError('');
            setEditor({ mode: 'create' });
          }}
        >
          <Plus size={16} />
          Add expense
        </button>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="toolbar">
          <label className="field grow">
            <span>Search</span>
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search descriptions…"
                style={{ paddingLeft: 32, width: '100%' }}
              />
            </div>
          </label>

          <label className="field">
            <span>Category</span>
            <select
              value={filters.categoryId}
              onChange={(event) => setFilter({ categoryId: event.target.value })}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>From</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilter({ from: event.target.value })}
            />
          </label>

          <label className="field">
            <span>To</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilter({ to: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Sort</span>
            <select
              value={filters.sort}
              onChange={(event) => setFilter({ sort: event.target.value })}
            >
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Highest amount</option>
              <option value="amount_asc">Lowest amount</option>
            </select>
          </label>

          {(filters.from || filters.to || filters.categoryId || filters.search) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSearchInput('');
                setFilters(EMPTY_FILTERS);
                setPage(0);
              }}
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <Spinner label="Loading expenses…" />
        ) : data.expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses found"
            description="Try adjusting the filters or add a new expense."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="cell-muted">{formatDate(expense.spent_at)}</td>
                    <td>
                      {expense.description || <span className="cell-muted">—</span>}
                    </td>
                    <td>
                      <CategoryBadge
                        name={expense.category_name}
                        color={expense.category_color}
                      />
                    </td>
                    <td className="amount" style={{ textAlign: 'right' }}>
                      {formatCurrency(expense.amount, currency)}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Edit expense"
                          onClick={() => {
                            setFormError('');
                            setEditor({ mode: 'edit', expense });
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Delete expense"
                          onClick={() => handleDelete(expense)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data.meta.total > 0 ? (
          <div className="pagination">
            <span>
              {data.meta.total} expense{data.meta.total === 1 ? '' : 's'} ·{' '}
              {formatCurrency(data.meta.amount, currency)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next <ChevronRight size={15} />
              </button>
            </span>
          </div>
        ) : null}
      </div>

      {editor ? (
        <Modal
          title={editor.mode === 'edit' ? 'Edit expense' : 'Add expense'}
          onClose={() => setEditor(null)}
        >
          <ExpenseForm
            categories={categories}
            initial={editor.expense}
            submitting={saving}
            error={formError}
            onSubmit={handleSubmit}
            onCancel={() => setEditor(null)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
