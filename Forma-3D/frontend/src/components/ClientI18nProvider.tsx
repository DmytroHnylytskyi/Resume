'use client';

/**
 * @file ClientI18nProvider.tsx
 * @module components/ClientI18nProvider
 * @description High-performance client-side internationalization provider.
 * Connects Zustand `locale` state directly to `next-intl`'s `NextIntlClientProvider`
 * allowing instantaneous 0ms language switching without tearing down the WebGL Canvas.
 * 
 * @author 3D Furniture Configurator Team
 */

import React, { useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useStore } from '../store/useStore';
import enMessages from '../../messages/en.json';
import ukMessages from '../../messages/uk.json';

const messagesMap = {
  en: enMessages,
  uk: ukMessages
};

interface ClientI18nProviderProps {
  children: React.ReactNode;
  initialLocale?: string;
}

export default function ClientI18nProvider({ children, initialLocale }: ClientI18nProviderProps) {
  const locale = useStore((state) => state.locale);
  const setLocale = useStore((state) => state.setLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If URL has a specific initial locale and localStorage hasn't set one yet
    const saved = localStorage.getItem('forma_locale');
    if (!saved && initialLocale && (initialLocale === 'en' || initialLocale === 'uk')) {
      setLocale(initialLocale);
    }
  }, [initialLocale, setLocale]);

  const activeLocale = mounted ? locale : (initialLocale === 'uk' ? 'uk' : 'en');
  const activeMessages = messagesMap[activeLocale] || messagesMap.en;

  return (
    <NextIntlClientProvider locale={activeLocale} messages={activeMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
