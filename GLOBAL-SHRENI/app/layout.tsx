import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Global Shreni - Expert Marketplace',
  description: 'Connect with verified experts for online and offline opportunities',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-light text-dark">
        {children}
      </body>
    </html>
  );
}
