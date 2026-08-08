import type { Metadata, Viewport } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'Гнилицький Дмитро | Aetheria 3D Portfolio Archipelago',
  description:
    'Інтерактивний 3D-хаб резюме та екосистеми проєктів Дмитра Гнилицького (КПІ 121). Досліджуйте літаючий світ Aetheria, відкривайте резюме біля статуй та переходьте через портали в Lumina, Forma 3D та TerraScope.',
  keywords: [
    'Dmytro Hnylytskyi',
    'Гнилицький Дмитро',
    'Aetheria 3D',
    'Lumina LMS',
    'Forma 3D',
    'TerraScope',
    'React Three Fiber',
    'Three.js',
    'Next.js 15',
    'Rapier 3D',
    'КПІ ІАТЕ 121'
  ],
  authors: [{ name: 'Dmytro Hnylytskyi', url: 'https://github.com/Dmytrossss' }],
  openGraph: {
    title: 'Гнилицький Дмитро | Aetheria 3D Portfolio Archipelago',
    description:
      'Інтерактивний 3D-хаб резюме та портфоліо розробника Дмитра Гнилицького (КПІ 121). 3D-архіпелаг Aetheria, фізика в реальному часі, портали в Lumina, Forma 3D та TerraScope.',
    siteName: 'Dmytro Hnylytskyi | Aetheria 3D',
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
