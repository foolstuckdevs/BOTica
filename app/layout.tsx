import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { SpeedInsights } from '@vercel/speed-insights/next';
import AccessDeniedToast from '@/components/AccessDeniedToast';
import { auth } from '@/auth';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BOTica',
  description:
    'Complete pharmacy management software for inventory, sales, and operations. Streamline your pharmacy workflow with BOTica.',
  keywords:
    'pharmacy software, inventory management, POS system, pharmacy management',
  authors: [{ name: 'BOTica' }],
  creator: 'BOTica Team',
  metadataBase: new URL('https://botica.site'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'BOTica - Pharmacy Management System',
    description:
      'Complete pharmacy management software for inventory, sales, and operations.',
    url: 'https://botica.site',
    siteName: 'BOTica',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BOTica Pharmacy Management System',
      },
    ],
    locale: 'en_PH',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [{ url: '/favicon.ico?v=2' }],
    shortcut: '/favicon.ico?v=2',
  },
  manifest: '/manifest.json',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider session={session} refetchOnWindowFocus>
          {children}
          <Toaster position="bottom-right" />
          <AccessDeniedToast />
        </SessionProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
