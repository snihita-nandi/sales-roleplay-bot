"use client";

import { useMemo, useState } from "react";

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

export function ScenarioSelector({ catalog, onSelect }: ScenarioSelectorProps) {
  const [categoryId, setCategoryId] = useState(catalog.categories[0]?.id ?? "");
  const [difficultyId, setDifficultyId] = useState<DifficultyLevel>("medium");
  const category = useMemo(
    () => catalog.categories.find((item) => item.id === categoryId) ?? catalog.categories[0],
    [catalog.categories, categoryId],
  );
  const difficulty = useMemo(
    () => catalog.difficulties.find((item) => item.id === difficultyId) ?? catalog.difficulties[0],
    [catalog.difficulties, difficultyId],
  );

  if (!category || !difficulty) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
      <div className="max-w-3xl">
        <p className="eyebrow">Voice-first sales practice</p>
        <h1 className="mt-5 text-balance text-5xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-7xl">
          Practice the moments that decide the deal.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
          Choose a sales domain, customer type, and level of resistance. The customer stays the
          same; difficulty changes only how they behave.
        </p>
      </div>

      <div className="mt-14 border-b border-slate-200 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          1 · Practice category
        </p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {catalog.categories.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === category.id}
              onClick={() => setCategoryId(item.id)}
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
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{category.description}</p>
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              2 · Difficulty
            </p>
            <p className="mt-2 text-sm text-slate-500">Behavior changes; customer identity does not.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
        </div>
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{difficulty.label}:</span>{" "}
          {difficulty.description}
        </p>
      </div>

      <div className="mt-10 flex items-end justify-between gap-6 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            3 · Customer archetype
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">Choose who you want to practice with</p>
        </div>
        <p className="hidden text-sm text-slate-500 sm:block">
          {category.archetypes.length} in {category.name}
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {category.archetypes.map((archetype, index) => {
          const scenario = composePublicScenario(category, archetype, difficulty);
          return (
            <article
              key={archetype.id}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_55px_-38px_rgba(15,23,42,0.38)] transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_65px_-35px_rgba(15,23,42,0.48)] sm:p-9"
            >
              <div
                className={`absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full blur-2xl ${
                  index % 2 === 0 ? "bg-lime-200/70" : "bg-cyan-200/70"
                }`}
              />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                  <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">
                    {archetype.name}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                    {difficulty.label}
                  </span>
                  <span className="ml-auto text-slate-400">{archetype.expectedDurationMinutes} min</span>
                </div>
                <h2 className="mt-8 text-2xl font-semibold tracking-tight text-slate-950">
                  {archetype.practiceTitle}
                </h2>
                <p className="mt-3 min-h-20 text-[15px] leading-7 text-slate-600">
                  {archetype.summary}
                </p>
                <div className="mt-7 flex items-center gap-3 border-t border-slate-100 pt-6">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                    {archetype.customerName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {archetype.customerName}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {archetype.customerRole} · {archetype.customerContext}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(scenario)}
                  className="mt-7 flex w-full items-center justify-between rounded-full bg-lime-300 px-6 py-4 text-sm font-bold text-slate-950 transition hover:bg-lime-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                >
                  Open briefing
                  <span aria-hidden="true" className="text-lg transition group-hover:translate-x-1">
                    →
                  </span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

