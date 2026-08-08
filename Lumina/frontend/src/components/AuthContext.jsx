import { API_URL } from '../config';
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);

  const refreshUser = (currentToken) => {
    const t = currentToken || token;
    if (t) {
      fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${t}` }
      })
      .then(res => {
        if(res.ok) return res.json();
        throw new Error("Invalid token");
      })
      .then(data => setUser(data))
      .catch(() => logout());
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = (accessToken) => {
    localStorage.setItem('token', accessToken);
    setToken(accessToken);
  };

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
