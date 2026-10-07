import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';

beforeEach(() => {
  useAuth.mockReturnValue({
    user: { name: 'Ada', email: 'ada@example.com' },
    logout: vi.fn(),
  });
});

describe('Layout', () => {
  it('renders navigation, the user chip and an outlet', () => {
    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('calls logout when signing out', () => {
    const logout = vi.fn();
    useAuth.mockReturnValue({ user: { name: 'Ada' }, logout });
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('falls back to a placeholder avatar without a user name', () => {
    useAuth.mockReturnValue({ user: null, logout: vi.fn() });
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
