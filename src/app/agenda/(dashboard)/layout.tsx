"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import "@cloudscape-design/global-styles/index.css";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation, {
  SideNavigationProps,
} from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { useAgendaAuth } from "@/context/AgendaAuthContext";
import Box from "@cloudscape-design/components/box";
import Spinner from "@cloudscape-design/components/spinner";

// ─── Navigation items ──────────────────────────────────────────────────────────

const navItems: SideNavigationProps.Item[] = [
  { type: "link", text: "Lista de la Compra", href: "/agenda/shopping" },
  { type: "link", text: "Tareas Pendientes", href: "/agenda/tasks" },
  { type: "divider" },
  { type: "link", text: "Biblioteca de Ocio", href: "/agenda/library" },
  { type: "link", text: "Links y Noticias", href: "/agenda/links" },
  { type: "divider" },
  { type: "link", text: "Calendario", href: "/agenda/calendar" },
  { type: "link", text: "Calendario Laboral", href: "/agenda/shifts" },
];

// ─── Inner layout (needs auth context) ────────────────────────────────────────

function AgendaLayoutInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, username, logout } = useAgendaAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    // Open side navigation by default on desktop, keep closed on mobile
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setNavOpen(true);
    }
  }, []);

  // Apply Cloudscape theme
  useEffect(() => {
    applyMode(darkMode ? Mode.Dark : Mode.Light);
  }, [darkMode]);

  // Redirect to login if not authenticated and done loading
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !pathname.startsWith("/agenda/login")) {
      router.push(`/agenda/login?from=${pathname}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f1b2d",
        }}
      >
        <Spinner size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect in progress
  }

  async function handleLogout() {
    await logout();
    router.push("/agenda/login");
  }

  return (
    <>
      <style>{`
        html { scroll-padding-top: 70px; }
        /* Ocultar la barra secundaria nativa (hamburguesa) de Cloudscape en móviles */
        [class*="awsui_mobile-bar_"], [class*="awsui_navigation-toggle_"] {
          display: none !important;
        }
      `}</style>
      {/* Top navigation */}
      <div 
        id="agenda-top-nav" 
        style={{ position: "sticky", top: 0, zIndex: 1002 }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const anchor = target.closest("a");
          if (anchor && anchor.getAttribute("href") === "#") {
            e.preventDefault();
            setNavOpen((prev) => !prev);
          }
        }}
      >
        <TopNavigation
          identity={{
            href: "#",
            title: "Agenda Personal",
            logo: { src: "/favicon.ico", alt: "Agenda" },
          }}
          utilities={[
            {
              type: "button",
              iconName: darkMode ? "gen-ai" : "gen-ai",
              text: darkMode ? "Modo Claro" : "Modo Oscuro",
              onClick: () => setDarkMode((d) => !d),
            },
            {
              type: "menu-dropdown",
              text: username || "Perfil",
              iconName: "user-profile",
              items: [
                { id: "portfolio", text: "← Volver al Portfolio", href: "/" },
                { id: "logout", text: "Cerrar sesión" },
              ],
              onItemClick: (e) => {
                if (e.detail.id === "logout") handleLogout();
              },
            },
          ]}
        />
      </div>

      {/* Main layout */}
      <AppLayout
        headerSelector="#agenda-top-nav"
        navigationOpen={navOpen}
        onNavigationChange={(e) => setNavOpen(e.detail.open)}
        navigation={
          <SideNavigation
            header={{ text: "Secciones", href: "/agenda" }}
            items={navItems}
            activeHref={pathname}
            onFollow={(e) => {
              e.preventDefault();
              router.push(e.detail.href);
            }}
          />
        }
        content={<Box padding="l">{children}</Box>}
        toolsHide
      />
    </>
  );
}

// ─── Root layout export ──────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgendaLayoutInner>{children}</AgendaLayoutInner>;
}
