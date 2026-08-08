/**
 * @file layout.jsx
 * @module app/[locale]/layout
 * @description Root application layout component for Next.js App Router.
 * Configures internationalization (`next-intl`), loads global styling rules (`globals.css`),
 * and sets SEO metadata tags.
 * 
 * @author 3D Furniture Configurator Team
 */

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import "../globals.css";

/** @type {import('next').Metadata} Page SEO Metadata configuration */
export const metadata = {
  title: "3D Builder & Configurator",
  description: "Premium 3D Room & Architectural Configurator Portfolio Application",
};

/**
 * Root Layout async server component.
 * 
 * @param {Object} props - Component properties.
 * @param {React.ReactNode} props.children - Child page elements to render inside provider.
 * @param {Promise<{ locale: string }>} props.params - Route parameter object containing active locale string.
 * @returns {Promise<JSX.Element>} Async HTML layout wrapper.
 */
export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages();
  
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
