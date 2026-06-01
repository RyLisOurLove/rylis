/**
 * Google Drive helpers — hot-link thumbnails for embedded carousels, plus
 * folder listing via API key (folder must be shared "Anyone with the link").
 *
 * Set GOOGLE_DRIVE_API_KEY in .env / Vercel env to enable folder browsing.
 */

export type DriveTarget =
  | { kind: "file"; id: string }
  | { kind: "folder"; id: string };

export function parseDriveUrl(raw: string): DriveTarget | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!url) return null;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (fileMatch) return { kind: "file", id: fileMatch[1] };
  const folderMatch = url.match(/\/drive\/folders\/([a-zA-Z0-9_-]{20,})/);
  if (folderMatch) return { kind: "folder", id: folderMatch[1] };
  try {
    const u = new URL(url);
    const id = u.searchParams.get("id");
    if (id && id.length >= 20) return { kind: "file", id };
  } catch {}
  return null;
}

export function driveThumbnail(id: string, size = 1600) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
}

export type DriveFile = { id: string; name: string; mimeType: string };

export async function listDriveFolderMedia(folderId: string): Promise<DriveFile[]> {
  const key = process.env.GOOGLE_DRIVE_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GOOGLE_DRIVE_API_KEY belum di-set. Tambahkan di .env / env Vercel.",
    );
  }
  const q = `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`;
  const u = new URL("https://www.googleapis.com/drive/v3/files");
  u.searchParams.set("q", q);
  u.searchParams.set("fields", "files(id,name,mimeType)");
  u.searchParams.set("orderBy", "name");
  u.searchParams.set("pageSize", "100");
  u.searchParams.set("key", key);
  u.searchParams.set("supportsAllDrives", "true");
  u.searchParams.set("includeItemsFromAllDrives", "true");
  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Drive folder fetch gagal (${res.status})${
        res.status === 403
          ? " — pastikan folder di-share 'Anyone with the link can view' dan Drive API aktif untuk API key."
          : ""
      }${detail ? ` — ${detail.slice(0, 200)}` : ""}`,
    );
  }
  const json = (await res.json()) as { files?: DriveFile[] };
  return json.files ?? [];
}
