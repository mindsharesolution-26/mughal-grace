import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

// Single font family — Poppins. Used for everything: body, display, numerals.
// tabular-nums is opted in per-element where columnar alignment matters.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mughal Grace - Factory Intelligence System',
  description: 'Cloud-based multi-tenant SaaS for knitting factories',
  keywords: ['knitting', 'factory', 'management', 'ERP', 'SaaS'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${poppins.variable}`}>
      <body className={poppins.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
