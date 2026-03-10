import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ThemedToaster } from '@/components/providers/themed-toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Trace',
  description: 'Personal fitness tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 lg:pl-64">
              <Header />
              <main className="px-4 py-6 lg:px-6 pb-24 lg:pb-6">{children}</main>
            </div>
          </div>
          <MobileNav />
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
