"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EventModal, { type EventDraft } from "./EventModal";

type Person = { id: string; name: string; emoji: string };
type Attendee = { user: Person };
type ApiEvent = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  allDay: boolean;
  startAt: string;
  endAt: string | null;
  location: string | null;
  createdById: string;
  attendees: Attendee[];
};

type View = "day" | "week" | "month";

export const CATEGORY_META: Record<string, { emoji: string; block: string; dot: string; label: string }> = {
  spiritual: { emoji: "🙏", label: "Spiritual", block: "bg-amber-100 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  mental: { emoji: "🧠", label: "Mental", block: "bg-sky-100 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  fisik: { emoji: "💪", label: "Fisik", block: "bg-emerald-100 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  finansial: { emoji: "💰", label: "Finansial", block: "bg-violet-100 text-violet-800 ring-violet-200", dot: "bg-violet-500" },
  family: { emoji: "💞", label: "Family", block: "bg-rose-100 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
  work: { emoji: "💼", label: "Kerja", block: "bg-slate-200 text-slate-800 ring-slate-300", dot: "bg-slate-500" },
  personal: { emoji: "✨", label: "Personal", block: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200", dot: "bg-fuchsia-500" },
};

const HOUR_H = 48;
const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); const off = (x.getDay()+6)%7; return addDays(x, -off); }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function minutes(d: Date) { return d.getHours()*60 + d.getMinutes(); }
function fmtTime(d: Date) { return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }

export default function SharedCalendar({ people, meId }: { people: Person[]; meId: string }) {
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 639.98px)").matches) setView("day");
  }, []);

  const days = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "week") {
      const s = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [view, cursor]);

  const reload = useCallback(async () => {
    const from = startOfDay(days[0]);
    const to = addDays(startOfDay(days[days.length - 1]), 1);
    const res = await fetch(`/api/events?from=${from.toISOString()}&to=${to.toISOString()}`);
    if (res.ok) {
      const d = await res.json();
      setEvents(d.events ?? []);
    }
  }, [days]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if ((view === "week" || view === "day") && gridRef.current) gridRef.current.scrollTop = 7 * HOUR_H;
  }, [view]);

  const title = useMemo(() => {
    if (view === "day") return `${DOW[(cursor.getDay()+6)%7]}, ${cursor.getDate()} ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === "week") return `${MONTHS[days[0].getMonth()]} ${days[0].getFullYear()}`;
    return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }, [view, cursor, days]);

  function navigate(dir: -1 | 1) {
    if (view === "day") setCursor((c) => addDays(c, dir));
    else if (view === "week") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  function openNew(at: Date, allDay = false) {
    setDraft({
      title: "",
      description: "",
      category: "family",
      allDay,
      startAt: new Date(at).toISOString(),
      endAt: null,
      location: "",
      attendeeIds: [meId],
    });
  }
  function openEdit(ev: ApiEvent) {
    setDraft({
      id: ev.id,
      title: ev.title,
      description: ev.description ?? "",
      category: ev.category,
      allDay: ev.allDay,
      startAt: ev.startAt,
      endAt: ev.endAt,
      location: ev.location ?? "",
      attendeeIds: ev.attendees.map((a) => a.user.id),
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setCursor(startOfDay(new Date()))} className="btn-ghost !py-1 !text-xs">Hari ini</button>
          <div className="flex overflow-hidden rounded-lg border border-slate-200">
            <button onClick={() => navigate(-1)} className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50">‹</button>
            <button onClick={() => navigate(1)} className="border-l border-slate-200 px-2.5 py-1.5 text-slate-500 hover:bg-slate-50">›</button>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-medium">
            {(["day","week","month"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-2.5 py-1.5 capitalize ${view===v ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                {v === "day" ? "Hari" : v === "week" ? "Minggu" : "Bulan"}
              </button>
            ))}
          </div>
          <button onClick={() => openNew(new Date(new Date().setMinutes(0,0,0)))} className="btn-primary ml-auto !py-1.5 !text-xs">+ Agenda</button>
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid days={days} cursorMonth={cursor.getMonth()} events={events} now={now}
          onAdd={(d) => openNew(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0), false)}
          onOpen={openEdit} />
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="hidden lg:block lg:w-56 lg:shrink-0">
            <MiniMonth cursor={cursor} events={events} now={now} onPick={(d) => setCursor(startOfDay(d))} />
            <Legend />
          </div>
          <div className="min-w-0 flex-1">
            <TimeGrid gridRef={gridRef} days={days} events={events} now={now}
              onAddSlot={(d, h) => openNew(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0))}
              onAddAllDay={(d) => openNew(startOfDay(d), true)}
              onOpen={openEdit} />
          </div>
        </div>
      )}

      {draft && (
        <EventModal
          draft={draft}
          people={people}
          onClose={() => setDraft(null)}
          onSaved={() => { setDraft(null); reload(); }}
        />
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="card mt-3 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kategori</p>
      <ul className="space-y-1 text-xs">
        {Object.entries(CATEGORY_META).map(([k, m]) => (
          <li key={k} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${m.dot}`} /> {m.emoji} {m.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimeGrid({ gridRef, days, events, now, onAddSlot, onAddAllDay, onOpen }: {
  gridRef: React.RefObject<HTMLDivElement | null>;
  days: Date[]; events: ApiEvent[]; now: Date;
  onAddSlot: (d: Date, h: number) => void; onAddAllDay: (d: Date) => void; onOpen: (e: ApiEvent) => void;
}) {
  const allDay = (d: Date) => events.filter((e) => e.allDay && eventCoversDay(e, d));
  const timed = (d: Date) => events.filter((e) => !e.allDay && sameDay(new Date(e.startAt), d));

  return (
    <div className="card overflow-hidden">
      <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: `48px repeat(${days.length},1fr)` }}>
        <div className="border-r border-slate-200" />
        {days.map((d) => {
          const today = sameDay(d, now);
          return (
            <div key={d.toISOString()} className="border-r border-slate-200 px-2 py-1.5 text-center last:border-r-0">
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{DOW[(d.getDay()+6)%7]}</div>
              <div className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${today ? "bg-brand-600 text-white" : "text-slate-700"}`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid border-b border-slate-200 bg-slate-50/50" style={{ gridTemplateColumns: `48px repeat(${days.length},1fr)` }}>
        <div className="flex items-center justify-center border-r border-slate-200 py-1 text-[9px] uppercase text-slate-500">all-day</div>
        {days.map((d) => (
          <div key={d.toISOString()} onClick={() => onAddAllDay(d)} className="min-h-7 cursor-pointer space-y-0.5 border-r border-slate-200 p-1 last:border-r-0 hover:bg-slate-50">
            {allDay(d).map((e) => {
              const m = CATEGORY_META[e.category] || CATEGORY_META.personal;
              return (
                <button key={e.id} onClick={(ev) => { ev.stopPropagation(); onOpen(e); }} className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] ring-1 ring-inset ${m.block}`}>
                  {m.emoji} {e.title}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div ref={gridRef} className="overflow-y-auto" style={{ maxHeight: "min(900px, calc(100vh - 220px))" }}>
        <div className="relative grid" style={{ gridTemplateColumns: `48px repeat(${days.length},1fr)` }}>
          <div className="border-r border-slate-200">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ height: HOUR_H }} className="relative border-b border-slate-100">
                <span className="absolute -top-2 right-1 text-[10px] text-slate-400">
                  {h === 0 ? "" : `${String(h).padStart(2,"0")}:00`}
                </span>
              </div>
            ))}
          </div>
          {days.map((d) => {
            const today = sameDay(d, now);
            return (
              <div key={d.toISOString()} className="relative border-r border-slate-200 last:border-r-0">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} style={{ height: HOUR_H }} onClick={() => onAddSlot(d, h)} className="border-b border-slate-100 hover:bg-brand-50/40" />
                ))}
                {today && (
                  <div className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-rose-500" style={{ top: (minutes(now)/60)*HOUR_H }}>
                    <span className="absolute -left-0 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                  </div>
                )}
                {timed(d).map((e) => {
                  const s = new Date(e.startAt);
                  const en = e.endAt ? new Date(e.endAt) : new Date(s.getTime()+3600000);
                  const top = (minutes(s)/60)*HOUR_H;
                  const height = Math.max(18, ((en.getTime()-s.getTime())/3600000)*HOUR_H - 2);
                  const m = CATEGORY_META[e.category] || CATEGORY_META.personal;
                  return (
                    <button key={e.id} onClick={() => onOpen(e)} style={{ top, height }}
                      className={`absolute left-0.5 right-0.5 z-[5] overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight ring-1 ring-inset ${m.block}`}>
                      <span className="block truncate font-medium">{m.emoji} {e.title}</span>
                      <span className="block truncate opacity-80">
                        {fmtTime(s)}{e.location ? ` · ${e.location}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({ days, cursorMonth, events, now, onAdd, onOpen }: {
  days: Date[]; cursorMonth: number; events: ApiEvent[]; now: Date;
  onAdd: (d: Date) => void; onOpen: (e: ApiEvent) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 text-xs">
        {DOW.map((d) => (
          <div key={d} className="border-r border-slate-200 bg-slate-50 px-2 py-1 font-medium uppercase tracking-wide text-slate-500 last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = d.getMonth() === cursorMonth;
          const today = sameDay(d, now);
          const dayEvents = events.filter((e) => eventCoversDay(e, d));
          return (
            <div key={d.toISOString()} onClick={() => onAdd(d)}
              className={`group min-h-24 cursor-pointer border-b border-r border-slate-200 p-1 last:border-r-0 hover:bg-slate-50 ${inMonth ? "" : "opacity-40"}`}>
              <div className="mb-1 flex items-center gap-1 text-[11px]">
                <span className={today ? "rounded-full bg-brand-600 px-1.5 text-white font-bold" : "text-slate-500"}>{d.getDate()}</span>
                <span className="ml-auto opacity-0 transition group-hover:opacity-100 text-brand-500">+</span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0,3).map((e) => {
                  const m = CATEGORY_META[e.category] || CATEGORY_META.personal;
                  return (
                    <button key={e.id} onClick={(ev) => { ev.stopPropagation(); onOpen(e); }}
                      className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-white">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} />
                      <span className="truncate text-slate-700">
                        {!e.allDay && <span className="tabular-nums text-slate-500">{fmtTime(new Date(e.startAt))} </span>}
                        {e.title}
                      </span>
                    </button>
                  );
                })}
                {dayEvents.length > 3 && <span className="px-1 text-[10px] text-slate-400">+{dayEvents.length - 3} lagi</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniMonth({ cursor, events, now, onPick }: { cursor: Date; events: ApiEvent[]; now: Date; onPick: (d: Date) => void }) {
  const [displayMonth, setDisplayMonth] = useState<Date>(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  useEffect(() => {
    if (displayMonth.getFullYear() !== cursor.getFullYear() || displayMonth.getMonth() !== cursor.getMonth()) {
      setDisplayMonth(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const gridStart = startOfWeek(displayMonth);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const monthLabel = `${MONTHS[displayMonth.getMonth()]} ${displayMonth.getFullYear()}`;

  const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const eventDays = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) {
      const st = startOfDay(new Date(e.startAt));
      const en = e.endAt ? startOfDay(new Date(e.endAt)) : st;
      const span = Math.min(7, Math.floor((en.getTime()-st.getTime())/86400000)+1);
      for (let i = 0; i < span; i++) s.add(dayKey(addDays(st, i)));
    }
    return s;
  }, [events]);

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-slate-800">{monthLabel}</p>
        <div className="flex shrink-0 items-center gap-0.5 text-slate-500">
          <button onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth()-1, 1))} className="rounded px-1.5 py-0.5 text-xs hover:bg-slate-100">‹</button>
          <button onClick={() => setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1))} className="rounded px-1.5 py-0.5 text-[10px] uppercase hover:bg-slate-100">·</button>
          <button onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth()+1, 1))} className="rounded px-1.5 py-0.5 text-xs hover:bg-slate-100">›</button>
        </div>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[9px] font-medium uppercase tracking-wide text-slate-400">
        {DOW.map((d) => <span key={d}>{d.slice(0,1)}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = d.getMonth() === displayMonth.getMonth();
          const today = sameDay(d, now);
          const selected = sameDay(d, cursor);
          const hasEvent = eventDays.has(dayKey(d));
          return (
            <button key={d.toISOString()} onClick={() => onPick(d)}
              className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition ${
                today ? "bg-brand-600 text-white" :
                selected ? "ring-1 ring-inset ring-brand-500/60 text-slate-800" :
                inMonth ? "text-slate-700 hover:bg-slate-100" : "text-slate-400 hover:bg-slate-50"
              }`}>
              {d.getDate()}
              {hasEvent && !today && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function eventCoversDay(e: ApiEvent, d: Date) {
  const s = startOfDay(new Date(e.startAt));
  const en = e.endAt ? startOfDay(new Date(e.endAt)) : s;
  const day = startOfDay(d);
  return day >= s && day <= en;
}
