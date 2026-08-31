import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Drift — Zero-Ad Movie Direct Stream & Downloader',
  description: 'Automated real-time link resolver and high-speed direct S3 movie downloader with zero ads and no login required.',
  icons: {
    icon: '/logo-icon.png',
    shortcut: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
};

import StyledJsxRegistry from './registry';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StyledJsxRegistry>
          <Navbar />
          <main>{children}</main>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
