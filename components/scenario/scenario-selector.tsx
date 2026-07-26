"use client";

import { useMemo, useState } from "react";

import { FollowUpContextForm } from "@/components/scenario/follow-up-context-form";
import {
  createEmptyFollowUpContext,
  FOLLOW_UP_SCENARIO_ID,
} from "@/domain/scenarios/follow-up-context";
import { composePublicScenario } from "@/domain/scenarios/registry";
import type {
  DifficultyLevel,
  PracticeCatalog,
  PublicScenario,
} from "@/domain/scenarios/schema";

interface ScenarioSelectorProps {
  catalog: PracticeCatalog;
  onSelect(scenario: PublicScenario): void;
}

const optionClass = (selected: boolean) =>
  `rounded-2xl border p-4 text-left transition ${
    selected
      ? "border-slate-950 bg-slate-950 text-white"
      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
  }`;

export function ScenarioSelector({ catalog, onSelect }: ScenarioSelectorProps) {
  const firstCategory = catalog.categories[0];
  const [categoryId, setCategoryId] = useState(firstCategory?.id ?? "");
  const [archetypeId, setArchetypeId] = useState(firstCategory?.archetypes[0]?.id ?? "");
  const [profileScenarioId, setProfileScenarioId] = useState(
    firstCategory?.archetypes[0]?.scenarios[0]?.id ?? "",
  );
  const [difficultyId, setDifficultyId] = useState<DifficultyLevel>("medium");
  const [followUpContext, setFollowUpContext] = useState(
    createEmptyFollowUpContext,
  );

  const category = useMemo(
    () => catalog.categories.find((item) => item.id === categoryId) ?? firstCategory,
    [catalog.categories, categoryId, firstCategory],
  );
  const archetype = useMemo(
    () =>
      category?.archetypes.find((item) => item.id === archetypeId) ??
      category?.archetypes[0],
    [archetypeId, category],
  );
  const profileScenario = useMemo(
    () =>
      archetype?.scenarios.find((item) => item.id === profileScenarioId) ??
      archetype?.scenarios[0],
    [archetype, profileScenarioId],
  );
  const difficulty = useMemo(
    () => catalog.difficulties.find((item) => item.id === difficultyId) ?? catalog.difficulties[0],
    [catalog.difficulties, difficultyId],
  );

  if (!category || !archetype || !profileScenario || !difficulty) return null;

  const selectCategory = (nextCategoryId: string) => {
    const nextCategory = catalog.categories.find((item) => item.id === nextCategoryId);
    const nextArchetype = nextCategory?.archetypes[0];
    setCategoryId(nextCategoryId);
    setArchetypeId(nextArchetype?.id ?? "");
    setProfileScenarioId(nextArchetype?.scenarios[0]?.id ?? "");
    setFollowUpContext(createEmptyFollowUpContext());
  };

  const selectArchetype = (nextArchetypeId: string) => {
    const nextArchetype = category.archetypes.find((item) => item.id === nextArchetypeId);
    setArchetypeId(nextArchetypeId);
    setProfileScenarioId(nextArchetype?.scenarios[0]?.id ?? "");
    setFollowUpContext(createEmptyFollowUpContext());
  };

  const composedScenario = composePublicScenario(
    category,
    archetype,
    profileScenario,
    difficulty,
  );
  const selectedScenario =
    profileScenario.id === FOLLOW_UP_SCENARIO_ID
      ? { ...composedScenario, followUpContext }
      : composedScenario;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
      <div className="max-w-3xl">
        <p className="eyebrow">Voice-first sales practice</p>
        <h1 className="mt-5 text-balance text-5xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-7xl">
          Practice the moments that decide the deal.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
          Choose the market, the person, and why they are speaking with you today. Difficulty
          changes resistance—not the selected situation.
        </p>
      </div>

      <div className="mt-14 border-b border-slate-200 pb-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          1 · Category
        </p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {catalog.categories.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === category.id}
              onClick={() => selectCategory(item.id)}
              className={`shrink-0 rounded-full px-5 py-3 text-sm font-semibold transition ${
                item.id === category.id
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">{category.description}</p>
      </div>

      <div className="mt-9">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          2 · Customer profile
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {category.archetypes.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === archetype.id}
              onClick={() => selectArchetype(item.id)}
              className={optionClass(item.id === archetype.id)}
            >
              <span className="block text-sm font-bold">{item.name}</span>
              <span className={`mt-2 block text-xs leading-5 ${item.id === archetype.id ? "text-slate-300" : "text-slate-500"}`}>
                {item.customerContext}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 border-t border-slate-200 pt-9">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          3 · Sales scenario
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Why {archetype.customerName} is having this conversation today
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {archetype.scenarios.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === profileScenario.id}
              onClick={() => setProfileScenarioId(item.id)}
              className={optionClass(item.id === profileScenario.id)}
            >
              <span className="block text-sm font-bold">{item.name}</span>
              <span className={`mt-2 block text-xs font-semibold uppercase tracking-wider ${item.id === profileScenario.id ? "text-lime-300" : "text-slate-400"}`}>
                {item.buyingStage}
              </span>
              <span className={`mt-3 block text-sm leading-6 ${item.id === profileScenario.id ? "text-slate-300" : "text-slate-500"}`}>
                {item.summary}
              </span>
            </button>
          ))}
        </div>
      </div>

      {profileScenario.id === FOLLOW_UP_SCENARIO_ID ? (
        <FollowUpContextForm
          value={followUpContext}
          onChange={setFollowUpContext}
        />
      ) : null}

      <div className="mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          4 · Difficulty
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {catalog.difficulties.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === difficulty.id}
              title={item.description}
              onClick={() => setDifficultyId(item.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                item.id === difficulty.id
                  ? "bg-lime-300 text-slate-950"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{difficulty.label}:</span>{" "}
          {difficulty.description}
        </p>
      </div>

      <div className="mt-8 flex flex-col justify-between gap-5 rounded-[1.75rem] bg-slate-950 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-300">
            Selected practice
          </p>
          <p className="mt-2 text-lg font-semibold">
            {archetype.name} · {profileScenario.name} · {difficulty.label}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            {profileScenario.reasonForCall}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(selectedScenario)}
          className="shrink-0 rounded-full bg-lime-300 px-7 py-4 text-sm font-bold text-slate-950 transition hover:bg-lime-200"
        >
          Open briefing
        </button>
      </div>
    </section>
  );
}
