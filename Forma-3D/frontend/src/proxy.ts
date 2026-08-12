import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'uk'],
  defaultLocale: 'en',
});

export const config = {
  matcher: ['/', '/(en|uk)/:path*'],
};
