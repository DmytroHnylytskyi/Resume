import type { Metadata, Viewport } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'Гнилицький Дмитро | 3D Interactive Portfolio Island',
  description:
    'Інтерактивний 3D-хаб резюме та портфоліо розробника Дмитра Гнилицького (КПІ ІАТЕ 121). Досліджуйте літаючий острів, відкривайте резюме біля статуй та переходьте в проєкти через портали.',
  keywords: [
    'Dmytro Hnylytskyi',
    'Гнилицький Дмитро',
    '3D Portfolio',
    'React Three Fiber',
    'Three.js',
    'Next.js 15',
    'Rapier 3D',
    'КПІ ІПЗЕ',
    'Software Engineer'
  ],
  authors: [{ name: 'Dmytro Hnylytskyi', url: 'https://github.com/mokydjin' }],
  openGraph: {
    title: 'Гнилицький Дмитро | 3D Interactive Portfolio Island',
    description:
      'Інтерактивний 3D-хаб резюме та портфоліо розробника Дмитра Гнилицького (КПІ 121). 3D-архіпелаг, фізика в реальному часі, портали в проєкти.',
    siteName: 'Dmytro Hnylytskyi 3D Portfolio',
    type: 'website',
    locale: 'uk_UA'
  }
};

export const viewport: Viewport = {
  themeColor: '#070d18',
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
