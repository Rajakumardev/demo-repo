import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ExpenseForm from './ExpenseForm.jsx';

const categories = [
  { id: 'c1', name: 'Food' },
  { id: 'c2', name: 'Transport' },
];

describe('ExpenseForm', () => {
  it('rejects a non-positive amount', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add expense/i }));

    expect(screen.getByText('Enter an amount greater than 0')).toBeInTheDocument();
  });

  it('submits a coerced amount, trimmed description, category and ISO date', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ExpenseForm categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Amount'), '12.5');
    await user.type(screen.getByLabelText('Description'), '  Lunch  ');
    await user.selectOptions(screen.getByLabelText('Category'), 'c2');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-02-03' } });

    await user.click(screen.getByRole('button', { name: /add expense/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      amount: 12.5,
      description: 'Lunch',
      categoryId: 'c2',
      spentAt: new Date('2026-02-03T12:00:00').toISOString(),
    });
  });

  it('sends a null category when uncategorised is chosen', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ExpenseForm categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Amount'), '5');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    expect(onSubmit.mock.calls[0][0].categoryId).toBeNull();
  });

  it('shows a server error and the submitting state', () => {
    render(
      <ExpenseForm
        categories={categories}
        initial={{ amount: 9, description: 'Taxi', category_id: 'c2', spent_at: '2026-01-05' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitting
        error="Server error"
      />,
    );

    expect(screen.getByText('Server error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByLabelText('Amount')).toHaveValue(9);
  });

  it('calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ExpenseForm categories={categories} onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
