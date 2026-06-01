import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseDriveUrl, listDriveFolderMedia } from "@/lib/drive";
import VisionTabs from "./VisionTabs";

export default async function VisionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  await requireSession();
  const sp = await searchParams;
  const tab = sp.tab === "wishlist" ? "wishlist" : "vision";

  const [visions, wishes] = await Promise.all([
    prisma.vision.findMany({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] }),
    prisma.wish.findMany({ orderBy: [{ done: "asc" }, { priority: "asc" }, { createdAt: "desc" }] }),
  ]);

  async function addVision(formData: FormData) {
    "use server";
    await requireSession();
    const driveUrl = String(formData.get("driveUrl") || "") || null;
    let cachedImageIds = "[]";

    // If user gave a Drive folder URL and the API key is configured, pre-cache
    // the image ids so the carousel works immediately without a separate refresh.
    if (driveUrl) {
      const target = parseDriveUrl(driveUrl);
      if (target) {
        if (target.kind === "file") {
          cachedImageIds = JSON.stringify([target.id]);
        } else if (process.env.GOOGLE_DRIVE_API_KEY) {
          try {
            const files = await listDriveFolderMedia(target.id);
            cachedImageIds = JSON.stringify(files.map((f) => f.id));
          } catch {
            // fall through — user can refresh later via API key.
          }
        }
      }
    }

    await prisma.vision.create({
      data: {
        title: String(formData.get("title")),
        description: String(formData.get("description") || ""),
        category: String(formData.get("category") || "life"),
        driveUrl,
        cachedImageIds,
        pinned: formData.get("pinned") === "on",
      },
    });
    revalidatePath("/vision");
  }

  async function refreshVision(formData: FormData) {
    "use server";
    await requireSession();
    const id = String(formData.get("id"));
    const v = await prisma.vision.findUnique({ where: { id } });
    if (!v?.driveUrl) return;
    const target = parseDriveUrl(v.driveUrl);
    if (!target) return;
    let ids: string[] = [];
    if (target.kind === "file") ids = [target.id];
    else {
      try {
        const files = await listDriveFolderMedia(target.id);
        ids = files.map((f) => f.id);
      } catch {
        // ignore — show user error via revalidate; in a real app, surface message
      }
    }
    await prisma.vision.update({ where: { id }, data: { cachedImageIds: JSON.stringify(ids) } });
    revalidatePath("/vision");
  }

  async function delVision(formData: FormData) {
    "use server";
    await prisma.vision.delete({ where: { id: String(formData.get("id")) } });
    revalidatePath("/vision");
  }
  async function togglePin(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const v = await prisma.vision.findUnique({ where: { id } });
    if (v) await prisma.vision.update({ where: { id }, data: { pinned: !v.pinned } });
    revalidatePath("/vision");
  }

  async function addWish(formData: FormData) {
    "use server";
    await requireSession();
    await prisma.wish.create({
      data: {
        title: String(formData.get("title")),
        kind: String(formData.get("kind") || "experience"),
        location: String(formData.get("location") || "") || null,
        note: String(formData.get("note") || "") || null,
        priority: Number(formData.get("priority") || 2),
        targetBy: formData.get("targetBy") ? new Date(String(formData.get("targetBy"))) : null,
      },
    });
    revalidatePath("/vision");
  }
  async function toggleWish(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const w = await prisma.wish.findUnique({ where: { id } });
    if (w) {
      await prisma.wish.update({
        where: { id },
        data: { done: !w.done, doneAt: !w.done ? new Date() : null },
      });
    }
    revalidatePath("/vision");
  }
  async function delWish(formData: FormData) {
    "use server";
    await prisma.wish.delete({ where: { id: String(formData.get("id")) } });
    revalidatePath("/vision");
  }

  const visionList = visions.map((v) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    category: v.category,
    driveUrl: v.driveUrl,
    pinned: v.pinned,
    imageIds: (() => {
      try { return JSON.parse(v.cachedImageIds) as string[]; } catch { return []; }
    })(),
  }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">✨ Vision &amp; Wishlist</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mimpi besar yang menggerakkan, dan langkah-langkah kecil yang melaluinya.
        </p>
      </header>

      <VisionTabs
        active={tab}
        driveEnabled={!!process.env.GOOGLE_DRIVE_API_KEY}
        visions={visionList}
        wishes={wishes.map((w) => ({
          id: w.id, title: w.title, kind: w.kind, location: w.location,
          note: w.note, priority: w.priority, targetBy: w.targetBy?.toISOString() || null,
          done: w.done,
        }))}
        actions={{
          addVision, refreshVision, delVision, togglePin,
          addWish, toggleWish, delWish,
        }}
      />
    </div>
  );
}
