"use client";

import React from "react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import nttdataImg from "../../images/trabajos/nttdata.png";

export default function Experience() {
  const { t } = useLanguage();

  return (
    <section id="experience" className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-14 text-center">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-500">
            {t("experienceTitle")}
          </h2>
          <div className="mx-auto h-1 w-12 rounded-full bg-indigo-500" />
        </div>

        {/* Timeline card */}
        <div className="relative border-l-2 border-indigo-500/30 pl-8">
          <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-indigo-500 bg-white dark:bg-gray-950" />
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <span className="mb-3 block text-xs font-medium text-indigo-500">
              {t("exp1Date")}
            </span>

            <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden">
                <Image
                  src={nttdataImg}
                  alt="NTT DATA"
                  fill
                  className="object-contain object-left"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("exp1Role")}
                </h3>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {t("exp1Desc")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
