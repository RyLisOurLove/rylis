import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAgentToken } from "@/lib/agentAuth";

/**
 * GET /api/agent/state
 *
 * One-shot snapshot of EVERYTHING the agent needs to make decisions today.
 * Designed so Claude.ai can call this once at the start of a conversation
 * and have full context for the rest of the chat.
 */
export async function GET(req: Request) {
  const user = await verifyAgentToken(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const today = new Date(now.toDateString());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const in14days = new Date(today);
  in14days.setDate(in14days.getDate() + 14);

  const [
    phase,
    todayPriorities,
    yesterdayPriorities,
    upcomingEvents,
    pipelineActive,
    pipelineStale,
    monthTxns,
    recentJournal,
    recentDevotion,
    recentWorkouts,
    weeklyLogs,
    activeVisions,
    activeWishes,
    activeFitnessGoals,
    financialGoals,
  ] = await Promise.all([
    prisma.lifePhase.findFirst({ where: { active: true } }),
    prisma.priority.findMany({
      where: { userId: user.userId, date: { gte: today, lt: tomorrow } },
      orderBy: { rank: "asc" },
    }),
    prisma.priority.findMany({
      where: {
        userId: user.userId,
        date: { gte: new Date(today.getTime() - 86400000), lt: today },
      },
      orderBy: { rank: "asc" },
    }),
    prisma.event.findMany({
      where: { startAt: { gte: now, lt: in14days } },
      orderBy: { startAt: "asc" },
      take: 20,
      include: { attendees: { include: { user: { select: { name: true } } } } },
    }),
    prisma.opportunity.findMany({
      where: { stage: { in: ["lead", "qualified", "proposal", "negotiation"] } },
      orderBy: [{ probability: "desc" }, { estimatedValue: "desc" }],
    }),
    prisma.opportunity.findMany({
      where: {
        stage: { in: ["lead", "qualified", "proposal", "negotiation"] },
        OR: [
          { nextActionAt: { lt: now } },
          { nextActionAt: null, updatedAt: { lt: new Date(now.getTime() - 5 * 86400000) } },
        ],
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: monthStart, lt: nextMonth } },
    }),
    prisma.journalEntry.findFirst({
      where: { userId: user.userId },
      orderBy: { date: "desc" },
    }),
    prisma.devotion.findFirst({
      where: { userId: user.userId },
      orderBy: { date: "desc" },
    }),
    prisma.workoutLog.count({
      where: { userId: user.userId, date: { gte: weekAgo } },
    }),
    prisma.dailyLog.findMany({
      where: { userId: user.userId, date: { gte: weekAgo } },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.vision.findMany({
      where: { pinned: true },
      take: 5,
    }),
    prisma.wish.findMany({
      where: { done: false },
      orderBy: { priority: "asc" },
      take: 10,
    }),
    prisma.fitnessGoal.findMany({
      where: { done: false },
    }),
    prisma.financialGoal.findMany(),
  ]);

  const income = monthTxns.filter((t) => t.kind === "income").reduce((a, b) => a + b.amount, 0);
  const expense = monthTxns.filter((t) => t.kind === "expense").reduce((a, b) => a + b.amount, 0);
  const expenseByCat = monthTxns
    .filter((t) => t.kind === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const pipelineForecast = pipelineActive.reduce(
    (a, o) => a + Math.round((o.estimatedValue * o.probability) / 100),
    0,
  );

  // Days until end of month (useful for revenue pacing)
  const daysLeftInMonth = Math.ceil((nextMonth.getTime() - now.getTime()) / 86400000);
  const monthDay = now.getDate();
  const monthLen = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthProgress = Math.round((monthDay / monthLen) * 100);

  // Build smart insights — deterministic suggestions the agent can echo
  const insights: string[] = [];
  if (!phase) insights.push("⚠️ Belum ada Life Phase aktif. Set di /phase supaya rekomendasi lebih kontekstual.");
  if (phase?.incomeTargetIdr) {
    const incomeGap = phase.incomeTargetIdr - income;
    const incomePct = Math.round((income / phase.incomeTargetIdr) * 100);
    if (incomePct < monthProgress - 10) {
      insights.push(
        `⚠️ Revenue lagging: ${incomePct}% target tercapai, padahal bulan sudah jalan ${monthProgress}%. Gap: ${formatIdr(incomeGap)}. Sisa ${daysLeftInMonth} hari.`,
      );
    } else if (incomePct >= 100) {
      insights.push(`🎉 Target income tercapai (${incomePct}%)! Surplus: ${formatIdr(income - phase.incomeTargetIdr)}.`);
    }
  }
  if (pipelineStale.length > 0) {
    insights.push(
      `📞 ${pipelineStale.length} opportunity stale (butuh follow-up): ${pipelineStale
        .slice(0, 3)
        .map((o) => o.title)
        .join(", ")}`,
    );
  }
  if (todayPriorities.length === 0) {
    insights.push("📝 Belum set priorities hari ini. Mulai dengan tanya 'apa 3 hal terpenting hari ini?'");
  }
  if (recentDevotion) {
    const daysSince = Math.floor((now.getTime() - new Date(recentDevotion.date).getTime()) / 86400000);
    if (daysSince > 3) insights.push(`🙏 Saat teduh terakhir ${daysSince} hari lalu. Reconnect.`);
  }
  if (recentJournal) {
    const daysSince = Math.floor((now.getTime() - new Date(recentJournal.date).getTime()) / 86400000);
    if (daysSince > 2) insights.push(`🧠 Belum journal ${daysSince} hari. Beri ruang untuk emosi.`);
  }
  if (recentWorkouts < 2) insights.push(`💪 Cuma ${recentWorkouts}× olahraga 7 hari terakhir. Target ideal: 3-4×.`);

  return NextResponse.json({
    user: { name: user.name, emoji: user.emoji },
    now: now.toISOString(),
    today: today.toISOString(),

    phase: phase
      ? {
          name: phase.name,
          situation: phase.situation,
          currentWork: phase.currentWork,
          goals: phase.goals,
          constraints: phase.constraints,
          energyLevel: phase.energyLevel,
          incomeTargetIdr: phase.incomeTargetIdr,
          incomeFloorIdr: phase.incomeFloorIdr,
          startedAt: phase.startedAt.toISOString(),
        }
      : null,

    priorities: {
      today: todayPriorities.map((p) => ({
        id: p.id, rank: p.rank, title: p.title, pillar: p.pillar, done: p.done,
      })),
      yesterday: yesterdayPriorities.map((p) => ({
        rank: p.rank, title: p.title, done: p.done,
      })),
    },

    upcomingEvents: upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt?.toISOString() || null,
      allDay: e.allDay,
      location: e.location,
      attendees: e.attendees.map((a) => a.user.name),
    })),

    pipeline: {
      active: pipelineActive.map((o) => ({
        id: o.id,
        title: o.title,
        kind: o.kind,
        stage: o.stage,
        owner: o.ownerName,
        estimatedValue: o.estimatedValue,
        probability: o.probability,
        nextAction: o.nextAction,
        nextActionAt: o.nextActionAt?.toISOString() || null,
        contactName: o.contactName,
        daysSinceUpdate: Math.floor(
          (now.getTime() - new Date(o.updatedAt).getTime()) / 86400000,
        ),
      })),
      stale: pipelineStale.map((o) => ({ id: o.id, title: o.title, nextAction: o.nextAction })),
      forecast_idr: pipelineForecast,
    },

    finance: {
      month: monthStart.toISOString().slice(0, 7),
      income_idr: income,
      expense_idr: expense,
      net_idr: income - expense,
      expense_by_category: expenseByCat,
      days_left_in_month: daysLeftInMonth,
      month_progress_pct: monthProgress,
      financial_goals: financialGoals.map((g) => ({
        title: g.title,
        target_idr: g.targetAmt,
        current_idr: g.currentAmt,
        progress_pct: Math.round((g.currentAmt / g.targetAmt) * 100),
      })),
    },

    pillars: {
      spiritual_last: recentDevotion
        ? {
            date: recentDevotion.date.toISOString(),
            passage: recentDevotion.passage,
            insight_short: recentDevotion.insight.slice(0, 200),
          }
        : null,
      mental_last: recentJournal
        ? {
            date: recentJournal.date.toISOString(),
            mood: recentJournal.moodScore,
            emotions: recentJournal.emotions,
          }
        : null,
      fisik_workouts_7d: recentWorkouts,
      fitness_goals: activeFitnessGoals.map((g) => ({
        title: g.title, target: g.target, owner: g.ownerName,
      })),
    },

    visions_pinned: activeVisions.map((v) => ({ title: v.title, description: v.description.slice(0, 300) })),
    wishlist_top: activeWishes.map((w) => ({ title: w.title, kind: w.kind, priority: w.priority })),

    recent_logs: weeklyLogs.map((l) => ({
      date: l.date.toISOString().slice(0, 10),
      kind: l.kind,
      title: l.title,
    })),

    insights, // <- list of heuristic suggestions for the agent to echo or build on
  });
}

function formatIdr(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
