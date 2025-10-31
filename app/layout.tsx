import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/ui/header';
import Footer from '@/components/ui/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MovieBook - Distributed Movie Booking System',
  description: 'Industry-grade distributed system with clock synchronization, leader election, and data replication',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#121826]`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}