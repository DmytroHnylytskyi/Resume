/**
 * @file i18n.ts
 * @module i18n
 * @description Internationalization configuration request helper for next-intl server.
 * Loads translation JSON message files based on current locale string ('en' or 'uk').
 * 
 * @author Forma-3D Team
 */

import { getRequestConfig } from 'next-intl/server';
 
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale) locale = 'en';

  return {
    locale,
    timeZone: 'UTC',
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
