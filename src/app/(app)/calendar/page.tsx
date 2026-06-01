import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import SharedCalendar from "./SharedCalendar";

export default async function CalendarPage() {
  const s = await requireSession();
  const people = await prisma.user.findMany({
    select: { id: true, name: true, emoji: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold text-slate-900">📆 Kalender Bersama</h1>
        <p className="text-sm text-slate-500">Agenda Ryan &amp; Lisa — siap di-sync ke Google Calendar.</p>
      </header>
      <SharedCalendar people={people} meId={s.userId} />
    </div>
  );
}
