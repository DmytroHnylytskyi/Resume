import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
  icons: {
    icon: [{ url: '/favicon.ico', sizes: '48x48 32x32 24x24 16x16', type: 'image/x-icon' }],
    apple: '/apple-touch-icon.png'
  },
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
  // Structured data for search engines: the resume tab is the crawlable
  // surface, so the Person entity mirrors the public contact channels.
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Dmytro Hnylytskyi',
    jobTitle: 'Full-Stack & Creative 3D Developer',
    url: 'https://hnylytskyi.dev',
    email: 'mailto:hnylytskyidmitri@gmail.com',
    address: { '@type': 'PostalAddress', addressLocality: 'Kyiv', addressCountry: 'UA' },
    sameAs: ['https://github.com/DmytroHnylytskyi', 'https://t.me/mokydjin']
  };

  return (
    <html lang="en" data-theme="light">
      <head>
        {/* Applied before first paint: persisted theme wins, otherwise the OS
            preference — prevents the light-theme flash for dark-mode visitors. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('aetheria_theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
