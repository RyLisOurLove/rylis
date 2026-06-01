"use client";

import { useEffect, useState } from "react";

export default function VisionCarousel({
  imageIds, title,
}: {
  imageIds: string[]; title: string;
}) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || imageIds.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % imageIds.length), 5000);
    return () => clearInterval(id);
  }, [auto, imageIds.length]);

  if (imageIds.length === 0) return null;

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
      {imageIds.map((id, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={id}
          src={`https://drive.google.com/thumbnail?id=${id}&sz=w1600`}
          alt={`${title} — ${idx + 1}`}
          loading={idx === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            idx === i ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* gradient overlay for title legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="absolute inset-x-0 bottom-3 flex items-center justify-between px-4">
        <p className="text-sm font-semibold text-white drop-shadow">
          {i + 1} / {imageIds.length}
        </p>
        <button
          onClick={() => setAuto((a) => !a)}
          className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-white/30"
        >
          {auto ? "⏸ pause" : "▶ play"}
        </button>
      </div>

      {imageIds.length > 1 && (
        <>
          <button
            onClick={() => setI((x) => (x - 1 + imageIds.length) % imageIds.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30"
            aria-label="Sebelumnya"
          >
            ‹
          </button>
          <button
            onClick={() => setI((x) => (x + 1) % imageIds.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30"
            aria-label="Berikutnya"
          >
            ›
          </button>

          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1">
            {imageIds.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
