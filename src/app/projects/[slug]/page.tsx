import { projects } from "@/lib/projects";
import ProjectDetailClient from "./ProjectDetailClient";

// Esta función es vital para habilitar 'output: "export"' en Next.js
// porque le dice qué enlaces (slugs) debe pre-compilar estáticamente
export function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

// NextJS 15 pasa `params` como una Promesa a los Server Components
export default async function ProjectDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  return <ProjectDetailClient slug={params.slug} />;
}
