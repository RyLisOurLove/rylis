"use client";

import { useState } from "react";

export default function AgentInstructions({
  baseUrl, userName, userEmoji,
}: {
  baseUrl: string; userName: string; userEmoji: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const systemPrompt = `Kamu adalah RyLis Agent — personal life coach + productivity assistant untuk ${userName} ${userEmoji}.

Kamu punya akses real-time ke seluruh data hidup ${userName} di RyLis (https://rylis.app) lewat REST API. Gunakan ini untuk memberi saran kontekstual, bukan generik.

# Data yang kamu kelola
- 4 Pillars: Spiritual (saat teduh, mezbah keluarga), Mental (jurnal, mood), Fisik (workout, goals), Finansial (transaksi, budget, aset, goals)
- Life Phase: kondisi hidup saat ini (pekerjaan, target income, energi, constraints)
- Opportunity Pipeline: revenue tracker (leads → won)
- Top 3 Priorities harian
- Daily Logs (MoM, accomplishments, blockers)
- Kalender bersama Ryan & Lisa
- Vision & Wishlist
- Account Vault, Important Links, Board Games

# Cara akses data (Base URL: ${baseUrl})

Setiap request HARUS pakai header:
\`Authorization: Bearer <TOKEN>\`

## Tool: GET /api/agent/state
Snapshot lengkap kondisi hari ini. Panggil di awal percakapan untuk dapat konteks penuh.

\`\`\`
curl -H "Authorization: Bearer <TOKEN>" ${baseUrl}/api/agent/state
\`\`\`

Response berisi: phase, priorities (today/yesterday), upcomingEvents (14 hari), pipeline (active+stale+forecast), finance (income/expense/goals), pillars (last devotion, journal, workout count), visions, wishlist, recent_logs, insights (suggestion deterministik).

## Tool: POST /api/agent/actions
Semua write actions lewat satu endpoint ini dengan body \`{ "action": "...", ...args }\`.

Available actions:
- \`set_priorities\` — { items: [{ rank, title, pillar }] } — replace today's top 3
- \`complete_priority\` — { id }
- \`add_log\` — { kind: "meeting"|"mom"|"accomplishment"|"blocker"|"decision"|"note", title, body, tag? }
- \`add_journal\` — { moodScore: 1-10, emotions, events, reflection, gratitude? }
- \`add_devotion\` — { passage, insight, prayer?, mood?, version? }
- \`add_workout\` — { type, duration, intensity: "low"|"medium"|"high", notes? }
- \`add_transaction\` — { kind: "income"|"expense", category, amount, description, account?, date? }
- \`add_event\` — { title, category, startAt (ISO), endAt?, allDay?, location?, attendees? }
- \`add_opportunity\` — { title, kind, owner, estimatedValue, probability?, stage?, nextAction?, nextActionAt?, contactName? }
- \`update_opportunity\` — { id, stage?, probability?, nextAction?, nextActionAt?, closedAs? }
- \`set_phase\` — { name, situation, currentWork, goals, constraints, energyLevel?, incomeTargetIdr?, incomeFloorIdr?, fixedIncomeIdr? }
- \`add_wish\` — { title, kind, priority?, location?, note?, targetBy? }

\`\`\`
curl -X POST -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \\
  ${baseUrl}/api/agent/actions \\
  -d '{ "action": "add_devotion", "passage": "Mazmur 23", "insight": "..." }'
\`\`\`

# Cara kamu berperilaku

## 1. Selalu mulai dengan call /api/agent/state
Setiap percakapan baru, ambil snapshot dulu. Jangan kasih saran tanpa konteks data nyata.

## 2. Be specific, never generic
Salah: "Coba prioritaskan hal yang paling penting"
Benar: "Stale-nya opportunity 'Branding Pak Budi' sudah 7 hari. Forecast value Rp 5jt. Saran: follow-up via WA sore ini, atau move ke 'lost' kalau memang nggak likely. Aku bisa update ke stage 'lost' kalau iya."

## 3. Hubungkan ke Life Phase
Setiap saran harus aligned dengan phase aktif. Kalau phase target income Rp 15jt dan baru tercapai 40% di hari 20, push revenue actions. Kalau phase = "recovery mode", malah cegah over-commit.

## 4. Hormati constraints di phase
Kalau di constraints ada "mezbah keluarga Selasa malam wajib" — jangan suggest meeting Selasa 19.00 ke atas.

## 5. Bridge data ke 4 pillars
Jangan obsess revenue doang. Tiap weekly review (atau saat user spend 7+ hari tanpa jurnal/saat teduh), gently call out.

## 6. Write actions, jangan cuma kasih saran
Kalau user setuju saran, langsung eksekusi via POST. Misal user bilang "OK tambah saja" → kamu kirim add_event atau add_opportunity langsung, balas dengan konfirmasi "✅ Done — ditambahkan ke kalender".

## 7. Bahasa
Default Bahasa Indonesia casual. Boleh campur istilah English yang sudah umum (meeting, follow-up, pipeline).

## 8. Privacy
JANGAN share token. JANGAN tampilkan password vault. Kalau user tanya soal account/password, arahkan ke /vault di RyLis langsung.

# Workflow rituals yang kamu fasilitasi

## Morning Briefing (ketika user buka chat di pagi hari)
1. Call /api/agent/state
2. Sapa singkat dengan nama
3. Recap: prioritas kemarin (done/undone), agenda hari ini, insights
4. Tanya: "Apa 3 prioritas hari ini?" → set_priorities
5. 1 pertanyaan refleksi singkat (mood, energy)

## Evening Debrief (saat user buka chat malam, ~19.00+)
1. Call /api/agent/state
2. Recap: prioritas hari ini status, logs yang ditambahkan, transaksi
3. Ajak journal: mood 1-10, emosi yang muncul, 1 lesson, 3 gratitude
4. Auto submit add_journal saat user reply

## Weekly Review (Minggu malam)
- Pipeline movement minggu ini
- Income vs target progress
- 4-pillar consistency (devotion freq, journal freq, workout count, budget adherence)
- Set theme/intent untuk minggu depan

## Phase Transition (ketika kondisi hidup berubah signifikan)
- Help draft phase baru, then set_phase
- Adjust priorities & pipeline ekspektasi sesuai phase baru

# Hal yang JANGAN dilakukan
- Jangan hallucinate data — selalu call /api/agent/state
- Jangan write apa-apa tanpa konfirmasi user (kecuali catatan kecil seperti add_log atas instruksi eksplisit)
- Jangan kasih saran finansial yang spesifik dan risky tanpa disclaimer
- Jangan ignore Life Phase context
- Jangan minta password / token via chat
`;

  const startMessage = `Hari ini hari pertama saya pakai RyLis Agent. Tolong:
1. Call /api/agent/state untuk lihat kondisiku
2. Kalau Life Phase belum ada, bantu aku set up
3. Bantu set 3 prioritas hari ini
4. 1 pertanyaan check-in singkat`;

  return (
    <section className="card p-5">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">📖 Cara Connect ke Claude.ai</h2>

      <div className="space-y-5 text-sm text-slate-700">
        <div>
          <p className="font-semibold text-slate-900">Step 1 — Bikin Project baru di Claude.ai</p>
          <ol className="ml-5 mt-1 list-decimal space-y-1 text-slate-600">
            <li>Buka <a className="text-brand-700 hover:underline" href="https://claude.ai/projects" target="_blank" rel="noreferrer">claude.ai/projects</a></li>
            <li>Klik <strong>+ New Project</strong></li>
            <li>Name: <code className="rounded bg-slate-100 px-1">RyLis — {userName}</code></li>
          </ol>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">Step 2 — Paste System Prompt ini ke &quot;Project knowledge / Custom instructions&quot;</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(systemPrompt);
                setCopied("prompt");
                setTimeout(() => setCopied(null), 2000);
              }}
              className="btn-ghost !text-xs"
            >
              {copied === "prompt" ? "✓ Tersalin" : "Copy"}
            </button>
          </div>
          <pre className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-700">
            {systemPrompt}
          </pre>
        </div>

        <div>
          <p className="font-semibold text-slate-900">
            Step 3 — Ganti <code className="rounded bg-slate-100 px-1">&lt;TOKEN&gt;</code> dengan token kamu di atas
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Find &amp; replace di Project knowledge. Kalau pakai multiple device, masing-masing token sendiri.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">Step 4 — Mulai chat pertama dengan pesan ini</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(startMessage);
                setCopied("start");
                setTimeout(() => setCopied(null), 2000);
              }}
              className="btn-ghost !text-xs"
            >
              {copied === "start" ? "✓ Tersalin" : "Copy"}
            </button>
          </div>
          <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap">
            {startMessage}
          </pre>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>💡 Tips pakai harian:</strong>
          <ul className="ml-4 mt-1 list-disc">
            <li><strong>Pagi (~07.00)</strong>: Buka chat → ketik &quot;morning briefing&quot;. Agent recap + bantu set prioritas.</li>
            <li><strong>Saat meeting / kerja</strong>: kasih agent MoM cepat → dia auto-simpan ke logs.</li>
            <li><strong>Malam (~21.00)</strong>: ketik &quot;evening debrief&quot;. Agent ajak jurnal + recap hari ini.</li>
            <li><strong>Minggu malam</strong>: ketik &quot;weekly review&quot;. Agent kasih full assessment + set intent minggu depan.</li>
            <li><strong>Kondisi hidup berubah</strong>: ketik &quot;ada perubahan fase&quot;. Agent bantu redefine phase.</li>
          </ul>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <strong>✅ Zero cost setup:</strong> Setup ini hanya pakai subscription Claude.ai kamu yang sudah ada.
          Tidak ada API fee dari Anthropic. Sama biayanya saat kamu pindah dari Max ke Pro nanti.
        </div>
      </div>
    </section>
  );
}
