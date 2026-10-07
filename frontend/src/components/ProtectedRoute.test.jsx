import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

import { useAuth } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Secret</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuth.mockReturnValue({ user: null, ready: false });
});

describe('ProtectedRoute', () => {
  it('shows a spinner until the session is ready', () => {
    renderProtected();
    expect(screen.getByText('Restoring your session…')).toBeInTheDocument();
  });

  it('redirects to the login page when there is no user', () => {
    useAuth.mockReturnValue({ user: null, ready: true });
    renderProtected();
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).toBeNull();
  });

  it('renders its children for an authenticated user', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, ready: true });
    renderProtected();
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });
});
