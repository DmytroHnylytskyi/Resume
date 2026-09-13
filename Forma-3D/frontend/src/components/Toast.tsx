'use client';

/**
 * Toast — global transient notification stack (bottom-right).
 * Renders the `toasts` slice from the store with animated enter/exit
 * transitions, auto-dismisses each toast after 3 s, and offers a manual
 * close button. Toast type drives the icon and accent color.
 */

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { Toast as ToastType } from '../types';

export default function Toast() {
  const toasts = useStore((state) => state.toasts);
  const removeToast = useStore((state) => state.removeToast);

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    toasts.forEach((toast) => {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, 3000);
      intervals.push(timer);
    });
    return () => intervals.forEach((t) => clearTimeout(t));
  }, [toasts, removeToast]);

  const getIcon = (type: ToastType['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="#1ed760" />;
      case 'error':
        return <AlertCircle size={18} color="#f87171" />;
      case 'info':
        return <Info size={18} color="#38bdf8" />;
    }
  };

  const getColor = (type: ToastType['type']) => {
    switch (type) {
      case 'success':
        return '#1ed760';
      case 'error':
        return '#f87171';
      case 'info':
        return '#38bdf8';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            style={{
              background: 'rgba(10, 46, 32, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${getColor(toast.type)}40`,
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              minWidth: '280px',
              maxWidth: '400px'
            }}
          >
            <div style={{ flexShrink: 0 }}>
              {getIcon(toast.type)}
            </div>
            
            <div style={{ 
              flex: 1,
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 500,
              lineHeight: 1.4
            }}>
              {toast.message}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'; e.currentTarget.style.background = 'none'; }}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
