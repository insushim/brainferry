import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Header } from '@/components/layout/Header';
import UpdateChecker from '@/components/UpdateChecker';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BrainFerry - 무한한 두뇌 퍼즐',
  description: 'AI가 아닌 수학이 만드는 진짜 퍼즐 — 10가지 카테고리, 끝없는 재미',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BrainFerry',
  },
  openGraph: {
    title: 'BrainFerry - 무한한 두뇌 퍼즐',
    description: '순수 알고리즘으로 무한 생성되는 로직 퍼즐 게임',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0F172A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <UpdateChecker />
        </ThemeProvider>
      </body>
    </html>
  );
}
