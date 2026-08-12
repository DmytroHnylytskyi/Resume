import React, { useContext } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthContext, AuthProvider } from '../components/AuthContext';

function TestConsumer() {
  const { token, user, login, logout } = useContext(AuthContext);
  return (
    <div>
      <div data-testid="token-value">{token || 'no-token'}</div>
      <div data-testid="user-value">{user ? user.email : 'no-user'}</div>
      <button onClick={() => login('mock-jwt-token')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('provides initial unauthenticated state', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('token-value').textContent).toBe('no-token');
    expect(screen.getByTestId('user-value').textContent).toBe('no-user');
  });

  it('updates token and persists to localStorage on login', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('token-value').textContent).toBe('mock-jwt-token');
    expect(localStorage.getItem('token')).toBe('mock-jwt-token');
  });

  it('clears token and user on logout', async () => {
    localStorage.setItem('token', 'existing-token');

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('token-value').textContent).toBe('no-token');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
