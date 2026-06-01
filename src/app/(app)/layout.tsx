import Link from "next/link";
import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/session";
import Sidebar from "./Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={{ name: session.name, emoji: session.emoji, loginId: session.loginId }}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200/70 bg-white/60 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">💞</span>
            <span className="font-bold">RyLis</span>
          </Link>
          <form action={logout}>
            <button className="text-xs text-slate-500">
              {session.emoji} {session.name} · keluar
            </button>
          </form>
        </header>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
          {[
            { href: "/", emoji: "🏠", label: "Home" },
            { href: "/spiritual", emoji: "🙏", label: "Spirit" },
            { href: "/mental", emoji: "🧠", label: "Mental" },
            { href: "/fisik", emoji: "💪", label: "Fisik" },
            { href: "/finansial", emoji: "💰", label: "Uang" },
          ].map((n) => (
            <Link key={n.href} href={n.href} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-slate-600">
              <span className="text-lg">{n.emoji}</span>
              {n.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">{children}</main>
      </div>
    </div>
  );
}
