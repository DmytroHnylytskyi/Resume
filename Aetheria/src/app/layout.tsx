import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#dbeafe'
};

export const metadata: Metadata = {
  // Override with NEXT_PUBLIC_SITE_URL when previewing/testing on another origin
  // (e.g. a tunnel) or when serving from the Heroku fallback domain.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://hnylytskyi.dev'),
  title: 'Aetheria 3D — Portfolio of Dmytro Hnylytskyi',
  description: 'Interactive 3D portfolio & resume of a Full-Stack & 3D Web Developer',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aetheria 3D'
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Aetheria 3D — Dmytro Hnylytskyi',
    title: 'Aetheria — Interactive 3D Developer Portfolio',
    description:
      'Walk a moody WebGL island with real physics — knowledge statues, glowing portals and a full-stack developer resume.',
    images: [
      {
        url: '/og-preview.jpg',
        width: 1200,
        height: 630,
        alt: 'Aetheria — an interactive 3D portfolio island with glowing portals'
      }
    ],
    locale: 'en_US',
    alternateLocale: ['uk_UA']
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aetheria — Interactive 3D Developer Portfolio',
    description:
      'An interactive WebGL island with real physics: statues, project portals and a full-stack developer resume.',
    images: ['/og-preview.jpg']
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
