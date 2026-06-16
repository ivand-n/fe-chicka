"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu when scrolling
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [scrolled]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/#produk", label: "Produk" },
    { href: "/#tentang-kami", label: "Tentang Kami" },
    // { href: "/articles", label: "Artikel" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled ? "backdrop-blur bg-white/60 shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 md:h-24">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-semibold text-base sm:text-lg md:text-xl text-black">
              Chick-A
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex justify-center items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3 lg:px-4 py-2 rounded-md text-sm lg:text-base text-black font-bold hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Login Button */}
          <div className="hidden md:flex justify-end flex-shrink-0">
            <Link
              href="/login"
              className="px-4 lg:px-6 py-2 rounded-2xl border bg-orange-400 text-white text-sm lg:text-base font-semibold hover:bg-orange-300 transition-colors"
            >
              Monitoring
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            {/* Mobile Login Button */}
            <Link
              href="/login"
              className="px-3 py-2 rounded-2xl bg-orange-400 text-white text-xs sm:text-sm font-semibold hover:bg-orange-300 transition-colors"
            >
              Monitoring
            </Link>

            {/* Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-black hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                // X Icon
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                // Hamburger Icon
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 sm:pb-6 border-t bg-white/95 backdrop-blur animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col space-y-2 px-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-4 py-3 rounded-md text-sm sm:text-base text-black font-semibold hover:bg-orange-50 hover:text-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
