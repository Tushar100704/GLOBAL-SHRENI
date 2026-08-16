'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FiMenu, FiX, FiChevronDown } from 'react-icons/fi';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-blue-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl">
            <div className="w-8 h-8 bg-white rounded-full"></div>
            Global Shreni
          </Link>

          <div className="hidden md:flex gap-8 items-center">
            <Link href="/opportunities" className="hover:opacity-80">Browse Opportunities</Link>
            <Link href="/experts" className="hover:opacity-80">Find Experts</Link>
            <Link href="/auth/login" className="hover:opacity-80">Login</Link>
            <Link href="/auth/signup" className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold">
              Sign Up
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden mt-4 space-y-4 pb-4">
            <Link href="/opportunities" className="block hover:opacity-80">Browse</Link>
            <Link href="/experts" className="block hover:opacity-80">Experts</Link>
            <Link href="/auth/login" className="block hover:opacity-80">Login</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
