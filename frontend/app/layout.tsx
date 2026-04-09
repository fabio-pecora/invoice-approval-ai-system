import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoice Approval System',
  description: 'Safety-first invoice review for AP/AR agents',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
