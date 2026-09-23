import { Dispatch, SetStateAction, useMemo } from 'react';

import { useTheme } from 'next-themes';

type Theme = 'light' | 'dark';
type SetTheme = Dispatch<SetStateAction<Theme>>;

export default function useSystemtheme() {
  const { theme, setTheme, systemTheme } = useTheme();

  return useMemo(() => {
    return {
      theme: theme === 'system' ? systemTheme : theme,
      setTheme,
    } as { theme: Theme; setTheme: SetTheme };
  }, [theme, systemTheme, setTheme]);
}
