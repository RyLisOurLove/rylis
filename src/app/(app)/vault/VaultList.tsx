"use client";

import { useState } from "react";

type Entry = {
  id: string; label: string; username: string; password: string;
  url: string | null; note: string | null; addedByName: string;
};

export default function VaultList({ entries, onDelete }: {
  entries: Entry[];
  onDelete: (fd: FormData) => Promise<void>;
}) {
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(v: string, key: string) {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">Belum ada akun tersimpan.</p>;
  }

  return (
    <section className="card p-5">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Daftar Akun</h2>
      <ul className="divide-y divide-slate-100">
        {entries.map((e) => {
          const shown = reveal[e.id];
          return (
            <li key={e.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{e.label}</p>
                  {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-700 hover:underline">{e.url}</a>}
                </div>
                <form action={onDelete}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-xs text-rose-600 hover:underline">Hapus</button>
                </form>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <FieldRow label="Username" value={e.username} onCopy={() => copy(e.username, e.id+"u")} copied={copied === e.id+"u"} />
                <FieldRow
                  label="Password"
                  value={shown ? e.password : "•".repeat(Math.min(12, e.password.length))}
                  onCopy={() => copy(e.password, e.id+"p")}
                  copied={copied === e.id+"p"}
                  right={
                    <button onClick={() => setReveal({ ...reveal, [e.id]: !shown })} className="text-xs text-slate-500 hover:text-slate-800">
                      {shown ? "Sembunyikan" : "Tampilkan"}
                    </button>
                  }
                />
              </div>
              {e.note && <p className="mt-1 text-xs text-slate-500">{e.note}</p>}
              <p className="mt-1 text-[10px] text-slate-400">Oleh {e.addedByName}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FieldRow({ label, value, onCopy, copied, right }: {
  label: string; value: string; onCopy: () => void; copied: boolean; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm">
      <span className="w-20 shrink-0 text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className="flex-1 truncate font-mono text-slate-800">{value}</span>
      {right}
      <button onClick={onCopy} className="text-xs text-brand-700 hover:underline">
        {copied ? "✓ tersalin" : "Salin"}
      </button>
    </div>
  );
}
