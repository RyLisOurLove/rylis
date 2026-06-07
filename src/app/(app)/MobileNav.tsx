"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string; emoji: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "",
    items: [{ href: "/", label: "Dashboard", emoji: "🏠" }],
  },
  {
    id: "pillars",
    label: "4 Pillars",
    items: [
      { href: "/spiritual", label: "Spiritual", emoji: "🙏" },
      { href: "/mental", label: "Mental", emoji: "🧠" },
      { href: "/fisik", label: "Fisik", emoji: "💪" },
      { href: "/finansial", label: "Finansial", emoji: "💰" },
    ],
  },
  {
    id: "dream",
    label: "Dream",
    items: [{ href: "/vision", label: "Vision & Wishlist", emoji: "✨" }],
  },
  {
    id: "shared",
    label: "Shared",
    items: [
      { href: "/calendar", label: "Kalender", emoji: "📆" },
      { href: "/links", label: "Important Links", emoji: "🔗" },
      { href: "/vault", label: "Account Vault", emoji: "🔐" },
      { href: "/boardgames", label: "Board Games", emoji: "🎲" },
    ],
  },
];

// 5-item bottom bar — the daily-use destinations. Vision lives in the drawer
// (still 1 tap away). Finansial stays here because budget tracking is daily.
const BOTTOM: NavItem[] = [
  { href: "/", emoji: "🏠", label: "Home" },
  { href: "/spiritual", emoji: "🙏", label: "Spirit" },
  { href: "/mental", emoji: "🧠", label: "Mental" },
  { href: "/fisik", emoji: "💪", label: "Fisik" },
  { href: "/finansial", emoji: "💰", label: "Uang" },
];

export default function MobileNav({
  user,
  onLogout,
}: {
  user: { name: string; emoji: string; loginId: string };
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll while drawer open.
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">💞</span>
          <span className="font-bold">RyLis</span>
        </Link>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-500">{user.emoji} {user.name}</span>
          <button
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Drawer overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer panel — slide in from right */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[82%] max-w-sm transform border-l border-slate-200 bg-white shadow-xl transition-transform md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💞</span>
            <span className="text-lg font-bold text-slate-900">RyLis</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg">
            {user.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-[11px] text-slate-500">@{user.loginId}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 pb-32 text-sm">
          {GROUPS.map((g) => (
            <div key={g.id} className="mt-3 first:mt-0">
              {g.label && (
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {g.label}
                </p>
              )}
              <div className="space-y-0.5">
                {g.items.map((n) => {
                  const active =
                    pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                        active
                          ? "bg-brand-100 text-brand-700"
                          : "text-slate-700 active:bg-slate-100"
                      }`}
                    >
                      <span className="text-base">{n.emoji}</span>
                      <span className="font-medium">{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-6 border-t border-slate-100 pt-3">
            <form action={onLogout}>
              <button className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 active:bg-rose-50">
                ↗ Keluar
              </button>
            </form>
          </div>
        </nav>
      </aside>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {BOTTOM.map((n) => {
          const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition ${
                active ? "text-brand-600" : "text-slate-600"
              }`}
            >
              <span className={`text-lg transition-transform ${active ? "scale-110" : ""}`}>
                {n.emoji}
              </span>
              <span className="font-medium">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
