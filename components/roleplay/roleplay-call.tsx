"use client";

import type { PublicScenario } from "@/domain/scenarios/schema";
import type { CompletedRoleplay } from "@/hooks/use-roleplay-session";
import { useRoleplaySession } from "@/hooks/use-roleplay-session";
import { TranscriptPanel } from "@/components/roleplay/transcript-panel";

interface RoleplayCallProps {
  scenario: PublicScenario;
  onBack(): void;
  onComplete(result: CompletedRoleplay): void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const phaseCopy = {
  idle: "Ready when you are",
  "requesting-permission": "Waiting for microphone",
  connecting: "Connecting securely",
  active: "Live conversation",
  ending: "Closing the call",
  completed: "Call complete",
  error: "Connection issue",
} as const;

export function RoleplayCall({ scenario, onBack, onComplete }: RoleplayCallProps) {
  const { state, start, end, toggleMute, reset } = useRoleplaySession(
    scenario,
    onComplete,
  );

  const isCallStarted = state.phase !== "idle" && state.phase !== "error";
  const isActive = state.phase === "active";

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-7 px-5 py-8 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:py-12">
      <aside className="rounded-[2rem] bg-slate-950 p-7 text-white sm:p-9">
        <button
          type="button"
          onClick={onBack}
          disabled={isCallStarted}
          className="text-sm font-semibold text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          ← Back to scenarios
        </button>
        <p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-lime-300">Your briefing</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {scenario.categoryName} · {scenario.archetypeName} · {scenario.profileScenarioName} ·{" "}
          {scenario.difficultyLabel}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{scenario.title}</h1>
        <p className="mt-4 text-[15px] leading-7 text-slate-300">{scenario.summary}</p>

        <dl className="mt-10 space-y-6 border-t border-white/10 pt-8">
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Your role</dt>
            <dd className="mt-2 text-sm leading-6 text-slate-200">{scenario.representativeRole}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Objective</dt>
            <dd className="mt-2 text-sm leading-6 text-slate-200">{scenario.objective}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Why today</dt>
            <dd className="mt-2 text-sm leading-6 text-slate-200">{scenario.reasonForCall}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Prospect</dt>
            <dd className="mt-2 text-sm leading-6 text-slate-200">
              {scenario.customerName} · {scenario.customerRole}
            </dd>
          </div>
        </dl>
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-400">
          The prospect&apos;s private motivations and objections stay hidden. Ask good questions to
          uncover them.
        </div>
      </aside>

      <section className="relative flex min-h-[620px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)] sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isActive ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`}
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">{phaseCopy[state.phase]}</p>
              <p className="mt-0.5 text-xs text-slate-500">Audio is not stored by this MVP</p>
            </div>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 font-mono text-sm font-semibold tabular-nums text-slate-700">
            {formatTime(state.remainingSeconds)}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className={`voice-orb ${isActive ? "voice-orb-active" : ""}`} aria-hidden="true">
            <div className="voice-orb-core">
              <span>{scenario.customerName.split(" ").map((part) => part[0]).join("")}</span>
            </div>
          </div>
          <h2 className="mt-9 text-2xl font-semibold tracking-tight text-slate-950">
            {scenario.customerName}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {scenario.customerRole} · {scenario.customerContext}
          </p>

          {state.phase === "idle" && (
            <div className="mt-9 max-w-md">
              <p className="text-sm leading-6 text-slate-600">
                Use headphones for the clearest interruption handling. You will be asked for
                microphone access.
              </p>
              <button type="button" onClick={() => void start()} className="primary-action mt-6">
                Start voice roleplay
              </button>
            </div>
          )}

          {(state.phase === "requesting-permission" || state.phase === "connecting") && (
            <div className="mt-9 flex items-center gap-3 text-sm font-medium text-slate-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
              {state.phase === "requesting-permission"
                ? "Allow microphone access to continue"
                : "Introducing you to the prospect"}
            </div>
          )}

          {state.phase === "error" && (
            <div className="mt-9 max-w-md rounded-2xl bg-rose-50 p-5 text-sm leading-6 text-rose-800">
              <p>{state.error}</p>
              <button
                type="button"
                onClick={() => {
                  reset();
                  void start();
                }}
                className="mt-4 font-bold underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        <TranscriptPanel entries={state.transcript} customerName={scenario.customerName} />

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            disabled={!isActive}
            aria-pressed={state.muted}
            className="call-control"
          >
            {state.muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" onClick={end} disabled={!isActive} className="call-control call-control-end">
            End call
          </button>
        </div>
      </section>
    </main>
  );
}
