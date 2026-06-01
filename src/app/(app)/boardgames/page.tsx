import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function BoardGamesPage() {
  await requireSession();
  const games = await prisma.boardGame.findMany({ orderBy: [{ status: "asc" }, { title: "asc" }] });

  async function add(formData: FormData) {
    "use server";
    await prisma.boardGame.create({
      data: {
        title: String(formData.get("title")),
        players: String(formData.get("players") || "") || null,
        rating: formData.get("rating") ? Number(formData.get("rating")) : null,
        status: String(formData.get("status") || "owned"),
        note: String(formData.get("note") || "") || null,
      },
    });
    revalidatePath("/boardgames");
  }
  async function del(formData: FormData) {
    "use server";
    await prisma.boardGame.delete({ where: { id: String(formData.get("id")) } });
    revalidatePath("/boardgames");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">🎲 Board Game Collection</h1>
        <p className="mt-1 text-sm text-slate-600">Catatan koleksi & wishlist board game Ryan.</p>
      </header>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Tambah Game</h2>
        <form action={add} className="grid gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="label">Judul</label>
            <input name="title" required className="input" />
          </div>
          <div>
            <label className="label">Players</label>
            <input name="players" placeholder="2-4" className="input" />
          </div>
          <div>
            <label className="label">Rating 1-10</label>
            <input name="rating" type="number" min={1} max={10} className="input" />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input">
              <option value="owned">Owned</option>
              <option value="wishlist">Wishlist</option>
              <option value="played">Played</option>
            </select>
          </div>
          <div className="sm:col-span-4">
            <label className="label">Catatan</label>
            <input name="note" className="input" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full">Simpan</button>
          </div>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <div key={g.id} className="card p-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-slate-900">{g.title}</h3>
              <span className={`pill ${g.status === "owned" ? "bg-emerald-100 text-emerald-700" : g.status === "wishlist" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                {g.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{g.players ? `👥 ${g.players}` : ""}{g.rating ? ` · ⭐ ${g.rating}/10` : ""}</p>
            {g.note && <p className="mt-2 text-sm text-slate-700">{g.note}</p>}
            <form action={del} className="mt-2">
              <input type="hidden" name="id" value={g.id} />
              <button className="text-xs text-rose-600 hover:underline">Hapus</button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
