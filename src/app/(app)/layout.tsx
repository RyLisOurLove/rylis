import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/session";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  const user = { name: session.name, emoji: session.emoji, loginId: session.loginId };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} onLogout={logout} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav user={user} onLogout={logout} />
        <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">{children}</main>
      </div>
    </div>
  );
}
