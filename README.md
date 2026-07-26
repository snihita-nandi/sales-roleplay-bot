# Counterpart

Counterpart is a browser-based AI sales roleplay app. Sales representatives practice live customer conversations with configurable scenarios and receive transcript-based feedback after each call.

- [Live application](https://sales-roleplay-bot-fawn.vercel.app/)
- [Demo video](https://youtu.be/z3SHN4h7Mi0)

## Workflow

```text
Choose industry, customer, scenario, and difficulty
                         ↓
             Start Gemini Live call
                         ↓
             Review live transcript
                         ↓
             Receive post-call evaluation
```

## Features

- 11 industries and 82 customer profiles
- Initial, comparison, and follow-up scenarios
- Four difficulty levels
- Real-time Gemini Live voice roleplay
- Live transcript, mute, interruptions, and call timer
- Customer-controlled and manual call endings
- Gemini or Groq post-call evaluation
- Scorecard, transcript evidence, and suggested improvements

Audio, transcripts, and evaluations are not stored.

## Tech Stack

Next.js 16, React 19, TypeScript, Tailwind CSS, Zod, Gemini Live, Groq, Vitest, and Playwright.

## Setup

Requirements: Node.js 20+, npm, a Gemini API key, and a browser with microphone access.

```bash
npm ci
```

Copy `.env.example` to `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
EVALUATION_PROVIDER=gemini
```

`GROQ_API_KEY` is required only when `EVALUATION_PROVIDER=groq`.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Application Parts

| Part | Location | Setup |
| --- | --- | --- |
| Frontend | `app/`, `components/`, `hooks/` | Runs with `npm run dev`; requires browser microphone permission |
| API routes | `app/api/` | Runs with Next.js; reads keys from `.env.local` |
| Voice | `infrastructure/gemini/` | Requires `GEMINI_API_KEY` |
| Evaluation | `infrastructure/evaluation/` | Uses Gemini by default or Groq when configured |
| Configuration | `config/`, `domain/scenarios/` | No additional environment variables |

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

## AI Tools and Keys

| Tool | Use | Key |
| --- | --- | --- |
| Gemini Live | Real-time customer roleplay | `GEMINI_API_KEY` |
| Gemini | Default call evaluation | `GEMINI_API_KEY` |
| Groq | Optional call evaluation | `GROQ_API_KEY` |
| Codex | Documentation assistance | No runtime key |

Keys remain server-side and must not be committed.

## License

MIT License
