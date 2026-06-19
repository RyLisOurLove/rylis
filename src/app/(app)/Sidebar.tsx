"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string; emoji: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: "daily",
    label: "Daily",
    items: [
      { href: "/today", label: "Today", emoji: "🌅" },
      { href: "/", label: "Dashboard", emoji: "🏠" },
    ],
  },
  {
    id: "productivity",
    label: "Productivity",
    items: [
      { href: "/phase", label: "Life Phase", emoji: "🌊" },
      { href: "/pipeline", label: "Pipeline", emoji: "📊" },
      { href: "/agent", label: "Agent Setup", emoji: "🤖" },
    ],
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

const LS_KEY = "rylis_sidebar_collapsed_v1";

export default function Sidebar({
  user,
  onLogout,
}: {
  user: { name: string; emoji: string; loginId: string };
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage once — avoids SSR/CSR mismatch flicker.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setCollapsed(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  function toggle(id: string) {
    setCollapsed((c) => {
      const next = { ...c, [id]: !c[id] };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200/70 bg-white/60 backdrop-blur md:flex">
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">💞</span>
          <span className="text-xl font-bold tracking-tight text-slate-900">RyLis</span>
        </Link>
        <p className="mt-1 text-[11px] text-slate-500">Ryan &amp; Lisa</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 pb-4 text-sm">
        {GROUPS.map((g) => {
          const isCollapsed = ready && !!collapsed[g.id];
          return (
            <div key={g.id} className="mt-3 first:mt-0">
              {g.label && (
                <button
                  onClick={() => toggle(g.id)}
                  className="flex w-full items-center justify-between rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition hover:text-slate-600"
                >
                  <span>{g.label}</span>
                  <span
                    aria-hidden
                    className={`transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                  >
                    ▾
                  </span>
                </button>
              )}
              <div
                className={`grid overflow-hidden transition-all ${
                  isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                }`}
              >
                <div className="min-h-0 space-y-0.5">
                  {g.items.map((n) => {
                    const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition ${
                          active
                            ? "bg-brand-100 text-brand-700"
                            : "text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                        }`}
                      >
                        <span>{n.emoji}</span>
                        <span>{n.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/70 px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-base">
            {user.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
            <p className="truncate text-[11px] text-slate-500">@{user.loginId}</p>
          </div>
        </div>
        <form action={onLogout}>
          <button className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-100">
            ↗ Keluar
          </button>
        </form>
      </div>
    </aside>
  );
}
