import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'FitTrack',
  description: 'Personal fitness tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 lg:pl-64">
            <Header />
            <main className="px-4 py-6 lg:px-6 pb-24 lg:pb-6">{children}</main>
          </div>
        </div>
        <MobileNav />
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: '#141419',
              border: '1px solid #2a2a35',
              color: '#e5e5e5',
            },
          }}
        />
      </body>
    </html>
  );
}
