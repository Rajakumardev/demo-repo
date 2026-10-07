import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import CategoryIcon from '../lib/icons.jsx';
import CategoryForm from '../components/CategoryForm.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null); // { mode, category? }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/categories');
      setCategories(result.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(payload) {
    setSaving(true);
    setFormError('');
    try {
      if (editor?.mode === 'edit') {
        await api.put(`/categories/${editor.category.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setEditor(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    if (
      !window.confirm(
        `Delete "${category.name}"? Expenses in this category will become uncategorised.`,
      )
    ) {
      return;
    }
    try {
      await api.del(`/categories/${category.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Categories</h1>
          <p>Group your spending the way you think about it.</p>
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
          Add category
        </button>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        {loading ? (
          <Spinner label="Loading categories…" />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Create your first category to start organising expenses."
          />
        ) : (
          <div className="category-grid">
            {categories.map((category) => (
              <div key={category.id} className="category-card">
                <div className="cat-main">
                  <span
                    className="cat-icon"
                    style={{ background: category.color || '#6366f1' }}
                    aria-hidden="true"
                  >
                    <CategoryIcon name={category.icon} size={17} />
                  </span>
                  <span className="cat-name">{category.name}</span>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Edit ${category.name}`}
                    onClick={() => {
                      setFormError('');
                      setEditor({ mode: 'edit', category });
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Delete ${category.name}`}
                    onClick={() => handleDelete(category)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editor ? (
        <Modal
          title={editor.mode === 'edit' ? 'Edit category' : 'Add category'}
          onClose={() => setEditor(null)}
        >
          <CategoryForm
            initial={editor.category}
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
