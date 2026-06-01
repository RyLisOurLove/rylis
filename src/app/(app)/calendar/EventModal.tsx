"use client";

import { useState } from "react";
import { CATEGORY_META } from "./SharedCalendar";

export type EventDraft = {
  id?: string;
  title: string;
  description: string;
  category: string;
  allDay: boolean;
  startAt: string;
  endAt: string | null;
  location: string;
  attendeeIds: string[];
};

type Person = { id: string; name: string; emoji: string };

// Convert ISO → "YYYY-MM-DDTHH:mm" local datetime-input string.
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${y}-${m}-${dd}T${hh}:${mm}`;
}
function fromLocalInput(v: string) {
  return new Date(v).toISOString();
}

export default function EventModal({
  draft, people, onClose, onSaved,
}: {
  draft: EventDraft; people: Person[]; onClose: () => void; onSaved: () => void;
}) {
  const [d, setD] = useState<EventDraft>(draft);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true); setErr(null);
    const res = await fetch(d.id ? `/api/events/${d.id}` : "/api/events", {
      method: d.id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(d),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Gagal menyimpan");
      return;
    }
    onSaved();
  }
  async function remove() {
    if (!d.id) return;
    if (!confirm("Hapus agenda ini?")) return;
    setBusy(true);
    await fetch(`/api/events/${d.id}`, { method: "DELETE" });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{d.id ? "Edit Agenda" : "Agenda Baru"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Judul</label>
            <input className="input" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="label">Kategori</label>
            <select className="input" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })}>
              {Object.entries(CATEGORY_META).map(([k, m]) => (
                <option key={k} value={k}>{m.emoji} {m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="allday" type="checkbox" checked={d.allDay} onChange={(e) => setD({ ...d, allDay: e.target.checked })} />
            <label htmlFor="allday" className="text-sm text-slate-700">Sepanjang hari</label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Mulai</label>
              <input
                className="input"
                type={d.allDay ? "date" : "datetime-local"}
                value={d.allDay ? toLocalInput(d.startAt).slice(0,10) : toLocalInput(d.startAt)}
                onChange={(e) => setD({ ...d, startAt: fromLocalInput(d.allDay ? `${e.target.value}T00:00` : e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Selesai</label>
              <input
                className="input"
                type={d.allDay ? "date" : "datetime-local"}
                value={d.endAt ? (d.allDay ? toLocalInput(d.endAt).slice(0,10) : toLocalInput(d.endAt)) : ""}
                onChange={(e) => setD({ ...d, endAt: e.target.value ? fromLocalInput(d.allDay ? `${e.target.value}T23:59` : e.target.value) : null })}
              />
            </div>
          </div>
          <div>
            <label className="label">Lokasi</label>
            <input className="input" value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} placeholder="GMS Yogyakarta / Zoom / Rumah" />
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea className="input" rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Peserta</label>
            <div className="flex flex-wrap gap-2">
              {people.map((p) => {
                const on = d.attendeeIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() =>
                      setD({
                        ...d,
                        attendeeIds: on ? d.attendeeIds.filter((i) => i !== p.id) : [...d.attendeeIds, p.id],
                      })
                    }
                    className={`pill border ${on ? "border-brand-500 bg-brand-100 text-brand-700" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    {p.emoji} {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {err && <p className="text-sm text-rose-600">{err}</p>}

          <div className="flex justify-between gap-2 pt-2">
            <div>
              {d.id && (
                <button onClick={remove} disabled={busy} className="btn-ghost !text-rose-600 hover:!bg-rose-50">
                  Hapus
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost">Batal</button>
              <button onClick={save} disabled={busy || !d.title} className="btn-primary">
                {busy ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
