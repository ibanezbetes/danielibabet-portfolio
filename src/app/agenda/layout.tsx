"use client";

/**
 * Root layout for all /agenda/* routes.
 * Provides AgendaAuthProvider globally — both login and dashboard need it.
 * The Cloudscape AppLayout (dashboard shell) is in (dashboard)/layout.tsx
 */
import { AgendaAuthProvider } from "@/context/AgendaAuthContext";

export default function AgendaRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgendaAuthProvider>{children}</AgendaAuthProvider>;
}
