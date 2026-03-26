"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import sapImg from "../../images/certis/sap.png";
import awsImg from "../../images/certis/aws.png";

export default function Certifications() {
  const { t } = useLanguage();

  const certs = [
    { key: "cert1", image: sapImg },
    { key: "cert2", image: awsImg },
    { key: "cert3", image: null },
  ];

  return (
    <section id="certifications" className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-14 text-center">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-500">
            {t("certificationsTitle")}
          </h2>
          <div className="mx-auto h-1 w-12 rounded-full bg-indigo-500" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {certs.map(({ key, image }) => (
            <div
              key={key}
              className="relative overflow-hidden flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-center transition-shadow min-h-[100px] hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              {image && (
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.10] dark:opacity-[0.05]"
                  style={{ backgroundImage: `url(${image.src})` }}
                />
              )}
              <div className="relative z-10">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(key)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
