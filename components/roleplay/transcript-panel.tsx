"use client";

import { useEffect, useRef } from "react";

import type { TranscriptEntry } from "@/domain/roleplay/types";

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  customerName: string;
}

export function TranscriptPanel({ entries, customerName }: TranscriptPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const newestText = entries.at(-1)?.text;

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [entries.length, newestText]);

  return (
    <div className="rounded-2xl bg-slate-50 px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Live transcript
      </p>
      <div
        ref={scrollContainerRef}
        className="mt-3 max-h-48 min-h-20 space-y-3 overflow-y-auto overscroll-contain pr-2 sm:max-h-56"
        aria-live="polite"
        aria-label="Live conversation transcript"
      >
        {entries.length > 0 ? (
          entries.map((entry) => (
            <p key={entry.id} className="text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-900">
                {entry.role === "customer" ? customerName : "You"}:
              </span>{" "}
              <span className="whitespace-pre-wrap break-words">{entry.text}</span>
            </p>
          ))
        ) : (
          <p className="text-sm text-slate-400">The conversation will appear here.</p>
        )}
      </div>
    </div>
  );
}

