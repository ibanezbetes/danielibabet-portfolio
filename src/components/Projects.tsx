"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

import { projects, ProjectData } from "@/lib/projects";

function ProjectCard({ slug, titleKey, descKey, techKey, image }: ProjectData) {
  const { t } = useLanguage();
  const techs = t(techKey).split(",");

  return (
    <Link
      href={`/projects/${slug}`}
      className="group block w-[340px] flex-shrink-0 sm:w-[380px]"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:shadow-xl hover:-translate-y-1 dark:border-gray-800 dark:bg-gray-900">
        {/* Image or placeholder */}
        {image ? (
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={image}
              alt={titleKey}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/5 dark:to-purple-500/5">
            <span className="text-4xl opacity-40">🖼️</span>
          </div>
        )}

        <div className="flex flex-1 flex-col p-6">
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            {t(titleKey)}
          </h3>
          <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {t(descKey)}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {techs.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
              >
                {tech.trim()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Projects() {
  const { t } = useLanguage();

  /* Render cards multiple times for seamless loop */
  const allCards = [...projects, ...projects, ...projects, ...projects];

  return (
    <section id="projects" className="py-24 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-500">
            {t("projectsTitle")}
          </h2>
          <div className="mx-auto h-1 w-12 rounded-full bg-indigo-500" />
        </div>
      </div>

      {/* Infinite horizontal carousel - Pure CSS */}
      <div className="relative w-full flex">
        <div className="animate-marquee gap-8 px-6">
          {allCards.map((p, i) => (
            <ProjectCard key={`${p.slug}-${i}`} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}
