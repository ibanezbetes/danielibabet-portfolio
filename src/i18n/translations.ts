export type Locale = "en" | "es";

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    /* ── Navbar ── */
    navAbout: "About",
    navProjects: "Projects",
    navExperience: "Experience",
    navEducation: "Education",
    navCertifications: "Certifications",
    navSkills: "Skills",
    navContact: "Contact",

    /* ── Hero ── */
    heroGreeting: "Hi, I'm Daniel",
    heroHeadline: "Web Developer & Software Architect",
    heroSubtext:
      "Building scalable applications with clean code and modern architecture.",
    heroCta: "Contact Me",

    /* ── About ── */
    aboutTitle: "About Me",
    aboutText:
      "I'm Daniel Ibáñez Betés — a passionate software architect and web developer based in Spain. I specialize in creating robust, scalable applications using modern technologies and best practices. With a strong foundation in multiplatform development and a deep interest in software architecture, I strive to deliver elegant solutions to complex problems.",

    /* ── Projects ── */
    projectsTitle: "Projects",
    project1Title: "Project One",
    project1Desc:
      "A full-stack web application showcasing modern development patterns and responsive design principles.",
    project1Tech: "React,Next.js,Tailwind CSS,TypeScript",
    project2Title: "Project Two",
    project2Desc:
      "An enterprise-grade solution focused on performance, accessibility, and clean architecture.",
    project2Tech: "Node.js,Express,PostgreSQL,Docker",
    liveDemo: "Live Demo",
    viewCode: "GitHub",
    backToProjects: "Back to projects",

    /* ── Experience ── */
    experienceTitle: "Experience",
    exp1Role: "Architect",
    exp1Company: "NTT DATA",
    exp1Date: "Sept 2025 – Present",
    exp1Desc:
      "Designing and implementing scalable software architectures for enterprise clients, focusing on best practices and cutting-edge technologies.",

    /* ── Education ── */
    educationTitle: "Education",
    edu1Title: "CFGS Multiplatform Application Development",
    edu1School: "San Valero, Zaragoza",
    edu2Title: "CFGM Microcomputer Systems and Networks",
    edu2School: "IES Tiempos Modernos, Zaragoza",

    /* ── Certifications ── */
    certificationsTitle: "Certifications",

    /* ── Skills ── */
    skillsOnlyTitle: "Skills",
    skillsLabel: "Skills",
    certificationsLabel: "Certifications",
    skill1: "Web Development",
    skill2: "Scrum",
    skill3: "Logo Design",
    cert1: "SAP Certification",
    cert2: "Generative AI Foundations – AWS",
    cert3: "National Challenge 2024/2025",

    /* ── Footer ── */
    footerRights: "All rights reserved.",
  },

  es: {
    /* ── Navbar ── */
    navAbout: "Sobre mí",
    navProjects: "Proyectos",
    navExperience: "Experiencia",
    navEducation: "Educación",
    navCertifications: "Certificaciones",
    navSkills: "Habilidades",
    navContact: "Contacto",

    /* ── Hero ── */
    heroGreeting: "Hola, soy Daniel",
    heroHeadline: "Desarrollador Web y Arquitecto de Software",
    heroSubtext:
      "Construyendo aplicaciones escalables con código limpio y arquitectura moderna.",
    heroCta: "Contáctame",

    /* ── About ── */
    aboutTitle: "Sobre Mí",
    aboutText:
      "Soy Daniel Ibáñez Betés — un apasionado arquitecto de software y desarrollador web en España. Me especializo en crear aplicaciones robustas y escalables utilizando tecnologías modernas y buenas prácticas. Con una sólida formación en desarrollo multiplataforma y un profundo interés en la arquitectura de software, me esfuerzo por ofrecer soluciones elegantes a problemas complejos.",

    /* ── Projects ── */
    projectsTitle: "Proyectos",
    project1Title: "Proyecto Uno",
    project1Desc:
      "Una aplicación web full-stack que muestra patrones de desarrollo modernos y principios de diseño responsive.",
    project1Tech: "React,Next.js,Tailwind CSS,TypeScript",
    project2Title: "Proyecto Dos",
    project2Desc:
      "Una solución empresarial enfocada en rendimiento, accesibilidad y arquitectura limpia.",
    project2Tech: "Node.js,Express,PostgreSQL,Docker",
    liveDemo: "Demo en Vivo",
    viewCode: "GitHub",
    backToProjects: "Volver a proyectos",

    /* ── Experience ── */
    experienceTitle: "Experiencia",
    exp1Role: "Arquitecto",
    exp1Company: "NTT DATA",
    exp1Date: "Sept 2025 – Actualidad",
    exp1Desc:
      "Diseñando e implementando arquitecturas de software escalables para clientes empresariales, con enfoque en buenas prácticas y tecnologías de vanguardia.",

    /* ── Education ── */
    educationTitle: "Educación",
    edu1Title: "CFGS Desarrollo de Aplicaciones Multiplataforma",
    edu1School: "San Valero, Zaragoza",
    edu2Title: "CFGM Sistemas Microinformáticos y Redes",
    edu2School: "IES Tiempos Modernos, Zaragoza",

    /* ── Certifications ── */
    certificationsTitle: "Certificaciones",

    /* ── Skills ── */
    skillsOnlyTitle: "Habilidades",
    skillsLabel: "Habilidades",
    certificationsLabel: "Certificaciones",
    skill1: "Desarrollo Web",
    skill2: "Scrum",
    skill3: "Diseño de Logotipos",
    cert1: "Certificación SAP",
    cert2: "Fundamentos de IA Generativa – AWS",
    cert3: "Reto Nacional 2024/2025",

    /* ── Footer ── */
    footerRights: "Todos los derechos reservados.",
  },
};
