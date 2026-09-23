import type { Metadata } from 'next';

import Providers from '@/components/Providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Base app',
  description: 'Base skeleton for a Next.js app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📦</text></svg>"
        />
      </head>
      <body className="flex h-screen w-screen">
        <Providers>
          <main className="flex grow flex-col overflow-auto bg-[url(/img/bg-light.svg)] bg-cover bg-repeat dark:bg-[url(/img/bg-dark.svg)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
