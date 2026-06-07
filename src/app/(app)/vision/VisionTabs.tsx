"use client";

import { useState } from "react";
import VisionCarousel from "./VisionCarousel";

type VisionItem = {
  id: string; title: string; description: string; category: string;
  driveUrl: string | null; pinned: boolean; imageIds: string[];
};
type WishItem = {
  id: string; title: string; kind: string; location: string | null;
  note: string | null; priority: number; targetBy: string | null; done: boolean;
};

const VISION_CATS: Record<string, { emoji: string; label: string; tone: string }> = {
  life: { emoji: "🌅", label: "Life", tone: "bg-amber-100 text-amber-800" },
  family: { emoji: "💞", label: "Family", tone: "bg-rose-100 text-rose-800" },
  career: { emoji: "💼", label: "Career", tone: "bg-slate-200 text-slate-800" },
  spiritual: { emoji: "🙏", label: "Spiritual", tone: "bg-violet-100 text-violet-800" },
  financial: { emoji: "💰", label: "Financial", tone: "bg-emerald-100 text-emerald-800" },
};
const WISH_KINDS: Record<string, { emoji: string; label: string }> = {
  activity: { emoji: "🎯", label: "Aktivitas" },
  place: { emoji: "📍", label: "Tempat" },
  experience: { emoji: "✨", label: "Pengalaman" },
  thing: { emoji: "🎁", label: "Barang" },
};
const PRIO: Record<number, { label: string; tone: string }> = {
  1: { label: "High", tone: "bg-rose-100 text-rose-700" },
  2: { label: "Medium", tone: "bg-amber-100 text-amber-700" },
  3: { label: "Low", tone: "bg-slate-100 text-slate-600" },
};

export default function VisionTabs({
  active,
  driveEnabled,
  visions,
  wishes,
  actions,
}: {
  active: "vision" | "wishlist";
  driveEnabled: boolean;
  visions: VisionItem[];
  wishes: WishItem[];
  actions: {
    addVision: (fd: FormData) => Promise<void>;
    refreshVision: (fd: FormData) => Promise<void>;
    delVision: (fd: FormData) => Promise<void>;
    togglePin: (fd: FormData) => Promise<void>;
    addWish: (fd: FormData) => Promise<void>;
    toggleWish: (fd: FormData) => Promise<void>;
    delWish: (fd: FormData) => Promise<void>;
  };
}) {
  const [tab, setTab] = useState<"vision" | "wishlist">(active);

  return (
    <>
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white/60 p-1 shadow-sm">
        <TabButton on={tab === "vision"} onClick={() => setTab("vision")} emoji="🌅" label="Vision Besar" />
        <TabButton on={tab === "wishlist"} onClick={() => setTab("wishlist")} emoji="📝" label="Wishlist" />
      </div>

      {tab === "vision" ? (
        <VisionTab visions={visions} driveEnabled={driveEnabled} actions={actions} />
      ) : (
        <WishlistTab wishes={wishes} actions={actions} />
      )}
    </>
  );
}

function TabButton({ on, onClick, emoji, label }: { on: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition sm:flex-none ${
        on ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function VisionTab({
  visions, driveEnabled, actions,
}: {
  visions: VisionItem[]; driveEnabled: boolean;
  actions: VisionTabsProps;
}) {
  const [showForm, setShowForm] = useState(visions.length === 0);

  return (
    <div className="space-y-5">
      {!driveEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Drive integration belum aktif.</strong> Tambahkan{" "}
          <code className="rounded bg-white/60 px-1">GOOGLE_DRIVE_API_KEY</code> di <code>.env</code> untuk
          membuka folder Drive sebagai galeri carousel. Tanpa key, kamu masih bisa pakai single-file Drive URL.
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary !text-xs">
          {showForm ? "Tutup form" : "+ Tambah Vision"}
        </button>
      </div>

      {showForm && (
        <form action={actions.addVision} className="card grid gap-3 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Judul Vision</label>
            <input name="title" required placeholder="Punya rumah sendiri di Yogyakarta" className="input" />
          </div>
          <div>
            <label className="label">Kategori</label>
            <select name="category" className="input">
              {Object.entries(VISION_CATS).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="pinned" />
              Pin ke atas
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Deskripsi / cerita</label>
            <textarea name="description" rows={3} className="input" placeholder="Bayangkan kalau visi ini terwujud, seperti apa rasanya, di mana, siapa di sekitarnya..." />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Google Drive URL (folder atau file)</label>
            <input
              name="driveUrl"
              placeholder="https://drive.google.com/drive/folders/... atau /file/d/..."
              className="input"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Folder: share &quot;Anyone with the link can view&quot;. Galeri akan jadi carousel otomatis.
            </p>
          </div>
          <div>
            <button className="btn-primary">Simpan Vision</button>
          </div>
        </form>
      )}

      {visions.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada vision. Mulai dari mimpi terbesarmu.</p>
      ) : (
        <div className="space-y-5">
          {visions.map((v) => {
            const cat = VISION_CATS[v.category] || VISION_CATS.life;
            return (
              <article key={v.id} className="card overflow-hidden">
                {v.imageIds.length > 0 && (
                  <VisionCarousel imageIds={v.imageIds} title={v.title} />
                )}
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`pill ${cat.tone}`}>{cat.emoji} {cat.label}</span>
                    {v.pinned && <span className="pill bg-brand-100 text-brand-700">📌 Pinned</span>}
                    {v.imageIds.length > 0 && (
                      <span className="pill bg-slate-100 text-slate-600">🖼️ {v.imageIds.length} gambar</span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <form action={actions.togglePin}>
                        <input type="hidden" name="id" value={v.id} />
                        <button className="text-xs text-slate-500 hover:text-brand-600">
                          {v.pinned ? "Unpin" : "Pin"}
                        </button>
                      </form>
                      {v.driveUrl && driveEnabled && (
                        <form action={actions.refreshVision}>
                          <input type="hidden" name="id" value={v.id} />
                          <button className="text-xs text-slate-500 hover:text-brand-600">Refresh Drive</button>
                        </form>
                      )}
                      <form action={actions.delVision}>
                        <input type="hidden" name="id" value={v.id} />
                        <button className="text-xs text-rose-600 hover:underline">Hapus</button>
                      </form>
                    </div>
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">{v.title}</h2>
                  {v.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{v.description}</p>
                  )}
                  {v.driveUrl && (
                    <a
                      href={v.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-brand-700 hover:underline"
                    >
                      Buka di Google Drive ↗
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

type VisionTabsProps = {
  addVision: (fd: FormData) => Promise<void>;
  refreshVision: (fd: FormData) => Promise<void>;
  delVision: (fd: FormData) => Promise<void>;
  togglePin: (fd: FormData) => Promise<void>;
  addWish: (fd: FormData) => Promise<void>;
  toggleWish: (fd: FormData) => Promise<void>;
  delWish: (fd: FormData) => Promise<void>;
};

function WishlistTab({ wishes, actions }: { wishes: WishItem[]; actions: VisionTabsProps }) {
  const grouped = wishes.reduce<Record<string, WishItem[]>>((acc, w) => {
    (acc[w.kind] ||= []).push(w);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">+ Tambah Wishlist</h2>
        <form action={actions.addWish} className="grid gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="label">Judul</label>
            <input name="title" required placeholder="Trip lihat sakura di Kyoto" className="input" />
          </div>
          <div>
            <label className="label">Jenis</label>
            <select name="kind" className="input">
              {Object.entries(WISH_KINDS).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Prioritas</label>
            <select name="priority" className="input" defaultValue={2}>
              <option value={1}>High</option>
              <option value={2}>Medium</option>
              <option value={3}>Low</option>
            </select>
          </div>
          <div>
            <label className="label">Target tanggal</label>
            <input name="targetBy" type="date" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Lokasi</label>
            <input name="location" placeholder="Kyoto, Jepang" className="input" />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Catatan</label>
            <input name="note" className="input" />
          </div>
          <div className="sm:col-span-5">
            <button className="btn-primary">Simpan</button>
          </div>
        </form>
      </section>

      {wishes.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada wishlist. Tulis apapun yang mau dicoba bareng.</p>
      ) : (
        Object.entries(grouped).map(([kind, items]) => {
          const meta = WISH_KINDS[kind] || WISH_KINDS.experience;
          return (
            <section key={kind} className="card p-5">
              <h3 className="mb-3 section-title">{meta.emoji} {meta.label}</h3>
              <ul className="divide-y divide-slate-100">
                {items.map((w) => (
                  <li key={w.id} className="flex items-center gap-3 py-3">
                    <form action={actions.toggleWish}>
                      <input type="hidden" name="id" value={w.id} />
                      <button
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          w.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                        }`}
                      >
                        {w.done ? "✓" : ""}
                      </button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-medium ${w.done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                          {w.title}
                        </p>
                        <span className={`pill ${PRIO[w.priority]?.tone || PRIO[2].tone}`}>{PRIO[w.priority]?.label || "Medium"}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {w.location ? `📍 ${w.location}` : ""}
                        {w.location && w.targetBy ? " · " : ""}
                        {w.targetBy ? `🎯 ${new Date(w.targetBy).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                      </p>
                      {w.note && <p className="mt-0.5 text-sm text-slate-600">{w.note}</p>}
                    </div>
                    <form action={actions.delWish}>
                      <input type="hidden" name="id" value={w.id} />
                      <button className="text-xs text-rose-600 hover:underline">Hapus</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
