/**
 * main.jsx — application bootstrap.
 * Mounts React with the provider stack: TanStack Query (optimistic-update
 * caching layer) → React Router → AuthProvider (JWT session context) → App.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './components/AuthContext.jsx';
import './i18n';

// Configure TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes data fresh window
      gcTime: 1000 * 60 * 10,   // 10 minutes cache garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
