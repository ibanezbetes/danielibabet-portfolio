"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { projects } from "@/lib/projects";

export default function ProjectDetailClient({ slug }: { slug: string }) {
  const { t } = useLanguage();

  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
            404
          </h1>
          <p className="mb-6 text-gray-500 dark:text-gray-400">
            Project not found.
          </p>
          <Link
            href="/"
            className="text-sm font-medium text-indigo-500 hover:text-indigo-600"
          >
            ← Back home
          </Link>
        </div>
      </div>
    );
  }

  const techs = t(project.techKey).split(",");

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-6">
        {/* Back link */}
        <Link
          href="/#projects"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-indigo-500 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <span>←</span>
          {t("backToProjects")}
        </Link>

        {/* Hero image placeholder or actual image */}
        {project.image ? (
          <div className="relative mb-10 h-64 w-full overflow-hidden rounded-2xl sm:h-80 shadow-lg shadow-indigo-500/10">
            <Image
              src={project.image}
              alt={t(project.titleKey)}
              fill
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="mb-10 flex h-64 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 sm:h-80 dark:from-indigo-500/5 dark:to-purple-500/5">
            <span className="text-6xl opacity-40">🖼️</span>
          </div>
        )}

        {/* Title */}
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          {t(project.titleKey)}
        </h1>

        {/* Tech tags */}
        <div className="mb-8 flex flex-wrap gap-2">
          {techs.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
            >
              {tech.trim()}
            </span>
          ))}
        </div>

        {/* Description */}
        <div className="prose prose-gray max-w-none dark:prose-invert">
          <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            {t(project.descKey)}
          </p>
        </div>

        {/* Action links */}
        <div className="mt-10 flex gap-4">
          {project.demoUrl ? (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
            >
              {t("liveDemo")}
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          {project.repoUrl ? (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:-translate-y-0.5 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t("viewCode")}
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
