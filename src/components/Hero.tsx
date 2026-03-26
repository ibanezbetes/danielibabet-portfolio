"use client";

import React from "react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import profileImg from "../../images/profile.png";

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20"
    >
      {/* Subtle gradient orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col-reverse items-center gap-12 px-6 md:flex-row md:gap-16">
        {/* Text */}
        <div className="flex-1 text-center md:text-left">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-500">
            {t("heroGreeting")}
          </p>
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
            {t("heroHeadline")}
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-lg text-gray-600 md:mx-0 dark:text-gray-400">
            {t("heroSubtext")}
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
          >
            {t("heroCta")}
            <span aria-hidden="true">→</span>
          </a>
        </div>

        {/* Profile image */}
        <div className="flex-shrink-0">
          <div className="relative h-56 w-56 overflow-hidden rounded-full ring-4 ring-indigo-500/20 sm:h-64 sm:w-64 lg:h-72 lg:w-72">
            <Image
              src={profileImg}
              alt="Daniel Ibáñez Betés"
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
