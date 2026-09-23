'use client';
import { useRouter } from 'next/navigation';

import { HeroUIProvider } from '@heroui/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

interface ProvidersProps {
  children: React.ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  const router = useRouter();

  return (
    <HeroUIProvider
      className="flex h-full w-full flex-col"
      navigate={router.push}
    >
      <NextThemesProvider attribute="class">{children}</NextThemesProvider>
    </HeroUIProvider>
  );
};

export default Providers;
