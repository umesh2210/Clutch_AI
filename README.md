# ClutchAI

ClutchAI is an agentic productivity coach for Vibe2Ship Problem Statement 1:
**The Last-Minute Life Saver**.

It replaces passive deadline reminders with a live model of the user's actual
capacity. ClutchAI calculates usable hours, predicts deadline risk, simulates
choices, and generates a minimum-viable rescue plan when a commitment is in
danger.

## Why it is different

- **Effective-hours engine:** separates calendar time from genuinely usable time.
- **Success probability:** updates risk from remaining work, progress, and capacity.
- **Future simulator:** shows the likely outcome of starting, shrinking, or delaying.
- **Agentic rescue plans:** converts a risky task into a short executable sequence.
- **AI negotiation:** turns “I am too tired” into a guilt-free tiny start.
- **Life map:** schedules around college, work, sleep, trips, and peak-focus windows.
- **Behavior design:** XP, streaks, shields, and celebrations reward follow-through.
- **Reliable demo mode:** core flows work offline; Gemini enhances coaching when configured.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:4173`.

## Gemini / Google AI Studio

The live coach uses Google's `@google/genai` SDK with `gemini-2.5-flash`.

1. Copy `.env.example` to `.env`.
2. Add a Google AI Studio key as `VITE_GEMINI_API_KEY`.
3. Restart the development server.

For a production deployment, route Gemini calls through a server-side endpoint
or Google AI Studio's managed deployment environment so the API key is not
shipped to browsers.

## Quality checks

```bash
npm test
npm run build
```

The test suite covers probability bounds, decreasing effort after task
completion, executable rescue-plan generation, deadline boundaries, and
collision avoidance with fixed calendar commitments.

## Stack

React, Vite, Google Gen AI SDK, Gemini 2.5 Flash, date-fns, Lucide, Vitest, and
localStorage.

