/**
 * proxy.ts — Next.js middleware wiring for next-intl locale routing.
 * Redirects bare `/` to the default locale and rewrites `/en/…`, `/uk/…`
 * request paths onto the app's `[locale]` route segment.
 */
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'uk'],
  defaultLocale: 'en',
});

export const config = {
  matcher: ['/', '/(en|uk)/:path*'],
};
