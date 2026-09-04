/**
 * @file layout.js
 * @description Next.js 16 Root Layout shell component.
 * Sets HTML metadata, font definitions, and viewport settings for TerraScope.
 */

import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "TerraScope | Interactive 3D Geospatial Intelligence Platform",
  description: "Explore real-time global data on an interactive 3D globe — earthquakes, flights, weather, country statistics, and near-Earth objects.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a1a",
};

/**
 * Root Layout Shell component.
 * @param {{children: React.ReactNode}} props
 * @returns {JSX.Element} HTML document root container.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ background: '#0a0a1a' }}>{children}</body>
    </html>
  );
}
