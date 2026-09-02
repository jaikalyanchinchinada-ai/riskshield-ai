import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AnalystChat } from "@/components/ai/analyst-chat";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware already blocks unauthenticated requests from reaching here,
  // but we check again at the layout level too — defense in depth, and it
  // gives us the current user's name/role to show in the sidebar.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Sidebar user={user} />
      <MobileNav />
      <div className="md:pl-60 min-h-screen pb-16 md:pb-0">{children}</div>
      <AnalystChat />
    </>
  );
}
