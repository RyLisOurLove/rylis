import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fmtDate } from "@/lib/fmt";

export default async function LinksPage() {
  await requireSession();
  const links = await prisma.importantLink.findMany({
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    include: { addedBy: true },
  });
  const grouped = links.reduce<Record<string, typeof links>>((acc, l) => {
    (acc[l.category] ||= []).push(l);
    return acc;
  }, {});

  async function add(formData: FormData) {
    "use server";
    const s = await requireSession();
    await prisma.importantLink.create({
      data: {
        title: String(formData.get("title")),
        url: String(formData.get("url")),
        category: String(formData.get("category") || "Lainnya"),
        note: String(formData.get("note") || "") || null,
        addedById: s.userId,
      },
    });
    revalidatePath("/links");
  }
  async function del(formData: FormData) {
    "use server";
    await prisma.importantLink.delete({ where: { id: String(formData.get("id")) } });
    revalidatePath("/links");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">🔗 Important Links</h1>
        <p className="mt-1 text-sm text-slate-600">Shared bookmark — link penting yang sering kalian akses.</p>
      </header>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Tambah Link</h2>
        <form action={add} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Judul</label>
            <input name="title" required className="input" />
          </div>
          <div>
            <label className="label">URL</label>
            <input name="url" type="url" required placeholder="https://" className="input" />
          </div>
          <div>
            <label className="label">Kategori</label>
            <input name="category" required placeholder="Finance / Health / Work / Shopping" className="input" />
          </div>
          <div>
            <label className="label">Catatan</label>
            <input name="note" className="input" />
          </div>
          <div>
            <button className="btn-primary">Simpan</button>
          </div>
        </form>
      </section>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada link tersimpan.</p>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <section key={cat} className="card p-5">
            <h3 className="mb-3 section-title">{cat}</h3>
            <ul className="divide-y divide-slate-100">
              {items.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 hover:underline">{l.title}</a>
                    <p className="truncate text-xs text-slate-500">{l.url}</p>
                    {l.note && <p className="text-xs text-slate-600">{l.note}</p>}
                    <p className="mt-0.5 text-[10px] text-slate-400">Ditambahkan {l.addedBy.emoji} {l.addedBy.name} · {fmtDate(l.createdAt)}</p>
                  </div>
                  <form action={del}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="text-xs text-rose-600 hover:underline">Hapus</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
