import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CategoryForm from './CategoryForm.jsx';

describe('CategoryForm', () => {
  it('requires a name before submitting', async () => {
    const user = userEvent.setup();
    render(<CategoryForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add category/i }));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('submits trimmed values with the selected colour and icon', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CategoryForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), '  Food  ');
    await user.click(screen.getByRole('button', { name: 'Use color #ec4899' }));
    await user.click(screen.getByRole('button', { name: 'Use icon coffee' }));
    await user.click(screen.getByRole('button', { name: /add category/i }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Food', color: '#ec4899', icon: 'coffee' });
  });

  it('shows a provided error and clears a local one on submit', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CategoryForm onSubmit={vi.fn()} onCancel={vi.fn()} error="Server said no" />,
    );
    expect(screen.getByText('Server said no')).toBeInTheDocument();

    rerender(<CategoryForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Food');
    await user.click(screen.getByRole('button', { name: /add category/i }));
    expect(screen.queryByText('Server said no')).toBeNull();
  });

  it('reflects the submitting state and initial values', () => {
    render(
      <CategoryForm
        initial={{ name: 'Bills', color: '#22c55e', icon: 'receipt' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitting
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Bills');
    const submit = screen.getByRole('button', { name: /saving/i });
    expect(submit).toBeDisabled();
  });

  it('calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<CategoryForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
