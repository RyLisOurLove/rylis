import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const events = await prisma.event.findMany({
    where: from && to ? { startAt: { gte: new Date(from), lt: new Date(to) } } : {},
    orderBy: { startAt: "asc" },
    include: { attendees: { include: { user: { select: { id: true, name: true, emoji: true } } } } },
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.title || !b.startAt) return NextResponse.json({ error: "title & startAt required" }, { status: 400 });
  const e = await prisma.event.create({
    data: {
      title: b.title,
      description: b.description || null,
      category: b.category || "personal",
      allDay: !!b.allDay,
      startAt: new Date(b.startAt),
      endAt: b.endAt ? new Date(b.endAt) : null,
      location: b.location || null,
      createdById: s.userId,
      attendees: {
        create: (b.attendeeIds || []).map((id: string) => ({ userId: id })),
      },
    },
  });
  return NextResponse.json({ event: e });
}
