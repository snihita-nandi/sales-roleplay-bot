# Counterpart

Counterpart is a browser-based AI sales roleplay application. A representative speaks with a configurable Gemini Live prospect that asks realistic questions, raises objections, reveals information gradually, and remains in character. Coaching is generated only after the live customer session has closed.

## Architecture

- `domain/` contains provider-independent category, archetype, difficulty, prompt, roleplay-state, and evaluation contracts.
- `config/` contains practice categories, reusable customer archetypes, shared difficulty profiles, and rubrics. New domains and customers are added as validated configuration, not branching UI or prompt logic.
- `infrastructure/gemini/` owns Gemini token provisioning and browser live audio.
- `infrastructure/evaluation/` owns provider selection plus the Groq and Gemini post-call evaluators.
- `app/api/` exposes public scenario summaries, single-use constrained session credentials, and isolated evaluation.
- `components/` renders the scenario, call, and result experiences without owning customer behavior.

Gemini Live uses a direct browser-to-Gemini WebSocket authenticated with a short-lived token minted by the server. The permanent `GEMINI_API_KEY` and private customer configuration never enter the browser bundle.

## Scenario hierarchy

Scenario selection has three configuration-driven levels:

1. A practice category such as B2B Sales, Insurance, Retail, or Real Estate.
2. A reusable customer archetype owned by that category.
3. Easy, Medium, Hard, or Expert difficulty.

An archetype owns the stable customer identity, context, motivations, facts, objections, and speaking style. Difficulty is a shared overlay that may modify only skepticism, patience, objection frequency, trust progression, and interruption tendency. The registry composes these inputs into the same `CustomerScenario` contract used by the prompt compiler and Gemini integration.

Additional categories—including Banking, Healthcare, Automotive, Telecommunications, Technology, and Custom—can be added by supplying another category configuration with at least two archetypes. No category-specific behavior code is required.

## Local development

Use Node.js 20 or newer and define these server-only environment variables:

```text
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
EVALUATION_PROVIDER=groq
```

`EVALUATION_PROVIDER` accepts `groq` or `gemini` and defaults to `gemini` when unset.

Then run:

```bash
npm run dev
```

The app is available at `http://localhost:3000`.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The end-to-end command requires Playwright's Chromium browser to be available in the environment.

## Current MVP boundaries

- Audio is streamed but not stored.
- Completed transcript text is sent to the evaluation endpoint and is not persisted.
- Calls are limited to the configured three-to-eight minute scenario duration.
- Authentication, distributed rate limiting, durable call history, and long-session resumption are intentionally out of scope.
