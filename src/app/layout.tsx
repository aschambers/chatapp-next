import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Sanctrel',
  description: 'A real-time chat application',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading headers triggers dynamic rendering per-request so Next.js
  // applies the nonce (forwarded via x-nonce by middleware) to its generated <script> tags
  await headers();

  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
