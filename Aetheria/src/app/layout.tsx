import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000'
};

export const metadata: Metadata = {
  title: 'Aetheria 3D — Портфоліо Дмитра Гнилицького',
  description: 'Інтерактивне 3D-портфоліо та резюме Full-Stack & 3D Web розробника'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
