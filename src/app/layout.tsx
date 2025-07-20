// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00d4ff',
};

export const metadata: Metadata = {
  title: 'Half Marathon Trainer - Manchester 2025',
  description: 'AI-powered half marathon training app with Garmin integration for Manchester Half Marathon 2025',
  keywords: ['half marathon', 'training', 'running', 'AI', 'Garmin', 'Manchester'],
  authors: [{ name: 'Half Marathon Trainer' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white antialiased`}>
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}