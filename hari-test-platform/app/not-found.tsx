import { redirect } from "next/navigation";

/**
 * Root-level not-found — Next.js renders this for BOTH explicit notFound()
 * calls and any URL that doesn't match a route at all (typos, dead links,
 * bad test codes hitting no page, etc). We don't have a public marketing
 * site, so there's nothing useful to show here — send everyone to the
 * dashboard. Unauthenticated visitors are then bounced to /admin/login by
 * proxy.ts, same as visiting "/" directly.
 */
export default function NotFound() {
  redirect("/admin/dashboard");
}