import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { idr, monthKey } from "@/lib/fmt";

export default async function Dashboard() {
  const s = await requireSession();
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  const [devCount, journalToday, workoutsThisWeek, txns, upcoming, latestAltar] =
    await Promise.all([
      prisma.devotion.count({ where: { userId: s.userId, date: { gte: startOfMonth } } }),
      prisma.journalEntry.findFirst({
        where: { userId: s.userId, date: { gte: new Date(today.toDateString()) } },
        orderBy: { date: "desc" },
      }),
      prisma.workoutLog.count({ where: { userId: s.userId, date: { gte: startOfWeek } } }),
      prisma.transaction.findMany({ where: { date: { gte: startOfMonth } } }),
      prisma.event.findMany({
        where: { startAt: { gte: today } },
        orderBy: { startAt: "asc" },
        take: 5,
        include: { createdBy: true, attendees: { include: { user: true } } },
      }),
      prisma.familyAltar.findFirst({ orderBy: { date: "desc" } }),
    ]);

  const income = txns.filter((t) => t.kind === "income").reduce((a, b) => a + b.amount, 0);
  const expense = txns.filter((t) => t.kind === "expense").reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Halo, {s.emoji} {s.name} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Selamat datang di rumah digital keluarga <strong>RyLis</strong>. Hari ini, mari bertumbuh sedikit lagi 🌱
        </p>
      </div>

      {/* 4-pillar cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PillarCard
          href="/spiritual" emoji="🙏" name="Spiritual"
          headline={`${devCount} saat teduh bulan ini`}
          sub={latestAltar ? `Altar terakhir: ${latestAltar.topic}` : "Catat saat teduh pertamamu"}
          color="from-amber-100 to-orange-50 border-amber-200"
        />
        <PillarCard
          href="/mental" emoji="🧠" name="Mental"
          headline={journalToday ? `Mood hari ini: ${journalToday.moodScore}/10` : "Belum journaling hari ini"}
          sub={journalToday ? journalToday.emotions : "Tulis 2 menit untuk hari yang lebih ringan"}
          color="from-sky-100 to-cyan-50 border-sky-200"
        />
        <PillarCard
          href="/fisik" emoji="💪" name="Fisik"
          headline={`${workoutsThisWeek}× olahraga minggu ini`}
          sub={workoutsThisWeek >= 3 ? "On track 🔥" : "Yuk gerak sedikit hari ini"}
          color="from-emerald-100 to-teal-50 border-emerald-200"
        />
        <PillarCard
          href="/finansial" emoji="💰" name="Finansial"
          headline={`Net: ${idr(income - expense)}`}
          sub={`In ${idr(income)} · Out ${idr(expense)} (${monthKey(today)})`}
          color="from-violet-100 to-fuchsia-50 border-violet-200"
        />
      </div>

      {/* Upcoming events */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">📆 Agenda mendatang</h2>
          <Link href="/calendar" className="text-xs text-brand-600 hover:underline">
            Lihat kalender →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada agenda. Tambahkan di kalender.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white/70 px-3 py-2">
                <div className="flex h-10 w-12 flex-col items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  <span className="text-[9px] uppercase">
                    {new Date(e.startAt).toLocaleDateString("id-ID", { month: "short" })}
                  </span>
                  <span className="text-lg font-bold leading-none">{new Date(e.startAt).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{e.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {e.allDay
                      ? "Sepanjang hari"
                      : new Date(e.startAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    {e.location ? ` · ${e.location}` : ""}
                    {" · "}
                    {e.attendees.map((a) => a.user.emoji).join(" ") || "—"}
                  </p>
                </div>
                <span className="pill bg-slate-100 text-slate-600">{e.category}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Link href="/links" className="card p-5 hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔗</div>
            <div>
              <h3 className="font-semibold text-slate-900">Important Links</h3>
              <p className="text-sm text-slate-500">Bookmark bareng, hemat waktu pencarian.</p>
            </div>
          </div>
        </Link>
        <Link href="/vault" className="card p-5 hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔐</div>
            <div>
              <h3 className="font-semibold text-slate-900">Account Vault</h3>
              <p className="text-sm text-slate-500">Password akun bersama — butuh passcode.</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function PillarCard({
  href, emoji, name, headline, sub, color,
}: {
  href: string; emoji: string; name: string; headline: string; sub: string; color: string;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border bg-gradient-to-br ${color} p-5 shadow-sm transition hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl">{emoji}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 group-hover:text-slate-700">→</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">{name}</p>
      <p className="text-base font-bold text-slate-900">{headline}</p>
      <p className="mt-0.5 text-xs text-slate-600">{sub}</p>
    </Link>
  );
}
