'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Cpu } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'ElectroQuest Quiz', path: '/electroquest' },
    { name: 'Think Big Event', path: '/thinkbig' },
    { name: 'Leaderboard', path: '/leaderboard' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#081B33]/85 backdrop-blur-md border-b border-[#00D4FF]/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 text-white group">
              <Cpu className="h-8 w-8 text-[#00D4FF] group-hover:rotate-180 transition-transform duration-500 filter drop-shadow-[0_0_8px_#00D4FF]" />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-wider text-[#00D4FF]">ELECTRICAL CLUB</span>
                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-widest">VSB Karur</span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex space-x-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`text-sm font-medium tracking-wide transition-all duration-300 relative py-1 hover:text-[#00FFFF] ${
                    isActive ? 'text-[#00D4FF] font-bold' : 'text-gray-300'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#00FFFF] rounded-full shadow-[0_0_8px_#00FFFF]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-[#081B33] focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6 text-[#00FFFF]" /> : <Menu className="h-6 w-6 text-[#00D4FF]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#081B33] border-b border-[#00D4FF]/20 animate-in slide-in-from-top duration-300">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive ? 'bg-[#00D4FF]/10 text-[#00FFFF]' : 'text-gray-300 hover:bg-[#00D4FF]/5 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
