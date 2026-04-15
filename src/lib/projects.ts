import { StaticImageData } from "next/image";

import trinityBanner from "../../images/projects/trinity/banner.png";
import isopozalBanner from "../../images/projects/isopozal/banner.png";

export interface ProjectData {
  slug: string;
  titleKey: string;
  descKey: string;
  techKey: string;
  demoUrl?: string;
  repoUrl?: string;
  image?: StaticImageData;
}

export const projects: ProjectData[] = [
  {
    slug: "trinity",
    titleKey: "projectTrinityTitle",
    descKey: "projectTrinityDesc",
    techKey: "projectTrinityTech",
    demoUrl: "https://trinity-app.es",
    image: trinityBanner,
  },
  {
    slug: "isopozal",
    titleKey: "projectIsopozalTitle",
    descKey: "projectIsopozalDesc",
    techKey: "projectIsopozalTech",
    demoUrl: "https://danielibabet.github.io/isopozal/",
    repoUrl: "https://github.com/danielibabet/isopozal",
    image: isopozalBanner,
  },
  {
    slug: "project-one",
    titleKey: "project1Title",
    descKey: "project1Desc",
    techKey: "project1Tech",
  },
  {
    slug: "project-two",
    titleKey: "project2Title",
    descKey: "project2Desc",
    techKey: "project2Tech",
  },
];
