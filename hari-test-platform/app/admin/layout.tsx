import { getSessionFromCookies } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminMobileNav } from "@/components/admin/MobileNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();

  // No session only happens on /admin/login — middleware redirects every
  // other /admin/* route to login before this layout ever renders for it.
  // Keep the login page bare (no sidebar/nav chrome).
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <AdminMobileNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}