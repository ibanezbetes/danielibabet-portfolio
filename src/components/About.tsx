"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function About() {
  const { t } = useLanguage();

  return (
    <section id="about" className="py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-500">
          {t("aboutTitle")}
        </h2>
        <div className="mx-auto mb-8 h-1 w-12 rounded-full bg-indigo-500" />
        <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400">
          {t("aboutText")}
        </p>
      </div>
    </section>
  );
}
