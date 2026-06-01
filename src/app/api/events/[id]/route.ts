import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const b = await req.json();
  await prisma.event.update({
    where: { id },
    data: {
      title: b.title,
      description: b.description || null,
      category: b.category,
      allDay: !!b.allDay,
      startAt: new Date(b.startAt),
      endAt: b.endAt ? new Date(b.endAt) : null,
      location: b.location || null,
    },
  });
  // reset attendees
  await prisma.eventAttendee.deleteMany({ where: { eventId: id } });
  if (b.attendeeIds?.length) {
    await prisma.eventAttendee.createMany({
      data: b.attendeeIds.map((uid: string) => ({ eventId: id, userId: uid })),
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
