"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function Skills() {
  const { t } = useLanguage();

  const skills = ["skill1", "skill2", "skill3"];

  return (
    <section id="skills" className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-14 text-center">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-500">
            {t("skillsOnlyTitle")}
          </h2>
          <div className="mx-auto h-1 w-12 rounded-full bg-indigo-500" />
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {skills.map((key) => (
            <span
              key={key}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-6 py-3 text-sm font-semibold text-indigo-600 transition-shadow hover:shadow-md dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400"
            >
              {t(key)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
