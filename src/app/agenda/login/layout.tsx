"use client";

/**
 * Login layout — standalone, no auth wrapper.
 * Cloudscape CSS must be imported here (client component) rather than at
 * module-level in the page to avoid SSR issues.
 */
import "@cloudscape-design/global-styles/index.css";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
