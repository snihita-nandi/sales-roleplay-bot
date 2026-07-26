"use client";

import { useEffect, useRef, useState } from "react";

import type {
  EvaluationEvidence,
  EvaluationFeedbackItem,
  EvaluationResult,
} from "@/domain/evaluation/schema";
import type { TranscriptEntry } from "@/domain/roleplay/types";
import type { PublicScenario } from "@/domain/scenarios/schema";

interface EvaluationResultsProps {
  scenario: PublicScenario;
  evaluation: EvaluationResult | null;
  transcript: readonly TranscriptEntry[];
  loading: boolean;
  error: string | null;
  onRetry(): void;
  onRestart(): void;
}

const scoreDimensions = [
  { key: "discovery", label: "Discovery" },
  { key: "objectionHandling", label: "Objection Handling" },
  { key: "listening", label: "Listening" },
  { key: "communication", label: "Communication" },
  { key: "closing", label: "Closing" },
] as const;

const endedByLabels = {
  customer: "Customer",
  representative: "Sales representative",
  system: "Time limit or connection",
} as const;

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function EvaluationResults({
  scenario,
  evaluation,
  transcript,
  loading,
  error,
  onRetry,
  onRestart,
}: EvaluationResultsProps) {
  const [highlightedTranscriptIndex, setHighlightedTranscriptIndex] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    },
    [],
  );

  const jumpToTranscript = (transcriptIndex: number) => {
    document
      .getElementById(`results-transcript-${transcriptIndex}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedTranscriptIndex(transcriptIndex);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(
      () => setHighlightedTranscriptIndex(null),
      1_800,
    );
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Post-call evaluation</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">
            {scenario.title}
          </h1>
          <p className="mt-3 text-slate-500">
            Your prospect session is closed. Coaching starts here.
          </p>
        </div>
        <button type="button" onClick={onRestart} className="secondary-action">
          Choose another scenario
        </button>
      </div>

      {loading && (
        <div className="grid min-h-96 place-items-center">
          <div className="text-center">
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
            <p className="mt-5 text-sm font-semibold text-slate-700">
              Reviewing the conversation
            </p>
            <p className="mt-1 text-sm text-slate-400">This may take a few seconds.</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="mt-10 rounded-[2rem] border border-rose-200 bg-rose-50 p-8">
          <h2 className="text-xl font-semibold text-rose-950">Evaluation unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-rose-800">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 font-bold text-rose-950 underline underline-offset-4"
          >
            Retry evaluation
          </button>
        </div>
      )}

      {evaluation && !loading && (
        <div className="mt-10 grid gap-7 lg:grid-cols-[0.72fr_1.28fr]">
          <section className="rounded-[2rem] bg-slate-950 p-8 text-white sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-300">
              Overall score
            </p>
            <p className="mt-5 text-8xl font-semibold tracking-[-0.07em]">
              {evaluation.overallScore}
              <span className="ml-2 text-2xl text-slate-500">/100</span>
            </p>
            <p className="mt-7 text-[15px] leading-7 text-slate-300">{evaluation.summary}</p>
          </section>

          <div className="space-y-7">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-9">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">Call Summary</h2>
              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Ended by</dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-800">
                    {endedByLabels[evaluation.callSummary.endedBy]}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Call duration</dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-800">
                    {formatDuration(evaluation.callSummary.durationSeconds)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Why it ended</dt>
                  <dd className="mt-2 text-sm leading-6 text-slate-600">
                    {evaluation.callSummary.endReason}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Conversation turns</dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-800">
                    {evaluation.callSummary.conversationTurns}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[2rem] border border-cyan-200 bg-cyan-50 p-7 text-cyan-950 sm:p-9">
              <h2 className="text-xl font-semibold tracking-tight">
                How the call could have continued
              </h2>
              <p className="mt-3 text-sm leading-6">{evaluation.continuationAdvice}</p>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-9">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">Scorecard</h2>
              <div className="mt-7 space-y-7">
                {scoreDimensions.map(({ key, label }) => {
                  const dimension = evaluation[key];
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold text-slate-800">{label}</span>
                        <span className="font-mono text-slate-500">{dimension.score}/20</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-lime-400"
                          style={{ width: `${dimension.score * 5}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {dimension.feedback}
                      </p>
                      <EvidenceList evidence={dimension.evidence} onJump={jumpToTranscript} />
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-7 xl:grid-cols-3">
              <FeedbackList
                title="Strength"
                kind="strength"
                items={evaluation.strengths}
                className="border-emerald-200 bg-emerald-50 text-emerald-950"
                onJump={jumpToTranscript}
              />
              <FeedbackList
                title="Missed Opportunity"
                kind="improvement"
                items={evaluation.missedOpportunities}
                className="border-amber-200 bg-amber-50 text-amber-950"
                onJump={jumpToTranscript}
              />
              <FeedbackList
                title="Improvement"
                kind="improvement"
                items={evaluation.recommendedImprovements}
                className="border-cyan-200 bg-cyan-50 text-cyan-950"
                onJump={jumpToTranscript}
              />
            </div>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-9">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Conversation transcript
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Evidence links point to the exact messages reviewed by your coach.
              </p>
              <ol className="mt-6 space-y-3">
                {transcript.map((entry, index) => (
                  <li
                    id={`results-transcript-${index}`}
                    key={entry.id}
                    className={`scroll-m-24 rounded-2xl border px-5 py-4 transition-colors duration-700 ${
                      highlightedTranscriptIndex === index
                        ? "border-lime-400 bg-lime-100"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      {index} · {entry.role === "representative" ? "You" : scenario.customerName}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                      {entry.text}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}

interface FeedbackListProps {
  title: string;
  kind: "strength" | "improvement";
  items: EvaluationFeedbackItem[];
  className: string;
  onJump(transcriptIndex: number): void;
}

function FeedbackList({ title, kind, items, className, onJump }: FeedbackListProps) {
  return (
    <section className={`rounded-[2rem] border p-7 ${className}`}>
      <h2 className="font-semibold">
        {kind === "strength" ? "✓" : "⚠"} {title}
      </h2>
      <div className="mt-5 space-y-6">
        {items.length === 0 ? (
          <p className="text-sm leading-6">No transcript-grounded strengths were identified.</p>
        ) : (
          items.map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className="border-t border-current/15 pt-5 first:border-0 first:pt-0"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{item.title}</h3>
                {item.score !== undefined && (
                  <span className="shrink-0 font-mono text-xs">{item.score}/20</span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6">{item.feedback}</p>
              <EvidenceList evidence={item.evidence} onJump={onJump} />
              {item.betterResponse && (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-60">
                    Suggested response
                  </p>
                  <blockquote className="mt-2 border-l-2 border-current/30 pl-4 text-sm italic leading-6">
                    “{item.betterResponse}”
                  </blockquote>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

interface EvidenceListProps {
  evidence: EvaluationEvidence[];
  onJump(transcriptIndex: number): void;
}

function EvidenceList({ evidence, onJump }: EvidenceListProps) {
  if (evidence.length === 0) return null;

  return (
    <div className="mt-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-60">Evidence</p>
      <div className="mt-3 space-y-3">
        {evidence.map((item, index) => (
          <div
            key={`${item.transcriptIndex}-${index}`}
            className="rounded-xl border border-current/15 bg-white/60 p-4"
          >
            <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-60">
              {item.speaker === "user" ? "📍 You" : "📍 Customer"}
            </p>
            <blockquote className="mt-2 text-sm font-medium leading-6">
              “{item.shortQuote}”
            </blockquote>
            <p className="mt-2 text-xs leading-5 opacity-75">{item.explanation}</p>
            <button
              type="button"
              onClick={() => onJump(item.transcriptIndex)}
              className="mt-3 text-xs font-bold underline underline-offset-4"
            >
              Jump to transcript
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
