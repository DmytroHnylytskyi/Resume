/**
 * @file proxy.js
 * @module proxy
 * @description Next.js 16 routing proxy for next-intl internationalization.
 * Intercepts incoming requests, detects language headers or route prefixes, and handles locale redirection.
 * 
 * @author 3D Furniture Configurator Team
 */

import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'uk'],
 
  // Used when no locale matches
  defaultLocale: 'en'
});
 
export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(uk|en)/:path*']
};
