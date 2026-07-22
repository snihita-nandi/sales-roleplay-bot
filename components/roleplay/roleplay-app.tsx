"use client";

import { useCallback, useState } from "react";

import { EvaluationResults } from "@/components/results/evaluation-results";
import { RoleplayCall } from "@/components/roleplay/roleplay-call";
import { ScenarioSelector } from "@/components/scenario/scenario-selector";
import {
  evaluationErrorResponseSchema,
  evaluationResponseSchema,
  type EvaluationResult,
} from "@/domain/evaluation/schema";
import { scenarioListResponseSchema } from "@/domain/roleplay/api";
import type { PracticeCatalog, PublicScenario } from "@/domain/scenarios/schema";
import type { CompletedRoleplay } from "@/hooks/use-roleplay-session";

type AppView = "scenarios" | "roleplay" | "results";

interface RoleplayAppProps {
  initialCatalog: PracticeCatalog;
}

export function RoleplayApp({ initialCatalog }: RoleplayAppProps) {
  const [view, setView] = useState<AppView>("scenarios");
  const [catalog] = useState<PracticeCatalog>(initialCatalog);
  const [selectedScenario, setSelectedScenario] = useState<PublicScenario | null>(null);
  const [completedRoleplay, setCompletedRoleplay] = useState<CompletedRoleplay | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  scenarioListResponseSchema.parse({ catalog });

  const runEvaluation = useCallback(
    async (scenario: PublicScenario, result: CompletedRoleplay) => {
      setEvaluationLoading(true);
      setEvaluationError(null);
      setEvaluation(null);
      try {
        const response = await fetch("/api/evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: scenario.id,
            transcript: result.transcript.map(({ role, text, timestampMs }) => ({
              role,
              text,
              timestampMs: Math.round(timestampMs),
            })),
            metrics: result.metrics,
            termination: result.termination,
          }),
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const apiError = evaluationErrorResponseSchema.safeParse(payload);
          throw new Error(
            apiError.success ? apiError.data.error : "The evaluator could not score this call.",
          );
        }
        setEvaluation(evaluationResponseSchema.parse(payload).evaluation);
      } catch (error: unknown) {
        setEvaluationError(
          error instanceof Error ? error.message : "The evaluator could not score this call.",
        );
      } finally {
        setEvaluationLoading(false);
      }
    },
    [],
  );

  const handleComplete = useCallback(
    (result: CompletedRoleplay) => {
      if (!selectedScenario) return;
      setCompletedRoleplay(result);
      setView("results");
      void runEvaluation(selectedScenario, result);
    },
    [runEvaluation, selectedScenario],
  );

  const restart = () => {
    setView("scenarios");
    setSelectedScenario(null);
    setCompletedRoleplay(null);
    setEvaluation(null);
    setEvaluationError(null);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-18 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <button type="button" onClick={restart} className="flex items-center gap-3" aria-label="Sales practice home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-lime-300">
              <span className="h-3 w-3 rounded-full border-[3px] border-current" />
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-950">Counterpart</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Gemini Live
          </div>
        </div>
      </header>

      {view === "scenarios" && (
        <ScenarioSelector
          catalog={catalog}
          onSelect={(scenario) => {
            setSelectedScenario(scenario);
            setView("roleplay");
          }}
        />
      )}

      {view === "roleplay" && selectedScenario && (
        <RoleplayCall scenario={selectedScenario} onBack={restart} onComplete={handleComplete} />
      )}

      {view === "results" && selectedScenario && (
        <EvaluationResults
          scenario={selectedScenario}
          evaluation={evaluation}
          loading={evaluationLoading}
          error={evaluationError}
          onRetry={() => {
            if (completedRoleplay) void runEvaluation(selectedScenario, completedRoleplay);
          }}
          onRestart={restart}
        />
      )}
    </div>
  );
}
