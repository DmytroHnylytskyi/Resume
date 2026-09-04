/**
 * @file layout.tsx
 * @module app/[locale]/layout
 * @description Root application layout component for Next.js App Router.
 * Configures internationalization (`next-intl`), loads global styling rules (`globals.css`),
 * and sets SEO metadata tags.
 */

import ClientI18nProvider from '../../components/ClientI18nProvider';
import "../globals.css";
import React from 'react';

/** Page SEO Metadata configuration */
export const metadata = {
  title: "3D Builder & Configurator",
  description: "Premium 3D Room & Architectural Configurator Portfolio Application",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05140f",
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Root Layout async server component.
 * 
 * @param {RootLayoutProps} props - Component properties.
 * @returns {Promise<JSX.Element>} Async HTML layout wrapper.
 */
export default async function RootLayout({ children, params }: RootLayoutProps): Promise<React.ReactNode> {
  const { locale } = await params;
  
  return (
    <html lang={locale}>
      <body>
        <ClientI18nProvider initialLocale={locale}>
          {children}
        </ClientI18nProvider>
      </body>
    </html>
  );
}
