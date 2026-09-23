// app/components/ThemeSwitcher.tsx
'use client';

import { useEffect, useState } from 'react';

import { Switch } from '@heroui/react';
import { IconMoon, IconSun } from '@tabler/icons-react';

import useSystemtheme from '@/hooks/UseSystemTheme';

export const ThemeSwitcher = () => {
  const [themeMounted, setThemeMounted] = useState(false);
  const { theme, setTheme } = useSystemtheme();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeMounted(true);
  }, []);

  if (!themeMounted) return null;

  return (
    <Switch
      defaultSelected
      color="default"
      endContent={<IconMoon />}
      size="md"
      startContent={<IconSun />}
      isSelected={theme === 'light'}
      onValueChange={() =>
        theme === 'dark' ? setTheme('light') : setTheme('dark')
      }
    ></Switch>
  );
};
