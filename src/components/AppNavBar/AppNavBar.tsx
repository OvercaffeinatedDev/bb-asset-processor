'use client';
import { useState } from 'react';

import {
  Link,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
} from '@heroui/react';
import { IconPackage } from '@tabler/icons-react';

import { ThemeSwitcher } from './ThemeSwitcher';

const AppNavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Navbar onMenuOpenChange={setIsMenuOpen}>
      {/* Left navigation */}
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className="sm:hidden"
        />
        <NavbarBrand>
          <Link color="foreground" href="/">
            <IconPackage />
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Center navigation */}
      <NavbarContent
        className="hidden gap-4 sm:flex"
        justify="center"
      ></NavbarContent>

      {/* Right navigation */}
      <NavbarContent justify="end">
        <NavbarItem className="hidden gap-4 sm:flex">
          <ThemeSwitcher />
        </NavbarItem>
      </NavbarContent>

      {/* Collapsed/mobile menu */}
      <NavbarMenu>
        <NavbarMenuItem className="justify-items-end sm:hidden">
          <ThemeSwitcher />
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  );
};

export default AppNavBar;
