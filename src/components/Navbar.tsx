"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

const navLinks = [
  { key: "navAbout", href: "#about" },
  { key: "navProjects", href: "#projects" },
  { key: "navExperience", href: "#experience" },
  { key: "navEducation", href: "#education" },
  { key: "navCertifications", href: "#certifications" },
  { key: "navSkills", href: "#skills" },
  { key: "navContact", href: "#contact" },
];

export default function Navbar() {
  const { t, locale, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200/60 bg-white/70 backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-950/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Name / Logo */}
        <a
          href="#"
          className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
        >
          Daniel Ibáñez Betés
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.key}>
              <a
                href={link.href}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400"
              >
                {t(link.key)}
              </a>
            </li>
          ))}
        </ul>

        {/* Toggles */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-full text-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>

          {/* Language toggle (Flags) */}
          <button
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="h-6 w-6 overflow-hidden rounded-full shadow-sm">
              {locale === "es" ? (
                /* Spain Flag for ES */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 750 500"
                  className="h-full w-full object-cover"
                  preserveAspectRatio="none"
                >
                  <rect width="750" height="500" fill="#c60b1e" />
                  <rect width="750" height="250" y="125" fill="#ffc400" />
                </svg>
              ) : (
                /* UK Flag for EN */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 60 30"
                  className="h-full w-full object-cover"
                  preserveAspectRatio="none"
                >
                  <clipPath id="s">
                    <path d="M0,0 v30 h60 v-30 z" />
                  </clipPath>
                  <clipPath id="t">
                    <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
                  </clipPath>
                  <g clipPath="url(#s)">
                    <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                    <path
                      d="M0,0 L60,30 M60,0 L0,30"
                      stroke="#fff"
                      strokeWidth="6"
                    />
                    <path
                      d="M0,0 L60,30 M60,0 L0,30"
                      clipPath="url(#t)"
                      stroke="#C8102E"
                      strokeWidth="4"
                    />
                    <path
                      d="M30,0 v30 M0,15 h60"
                      stroke="#fff"
                      strokeWidth="10"
                    />
                    <path
                      d="M30,0 v30 M0,15 h60"
                      stroke="#C8102E"
                      strokeWidth="6"
                    />
                  </g>
                </svg>
              )}
            </div>
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="grid h-9 w-9 place-items-center rounded-full text-xl transition-colors hover:bg-gray-100 md:hidden dark:hover:bg-gray-800"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-200/60 bg-white/95 backdrop-blur-xl md:hidden dark:border-gray-800/60 dark:bg-gray-950/95">
          <ul className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
