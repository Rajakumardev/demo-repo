import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PasswordField from './PasswordField.jsx';

function renderField(props = {}) {
  return render(
    <PasswordField label="Password" name="password" value="" onChange={() => {}} {...props} />,
  );
}

describe('PasswordField', () => {
  it('renders a masked password input linked to its label', () => {
    renderField();
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('name', 'password');
  });

  it('toggles visibility and reflects the state accessibly', async () => {
    const user = userEvent.setup();
    renderField({ value: 'secret' });

    const show = screen.getByRole('button', { name: 'Show password' });
    expect(show).toHaveAttribute('aria-pressed', 'false');

    await user.click(show);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    const hide = screen.getByRole('button', { name: 'Hide password' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');

    await user.click(hide);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('forwards change events to the caller', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ onChange });
    await user.type(screen.getByLabelText('Password'), 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('shows hint text and wires aria-describedby to it', () => {
    renderField({ hint: 'At least 8 characters' });
    const input = screen.getByLabelText('Password');
    const hint = screen.getByText('At least 8 characters');
    expect(input).toHaveAttribute('aria-describedby', hint.id);
  });

  it('shows an error, marks the input invalid and hides the hint', () => {
    renderField({ hint: 'A hint', error: 'Passwords do not match' });
    const input = screen.getByLabelText('Password');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Passwords do not match');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', alert.id);
    expect(screen.queryByText('A hint')).toBeNull();
  });

  it('renders children after the input', () => {
    renderField({ children: <p>Strength meter</p> });
    expect(screen.getByText('Strength meter')).toBeInTheDocument();
  });
});
