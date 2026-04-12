import { redirect } from "next/navigation";

/** Root /agenda redirects to the first section */
export default function AgendaIndexPage() {
  redirect("/agenda/shopping");
}
