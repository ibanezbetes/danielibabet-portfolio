"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import cfgsBg from "../../images/estudios/cfgs.png";
import cfgmBg from "../../images/estudios/cfgm.png";

export default function Education() {
  const { t } = useLanguage();

  const degrees = [
    { titleKey: "edu1Title", schoolKey: "edu1School", bgImage: cfgsBg },
    { titleKey: "edu2Title", schoolKey: "edu2School", bgImage: cfgmBg },
  ];

  return (
    <section id="education" className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-14 text-center">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-500">
            {t("educationTitle")}
          </h2>
          <div className="mx-auto h-1 w-12 rounded-full bg-indigo-500" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {degrees.map((d) => (
            <div
              key={d.titleKey}
              className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.15] dark:opacity-[0.10]"
                style={{ backgroundImage: `url(${d.bgImage.src})` }}
              />
              <div className="relative z-10">
                <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
                  {t(d.titleKey)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t(d.schoolKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
