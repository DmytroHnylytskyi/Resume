/**
 * @file i18n.js
 * @module i18n
 * @description Internationalization configuration request helper for next-intl server.
 * Loads translation JSON message files based on current locale string ('en' or 'uk').
 * 
 * @author 3D Furniture Configurator Team
 */

import { getRequestConfig } from 'next-intl/server';
 
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale) locale = 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
