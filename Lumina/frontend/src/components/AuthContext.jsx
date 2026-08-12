import { API_URL } from '../config';
import React, { createContext, useState, useEffect } from 'react';

/**
 * Authentication React Context object.
 * Provides user profile state, JWT token, and authentication action handlers.
 */
export const AuthContext = createContext();

/**
 * Authentication Provider component.
 *
 * Manages JWT session persistence in `localStorage`, fetches current user
 * profile on token change, and exposes `login`, `logout`, and `refreshUser` helpers.
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child elements wrapped by the provider.
 * @returns {JSX.Element} React context provider tree.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);

  /**
   * Refreshes the user profile by querying `/auth/me` with current Bearer token.
   *
   * @param {string} [currentToken] - Optional token override.
   */
  const refreshUser = (currentToken) => {
    const t = currentToken || token;
    if (t) {
      fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${t}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Invalid token");
      })
      .then(data => setUser(data))
      .catch(() => logout());
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  /**
   * Logs in user, saves token to localStorage, and updates state.
   *
   * @param {string} accessToken - JWT access token string.
   */
  const login = (accessToken) => {
    localStorage.setItem('token', accessToken);
    setToken(accessToken);
  };

  /**
   * Logs out user, removes token from localStorage, and clears state.
   */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
