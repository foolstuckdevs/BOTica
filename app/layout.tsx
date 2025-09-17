import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { SpeedInsights } from '@vercel/speed-insights/next';
import AccessDeniedToast from '@/components/AccessDeniedToast';

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
  description: 'Software for Pharmacies',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider refetchOnWindowFocus>
          {children}
          <Toaster position="bottom-right" />
          <AccessDeniedToast />
        </SessionProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
