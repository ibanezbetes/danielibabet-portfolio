"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Root /agenda redirects to the first section (Client-side to support static export) */
export default function AgendaIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/agenda/shopping");
  }, [router]);

  return null;
}
