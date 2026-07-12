import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAgentToken } from "@/lib/agentAuth";

/**
 * POST /api/agent/actions
 *
 * One endpoint for all write actions. Claude.ai sends { action, ...args }
 * and we dispatch. Keeps the surface area small and easy to teach in the
 * system prompt.
 *
 * Supported actions:
 *   - set_priorities       { date?, items: [{ rank, title, pillar }] }
 *   - complete_priority    { id }
 *   - add_log              { kind, title, body, tag? }
 *   - add_journal          { moodScore, emotions, events, reflection, gratitude? }
 *   - add_devotion         { passage, version?, insight, prayer?, mood? }
 *   - add_workout          { type, duration, intensity, notes? }
 *   - add_transaction      { kind, category, amount, description, account?, date? }
 *   - add_event            { title, category, startAt, endAt?, allDay?, location?, attendees? }
 *   - add_opportunity      { title, kind, owner, estimatedValue, probability?, stage?, nextAction?, nextActionAt?, contactName?, notes? }
 *   - update_opportunity   { id, stage?, probability?, nextAction?, nextActionAt?, notes?, closedAs?, closedNote? }
 *   - set_phase            { name, situation, currentWork, goals, constraints, energyLevel?, incomeTargetIdr?, incomeFloorIdr?, notes? }
 *   - add_wish             { title, kind, priority?, location?, note?, targetBy? }
 */
export async function POST(req: Request) {
  const user = await verifyAgentToken(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const action = String(body.action || "");

  try {
    switch (action) {
      case "set_priorities": {
        const date = body.date ? new Date(String(body.date)) : new Date(new Date().toDateString());
        const items = body.items as Array<{ rank: number; title: string; pillar: string; opportunityId?: string }>;
        if (!Array.isArray(items)) return bad("items must be array");
        // Replace today's priorities atomically — agent commonly re-syncs them
        await prisma.priority.deleteMany({
          where: {
            userId: user.userId,
            date: { gte: date, lt: new Date(date.getTime() + 86400000) },
          },
        });
        const created = await prisma.priority.createMany({
          data: items.map((it) => ({
            userId: user.userId,
            date,
            rank: Number(it.rank),
            title: String(it.title),
            pillar: String(it.pillar || "personal"),
            opportunityId: it.opportunityId || null,
          })),
        });
        return NextResponse.json({ ok: true, created: created.count });
      }
      case "complete_priority": {
        const id = String(body.id);
        await prisma.priority.update({
          where: { id },
          data: { done: true, doneAt: new Date() },
        });
        return NextResponse.json({ ok: true });
      }
      case "add_log": {
        const date = body.date ? new Date(String(body.date)) : new Date();
        const log = await prisma.dailyLog.create({
          data: {
            userId: user.userId,
            date,
            kind: String(body.kind || "note"),
            title: String(body.title),
            body: String(body.body || ""),
            tag: body.tag ? String(body.tag) : null,
          },
        });
        return NextResponse.json({ ok: true, id: log.id });
      }
      case "add_journal": {
        const j = await prisma.journalEntry.create({
          data: {
            userId: user.userId,
            date: body.date ? new Date(String(body.date)) : new Date(),
            moodScore: Number(body.moodScore || 5),
            emotions: String(body.emotions || ""),
            events: String(body.events || ""),
            reflection: String(body.reflection || ""),
            gratitude: body.gratitude ? String(body.gratitude) : null,
          },
        });
        return NextResponse.json({ ok: true, id: j.id });
      }
      case "add_devotion": {
        const d = await prisma.devotion.create({
          data: {
            userId: user.userId,
            date: body.date ? new Date(String(body.date)) : new Date(),
            passage: String(body.passage),
            version: String(body.version || "TB"),
            insight: String(body.insight),
            prayer: body.prayer ? String(body.prayer) : null,
            mood: body.mood ? String(body.mood) : null,
          },
        });
        return NextResponse.json({ ok: true, id: d.id });
      }
      case "add_workout": {
        const w = await prisma.workoutLog.create({
          data: {
            userId: user.userId,
            date: body.date ? new Date(String(body.date)) : new Date(),
            type: String(body.type),
            duration: Number(body.duration),
            intensity: String(body.intensity || "medium"),
            notes: body.notes ? String(body.notes) : null,
          },
        });
        return NextResponse.json({ ok: true, id: w.id });
      }
      case "add_transaction": {
        const t = await prisma.transaction.create({
          data: {
            userId: user.userId,
            date: body.date ? new Date(String(body.date)) : new Date(),
            kind: String(body.kind), // income | expense
            category: String(body.category),
            amount: Number(body.amount),
            description: String(body.description),
            account: body.account ? String(body.account) : null,
          },
        });
        return NextResponse.json({ ok: true, id: t.id });
      }
      case "add_event": {
        const attendeeIds = (body.attendees as string[] | undefined) || [];
        const e = await prisma.event.create({
          data: {
            title: String(body.title),
            description: body.description ? String(body.description) : null,
            category: String(body.category || "personal"),
            allDay: !!body.allDay,
            startAt: new Date(String(body.startAt)),
            endAt: body.endAt ? new Date(String(body.endAt)) : null,
            location: body.location ? String(body.location) : null,
            createdById: user.userId,
            attendees: { create: attendeeIds.map((uid) => ({ userId: uid })) },
          },
        });
        return NextResponse.json({ ok: true, id: e.id });
      }
      case "add_opportunity": {
        const o = await prisma.opportunity.create({
          data: {
            title: String(body.title),
            kind: String(body.kind || "lead"),
            ownerName: String(body.owner || "Ryan"),
            estimatedValue: Number(body.estimatedValue || 0),
            probability: Number(body.probability ?? 50),
            stage: String(body.stage || "lead"),
            source: body.source ? String(body.source) : null,
            nextAction: body.nextAction ? String(body.nextAction) : null,
            nextActionAt: body.nextActionAt ? new Date(String(body.nextActionAt)) : null,
            contactName: body.contactName ? String(body.contactName) : null,
            contactInfo: body.contactInfo ? String(body.contactInfo) : null,
            notes: body.notes ? String(body.notes) : null,
          },
        });
        return NextResponse.json({ ok: true, id: o.id });
      }
      case "update_opportunity": {
        const id = String(body.id);
        const data: Record<string, unknown> = {};
        if (body.stage !== undefined) data.stage = String(body.stage);
        if (body.probability !== undefined) data.probability = Number(body.probability);
        if (body.nextAction !== undefined) data.nextAction = body.nextAction ? String(body.nextAction) : null;
        if (body.nextActionAt !== undefined) data.nextActionAt = body.nextActionAt ? new Date(String(body.nextActionAt)) : null;
        if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null;
        if (body.closedAs !== undefined) {
          data.closedAs = String(body.closedAs);
          data.closedAt = new Date();
          data.stage = body.closedAs === "won" ? "won" : "lost";
        }
        if (body.closedNote !== undefined) data.closedNote = String(body.closedNote);
        await prisma.opportunity.update({ where: { id }, data });
        return NextResponse.json({ ok: true });
      }
      case "set_phase": {
        // End any active phase, start a new active one.
        await prisma.lifePhase.updateMany({
          where: { active: true },
          data: { active: false, endedAt: new Date() },
        });
        const p = await prisma.lifePhase.create({
          data: {
            name: String(body.name),
            active: true,
            situation: String(body.situation || ""),
            currentWork: String(body.currentWork || ""),
            goals: String(body.goals || ""),
            constraints: String(body.constraints || ""),
            energyLevel: String(body.energyLevel || "medium"),
            incomeTargetIdr: body.incomeTargetIdr ? Number(body.incomeTargetIdr) : null,
            incomeFloorIdr: body.incomeFloorIdr ? Number(body.incomeFloorIdr) : null,
            fixedIncomeIdr: body.fixedIncomeIdr ? Number(body.fixedIncomeIdr) : null,
            notes: body.notes ? String(body.notes) : null,
          },
        });
        return NextResponse.json({ ok: true, id: p.id });
      }
      case "add_wish": {
        const w = await prisma.wish.create({
          data: {
            title: String(body.title),
            kind: String(body.kind || "experience"),
            priority: Number(body.priority || 2),
            location: body.location ? String(body.location) : null,
            note: body.note ? String(body.note) : null,
            targetBy: body.targetBy ? new Date(String(body.targetBy)) : null,
          },
        });
        return NextResponse.json({ ok: true, id: w.id });
      }
      default:
        return bad(`unknown action: ${action}`);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
