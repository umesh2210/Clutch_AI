# ClutchAI Codebase Context

This file contains the complete source code of ClutchAI. You can upload this directly to Google AI Studio to chat with Gemini about your codebase.

## File: `package.json`

```json
{
  "name": "clutchai",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run"
  },
  "dependencies": {
    "@capacitor/android": "^8.4.1",
    "@capacitor/cli": "^8.4.1",
    "@capacitor/core": "^8.4.1",
    "@capacitor/local-notifications": "^8.2.0",
    "@google/genai": "^1.8.0",
    "date-fns": "^4.4.0",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "~5.6.3",
    "vite": "^6.0.1",
    "vitest": "^2.1.8"
  }
}

```

---

## File: `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { sourcemap: true }
});

```

---

## File: `tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" }
  ]
}

```

---

## File: `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0a0b" />
    <meta name="description" content="ClutchAI - the agentic productivity coach that turns impossible deadlines into executable rescue plans." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
    <title>ClutchAI - Never miss what matters</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

---

## File: `README.md`

```md
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


```

---

## File: `src/types.ts`

```typescript
export type Persona = "student" | "professional" | "entrepreneur";
export type Energy = "low" | "medium" | "high";
export type TaskStatus = "active" | "completed";

export interface UserProfile {
  name: string;
  persona: Persona;
  wakeTime: string;
  sleepTime: string;
  focusPreference: "morning" | "afternoon" | "night";
  reliability: number;
  xp: number;
  streak: number;
  onboardingComplete: boolean;
  weeklyHolidays: number[];        // 0=Sun, 1=Mon, ... 6=Sat
  holidayMode: "rest" | "free";    // rest = no tasks scheduled, free = extra time
  productivityPeak: "morning" | "afternoon" | "night"; // auto-detected or manual
  smartNotificationsEnabled?: boolean;
}

export type RoutineCategory = "work" | "school" | "gym" | "tuition" | "sports" | "commute" | "other";

export interface RoutineBlock {
  id: string;
  title: string;
  startTime: string;      // "HH:mm" format
  endTime: string;         // "HH:mm" format
  daysOfWeek: number[];    // 0=Sun, 1=Mon, ... 6=Sat
  category: RoutineCategory;
  isFixed: boolean;
  energy: Energy;
}

export type CalendarEventType = "trip" | "vacation" | "exam" | "festival" | "family" | "holiday" | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;       // ISO date string
  endDate: string;         // ISO date string
  type: CalendarEventType;
  isFullDay: boolean;
  startTime?: string;      // "HH:mm" if not full day
  endTime?: string;        // "HH:mm" if not full day
  blocksProductivity: boolean;
}

export interface AvailabilityBlock {
  id: string;
  title: string;
  start: string;
  end: string;
  source: "routine" | "calendar" | "manual" | "trip";
  flexibility: "fixed" | "flexible";
  energy: Energy;
}

export interface Subtask {
  id: string;
  title: string;
  minutes: number;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  deadline: string;
  estimatedMinutes: number;
  consequence: string;
  priority: "normal" | "important" | "critical";
  status: TaskStatus;
  createdAt: string;
  subtasks: Subtask[];
}

export interface RiskAssessment {
  usableMinutes: number;
  requiredMinutes: number;
  confidenceScore: number;
  riskLevel: "on-track" | "at-risk" | "critical";
  riskFactors: string[];
  explanation: string;
  effectiveProductiveDays: number;
  calendarDaysRemaining: number;
}

export interface ScheduledBlock {
  id: string;
  taskId: string;
  taskTitle: string;
  subtaskTitle: string;
  start: string;
  end: string;
  minutes: number;
  difficulty: "easy" | "medium" | "hard";
  status: "planned" | "completed" | "missed";
}

export interface PlanBlock {
  id: string;
  title: string;
  start: string;
  end: string;
  minutes: number;
  status: "planned" | "completed" | "missed";
}

export interface RescuePlan {
  id: string;
  taskId: string;
  blocks: PlanBlock[];
  scopeDecisions: string[];
  assumptions: string[];
  approvalStatus: "draft" | "approved";
}

export interface StreakDay {
  date: string;
  completed: number;
  planned: number;
  status: "success" | "missed" | "rest";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  draftTask?: {
    title?: string;
    deadline?: string;
    estimatedMinutes?: number;
    priority?: "normal" | "important" | "critical";
    projectType?: string;
    dependencies?: string;
    resources?: string;
    teamMembers?: string;
    stage?: "title" | "deadline" | "effort" | "type" | "confirm";
  };
}

export interface FreeWindow {
  start: Date;
  end: Date;
  minutes: number;
  peakAlignment: "peak" | "moderate" | "low";
}

export interface AppState {
  profile: UserProfile;
  tasks: Task[];
  busyBlocks: AvailabilityBlock[];
  routineBlocks: RoutineBlock[];
  calendarEvents: CalendarEvent[];
  plans: RescuePlan[];
  streakHistory: StreakDay[];
  chatSessions: ChatSession[];
}

```

---

## File: `src/storage.ts`

```typescript
import type { AppState } from "./types";
import { initialState } from "./seed";

const KEY = "clutchai-state-v2";
const OLD_KEY = "clutchai-state-v1";

export function loadState(): AppState {
  try {
    let stored = localStorage.getItem(KEY);
    let migrating = false;
    if (!stored) {
      stored = localStorage.getItem(OLD_KEY);
      migrating = true;
    }
    if (!stored) return initialState();
    const parsed = JSON.parse(stored);
    const defaults = initialState();
    
    const profile = {
      ...defaults.profile,
      ...(parsed.profile || {}),
    };
    if (profile.weeklyHolidays === undefined) profile.weeklyHolidays = [0];
    if (profile.holidayMode === undefined) profile.holidayMode = "rest";
    if (profile.productivityPeak === undefined) profile.productivityPeak = profile.focusPreference || "morning";

    const routineBlocks = parsed.routineBlocks ?? [];
    const calendarEvents = parsed.calendarEvents ?? [];

    const state: AppState = {
      ...defaults,
      ...parsed,
      profile,
      routineBlocks,
      calendarEvents,
      streakHistory: (parsed.streakHistory ?? defaults.streakHistory).map((day: any) => ({
        ...day,
        completed: Math.max(0, day.completed),
      })),
      chatSessions: parsed.chatSessions ?? defaults.chatSessions,
    };

    if (migrating) {
      saveState(state);
      try {
        localStorage.removeItem(OLD_KEY);
      } catch (e) {
        console.warn("Could not remove old state key", e);
      }
    }
    return state;
  } catch {
    return initialState();
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

```

---

## File: `src/engine.ts`

```typescript
import {
  addMinutes,
  differenceInCalendarDays,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameDay,
  max,
  min,
  parse,
  set,
  startOfDay,
} from "date-fns";
import type {
  AvailabilityBlock,
  PlanBlock,
  RescuePlan,
  RiskAssessment,
  Task,
  UserProfile,
  RoutineBlock,
  CalendarEvent,
  FreeWindow,
  ScheduledBlock,
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

function timeOnDay(day: Date, value: string) {
  const parsed = parse(value, "HH:mm", day);
  return set(day, { hours: parsed.getHours(), minutes: parsed.getMinutes(), seconds: 0, milliseconds: 0 });
}

function overlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const start = max([aStart, bStart]);
  const end = min([aEnd, bEnd]);
  return Math.max(0, differenceInMinutes(end, start));
}

export function usableMinutesBefore(
  task: Task,
  profile: UserProfile,
  busyBlocks: AvailabilityBlock[],
  now = new Date(),
) {
  const deadline = new Date(task.deadline);
  if (!isAfter(deadline, now)) return 0;

  return eachDayOfInterval({ start: startOfDay(now), end: startOfDay(deadline) }).reduce(
    (total, day) => {
      let focusStart = timeOnDay(day, profile.focusPreference === "morning" ? "06:30" : profile.focusPreference === "afternoon" ? "13:00" : "18:00");
      let focusEnd = timeOnDay(day, profile.focusPreference === "morning" ? "11:30" : profile.focusPreference === "afternoon" ? "18:00" : "23:00");

      focusStart = max([focusStart, now]);
      focusEnd = min([focusEnd, deadline, endOfDay(day)]);
      if (!isAfter(focusEnd, focusStart)) return total;

      const blocked = busyBlocks.reduce((sum, block) => {
        const blockStart = new Date(block.start);
        const blockEnd = new Date(block.end);
        return sum + overlapMinutes(focusStart, focusEnd, blockStart, blockEnd);
      }, 0);

      return total + Math.max(0, differenceInMinutes(focusEnd, focusStart) - blocked);
    },
    0,
  );
}

export function assessTask(
  task: Task,
  profile: UserProfile,
  busyBlocks: AvailabilityBlock[],
  now = new Date(),
  calendarEvents: CalendarEvent[] = [],
): RiskAssessment {
  const usableMinutes = usableMinutesBefore(task, profile, busyBlocks, now);
  const completedMinutes = task.subtasks
    .filter((item) => item.completed)
    .reduce((total, item) => total + item.minutes, 0);
  const requiredMinutes = Math.max(0, task.estimatedMinutes - completedMinutes);
  const capacityRatio = requiredMinutes === 0 ? 1 : Math.min(1, usableMinutes / requiredMinutes);
  const deadline = new Date(task.deadline);
  const calendarDaysRemaining = Math.max(0, differenceInCalendarDays(deadline, now));
  const epDays = getEffectiveProductiveDays(deadline, calendarEvents, profile, now);
  const effectiveProductiveDays = epDays.days;
  const bufferScore = Math.min(1, effectiveProductiveDays / 5);
  const reliabilityScore = Math.min(1, Math.max(0.2, profile.reliability / 100));
  const confidenceScore = Math.round(
    Math.min(96, Math.max(4, capacityRatio * 65 + bufferScore * 15 + reliabilityScore * 20)),
  );
  const riskLevel = confidenceScore < 35 ? "critical" : confidenceScore < 70 ? "at-risk" : "on-track";
  const riskFactors: string[] = [];

  if (usableMinutes < requiredMinutes) {
    riskFactors.push(`${formatHours(requiredMinutes - usableMinutes)} more work than your available focus time`);
  }
  if (effectiveProductiveDays <= 1) riskFactors.push("Less than 24 hours of productive deadline buffer");
  if (profile.reliability < 65) riskFactors.push("Recent plans have needed extra recovery time");
  if (!riskFactors.length) riskFactors.push("Your plan has enough capacity and a healthy buffer");

  return {
    usableMinutes,
    requiredMinutes,
    confidenceScore,
    riskLevel,
    riskFactors,
    explanation: `This planning heuristic weighs available focus time, remaining effort, deadline buffer, and your recent follow-through.`,
    effectiveProductiveDays,
    calendarDaysRemaining,
  };
}

function freeWindows(
  deadline: Date,
  profile: UserProfile,
  busyBlocks: AvailabilityBlock[],
  now: Date,
) {
  const windows: { start: Date; end: Date }[] = [];
  for (const day of eachDayOfInterval({ start: startOfDay(now), end: startOfDay(deadline) })) {
    let cursor = timeOnDay(day, profile.focusPreference === "morning" ? "06:30" : profile.focusPreference === "afternoon" ? "13:00" : "18:00");
    const end = min([
      timeOnDay(day, profile.focusPreference === "morning" ? "11:30" : profile.focusPreference === "afternoon" ? "18:00" : "23:00"),
      deadline,
    ]);
    cursor = max([cursor, now]);
    const dayBlocks = busyBlocks
      .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
      .filter((b) => isBefore(b.start, end) && isAfter(b.end, cursor))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const block of dayBlocks) {
      if (differenceInMinutes(block.start, cursor) >= 5) windows.push({ start: cursor, end: block.start });
      cursor = max([cursor, block.end]);
    }
    if (differenceInMinutes(end, cursor) >= 5) windows.push({ start: cursor, end });
  }
  return windows;
}

export function generateRescuePlan(
  task: Task,
  profile: UserProfile,
  busyBlocks: AvailabilityBlock[],
  now = new Date(),
): RescuePlan {
  const pending = task.subtasks.filter((item) => !item.completed);
  const items = pending.length
    ? pending.map((item) => ({ title: item.title, remaining: item.minutes }))
    : [{ title: task.title, remaining: task.estimatedMinutes }];
  const windows = freeWindows(new Date(task.deadline), profile, busyBlocks, now);
  const blocks: PlanBlock[] = [];
  let itemIndex = 0;

  for (const window of windows) {
    let cursor = window.start;
    while (itemIndex < items.length && differenceInMinutes(window.end, cursor) >= 5) {
      const item = items[itemIndex];
      const blockMinutes = Math.min(90, item.remaining, differenceInMinutes(window.end, cursor));
      if (blockMinutes < 5) break;
      const end = addMinutes(cursor, blockMinutes);
      blocks.push({
        id: uid(),
        title: item.title,
        start: cursor.toISOString(),
        end: end.toISOString(),
        minutes: blockMinutes,
        status: "planned",
      });
      item.remaining -= blockMinutes;
      if (item.remaining <= 0) itemIndex++;
      cursor = addMinutes(end, blockMinutes >= 45 ? 15 : 5);
    }
    if (itemIndex >= items.length) break;
  }

  const scheduled = blocks.reduce((sum, block) => sum + block.minutes, 0);
  const remaining = items.reduce((sum, item) => sum + Math.max(0, item.remaining), 0);
  return {
    id: uid(),
    taskId: task.id,
    blocks,
    scopeDecisions:
      task.estimatedMinutes <= 30
        ? ["Finish this in one sitting", "No project breakdown or extra polish needed"]
        : remaining > 0
        ? [
            `Recover ${formatHours(scheduled)} with focused blocks`,
            `Reduce or defer ${formatHours(remaining)} of non-essential scope`,
            "Submit a complete core before optional polish",
          ]
        : ["Protect the core deliverable first", "Keep the final block as review and submission buffer"],
    assumptions: ["15-minute recovery breaks are protected", "No block overlaps a fixed commitment"],
    approvalStatus: "draft",
  };
}

export function simulateOptions(assessment: RiskAssessment) {
  const base = assessment.confidenceScore;
  return [
    { label: "Start tonight", detail: "One focused 90-minute block", score: Math.min(96, base + 24), tone: "good" },
    { label: "Reduce scope", detail: "Ship the core, defer polish", score: Math.min(92, base + 17), tone: "good" },
    { label: "Skip today", detail: "Lose your best focus window", score: Math.max(4, base - 22), tone: "bad" },
  ] as const;
}

export function parseNaturalTask(input: string, now = new Date()) {
  const lower = input.toLowerCase();
  const hoursMatch = lower.match(/(\d+(?:\.\d+)?)\s*hours?/);
  const minutesMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/);
  const quickAction = /(pay|bill|recharge|call|email|send|book|order|confirm|reply|upload)/.test(lower);
  const estimatedMinutes = hoursMatch
    ? Number(hoursMatch[1]) * 60
    : minutesMatch
      ? Number(minutesMatch[1])
      : quickAction ? 10 : 60;
  let days = 4;
  if (lower.includes("tomorrow")) days = 1;
  if (lower.includes("tonight") || lower.includes("today")) days = 0;
  if (lower.includes("sunday")) {
    const current = now.getDay();
    days = (7 - current) % 7 || 7;
  }
  const deadline = set(addMinutes(startOfDay(now), days * 1440), { hours: 23, minutes: 59 });
  const title = input
    .replace(/i (have|need to|must)\s+/i, "")
    .replace(/\s+(due|by)\s+.+$/i, "")
    .replace(/\s+and it (takes|will take)\s+.+$/i, "")
    .replace(/\s+(today|tonight|tomorrow|this (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi, "")
    .trim();
  return {
    title: title ? title[0].toUpperCase() + title.slice(1) : "Important task",
    deadline,
    estimatedMinutes,
  };
}

export function understandTask(title: string, estimatedMinutes: number) {
  const lower = title.toLowerCase();
  const oneSitting = estimatedMinutes <= 30;

  if (/(call|email|reply|send|confirm|book|order|upload|submit form)/.test(lower) && oneSitting) {
    return {
      kind: "quick-action",
      oneSitting: true,
      summary: "A single-action task with no need for a multi-stage project plan.",
      steps: [{ title: title[0].toUpperCase() + title.slice(1).trim(), minutes: Math.max(5, estimatedMinutes) }],
    };
  }
  if (oneSitting) {
    let actionTitle = title;
    if (/(electricity|current|water|phone|internet|credit card|bill|recharge)/.test(lower) && !lower.includes("pay")) {
      actionTitle = `Pay ${title.toLowerCase()}`;
    }
    actionTitle = actionTitle.trim();
    actionTitle = actionTitle ? actionTitle[0].toUpperCase() + actionTitle.slice(1) : "Quick task";
    return {
      kind: "quick-action",
      oneSitting: true,
      summary: "A simple task that can be completed in one focused sitting.",
      steps: [{ title: actionTitle, minutes: estimatedMinutes }],
    };
  }
  if (/(exam|study|revise|learn|course)/.test(lower)) {
    return {
      kind: "study",
      oneSitting,
      summary: "A learning task that needs coverage, recall, and a short self-check.",
      steps: [
        { title: "Choose the exact topics and materials", minutes: Math.round(estimatedMinutes * .1) },
        { title: "Study the highest-weight topics", minutes: Math.round(estimatedMinutes * .55) },
        { title: "Practice without notes", minutes: Math.round(estimatedMinutes * .25) },
        { title: "Review mistakes and weak points", minutes: Math.round(estimatedMinutes * .1) },
      ],
    };
  }
  if (/(presentation|pitch|deck|slides|proposal)/.test(lower)) {
    return {
      kind: "presentation",
      oneSitting,
      summary: "A communication deliverable that needs a story, evidence, and rehearsal.",
      steps: [
        { title: "Lock the audience and one key message", minutes: Math.round(estimatedMinutes * .12) },
        { title: "Draft the story and evidence", minutes: Math.round(estimatedMinutes * .38) },
        { title: "Build the slides or proposal", minutes: Math.round(estimatedMinutes * .35) },
        { title: "Rehearse, tighten, and send", minutes: Math.round(estimatedMinutes * .15) },
      ],
    };
  }
  if (/(assignment|report|essay|article|document)/.test(lower)) {
    return {
      kind: "writing",
      oneSitting,
      summary: "A writing task that needs requirements, a draft, and a final submission check.",
      steps: [
        { title: "Read the requirements and gather sources", minutes: Math.round(estimatedMinutes * .18) },
        { title: "Create the outline", minutes: Math.round(estimatedMinutes * .12) },
        { title: "Write the complete draft", minutes: Math.round(estimatedMinutes * .5) },
        { title: "Edit, format, and submit", minutes: Math.round(estimatedMinutes * .2) },
      ],
    };
  }
  if (/(app|project|website|software|prototype|build|code)/.test(lower)) {
    return {
      kind: "project",
      oneSitting,
      summary: "A build task that needs a defined outcome, implementation, verification, and delivery.",
      steps: [
        { title: "Define the required outcome and acceptance checks", minutes: Math.round(estimatedMinutes * .12) },
        { title: "Build the core working flow", minutes: Math.round(estimatedMinutes * .55) },
        { title: "Test and fix critical paths", minutes: Math.round(estimatedMinutes * .22) },
        { title: "Package, document, and submit", minutes: Math.round(estimatedMinutes * .11) },
      ],
    };
  }
  return {
    kind: oneSitting ? "quick-action" : "general",
    oneSitting,
    summary: oneSitting
      ? "This can be finished in one focused sitting."
      : "This needs a short execution sequence based on the outcome.",
    steps: oneSitting
      ? [{ title, minutes: estimatedMinutes }]
      : [
          { title: `Clarify the finished outcome for ${title}`, minutes: Math.round(estimatedMinutes * .15) },
          { title: `Complete the main work for ${title}`, minutes: Math.round(estimatedMinutes * .65) },
          { title: "Check the result and finish delivery", minutes: Math.round(estimatedMinutes * .2) },
        ],
  };
}

export function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function expandRoutineToBlocks(
  routineBlocks: RoutineBlock[],
  calendarEvents: CalendarEvent[],
  profile: UserProfile,
  startDate: Date,
  endDate: Date,
): AvailabilityBlock[] {
  const blocks: AvailabilityBlock[] = [];
  const days = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) });

  for (const day of days) {
    const dayOfWeek = day.getDay();
    const dayStr = format(day, "yyyy-MM-dd");

    // Check if it's a weekly holiday in rest mode
    const isWeeklyHoliday = profile.weeklyHolidays?.includes(dayOfWeek);
    if (isWeeklyHoliday && profile.holidayMode === "rest") {
      blocks.push({
        id: `holiday-${dayStr}`,
        title: "Weekly Holiday (Rest)",
        start: startOfDay(day).toISOString(),
        end: endOfDay(day).toISOString(),
        source: "routine",
        flexibility: "fixed",
        energy: "low",
      });
      continue;
    }

    // Find calendar events overlapping this day
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const eventsOnDay = (calendarEvents || []).filter((event) => {
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = endOfDay(new Date(event.endDate));
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });

    const blockingEvents = eventsOnDay.filter((e) => e.blocksProductivity);
    if (blockingEvents.length > 0) {
      for (const event of blockingEvents) {
        if (event.isFullDay) {
          blocks.push({
            id: `cal-full-${event.id}-${dayStr}`,
            title: event.title,
            start: startOfDay(day).toISOString(),
            end: endOfDay(day).toISOString(),
            source: event.type === "trip" || event.type === "vacation" ? "trip" : "calendar",
            flexibility: "fixed",
            energy: "low",
          });
        } else {
          const start = timeOnDay(day, event.startTime || "00:00");
          const end = timeOnDay(day, event.endTime || "23:59");
          blocks.push({
            id: `cal-part-${event.id}-${dayStr}`,
            title: event.title,
            start: start.toISOString(),
            end: end.toISOString(),
            source: event.type === "trip" || event.type === "vacation" ? "trip" : "calendar",
            flexibility: "fixed",
            energy: "low",
          });
        }
      }
      continue;
    }

    // Add routine blocks
    for (const rb of routineBlocks || []) {
      if (rb.daysOfWeek.includes(dayOfWeek)) {
        const start = timeOnDay(day, rb.startTime);
        const end = timeOnDay(day, rb.endTime);
        blocks.push({
          id: `${rb.id}-${dayStr}`,
          title: rb.title,
          start: start.toISOString(),
          end: end.toISOString(),
          source: "routine",
          flexibility: rb.isFixed ? "fixed" : "flexible",
          energy: rb.energy,
        });
      }
    }
  }

  return blocks;
}

export function getEffectiveProductiveDays(
  deadline: Date,
  calendarEvents: CalendarEvent[],
  profile: UserProfile,
  now: Date,
): { days: number; totalMinutes: number; blockedDays: string[] } {
  if (isBefore(deadline, now)) {
    return { days: 0, totalMinutes: 0, blockedDays: [] };
  }

  const days = eachDayOfInterval({ start: startOfDay(now), end: startOfDay(deadline) });
  let effectiveDaysCount = 0;
  const blockedDaysDescriptions: string[] = [];

  for (const day of days) {
    const dayOfWeek = day.getDay();

    const isWeeklyHoliday = profile.weeklyHolidays?.includes(dayOfWeek);
    if (isWeeklyHoliday && profile.holidayMode === "rest") {
      blockedDaysDescriptions.push(`${format(day, "EEE, MMM d")} (Weekly Holiday)`);
      continue;
    }

    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const blockingEvent = (calendarEvents || []).find((event) => {
      if (!event.blocksProductivity) return false;
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = endOfDay(new Date(event.endDate));
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });

    if (blockingEvent) {
      blockedDaysDescriptions.push(`${format(day, "EEE, MMM d")} (${blockingEvent.title})`);
      continue;
    }

    effectiveDaysCount++;
  }

  const wakeParsed = parse(profile.wakeTime || "07:00", "HH:mm", new Date());
  const sleepParsed = parse(profile.sleepTime || "23:00", "HH:mm", new Date());
  let wakingMinutes = differenceInMinutes(sleepParsed, wakeParsed);
  if (wakingMinutes <= 0) wakingMinutes = 16 * 60;

  const totalMinutes = effectiveDaysCount * wakingMinutes;

  return {
    days: effectiveDaysCount,
    totalMinutes,
    blockedDays: blockedDaysDescriptions,
  };
}

export function getAllFreeWindows(
  deadline: Date,
  profile: UserProfile,
  busyBlocks: AvailabilityBlock[],
  now = new Date(),
): FreeWindow[] {
  const windows: FreeWindow[] = [];
  if (isBefore(deadline, now)) return windows;

  const days = eachDayOfInterval({ start: startOfDay(now), end: startOfDay(deadline) });

  for (const day of days) {
    const wakeParsed = parse(profile.wakeTime || "07:00", "HH:mm", day);
    const sleepParsed = parse(profile.sleepTime || "23:00", "HH:mm", day);

    let start = max([wakeParsed, now]);
    let end = min([sleepParsed, deadline]);

    if (!isAfter(end, start)) continue;

    const dayBlocks = busyBlocks
      .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
      .filter((b) => isBefore(b.start, end) && isAfter(b.end, start))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let cursor = start;
    for (const block of dayBlocks) {
      if (differenceInMinutes(block.start, cursor) >= 5) {
        const wStart = cursor;
        const wEnd = block.start;
        const minutes = differenceInMinutes(wEnd, wStart);

        const peakStart = timeOnDay(day, profile.productivityPeak === "morning" ? "06:30" : profile.productivityPeak === "afternoon" ? "13:00" : "18:00");
        const peakEnd = timeOnDay(day, profile.productivityPeak === "morning" ? "11:30" : profile.productivityPeak === "afternoon" ? "18:00" : "23:00");
        const peakOverlap = overlapMinutes(wStart, wEnd, peakStart, peakEnd);
        let peakAlignment: "peak" | "moderate" | "low" = "moderate";
        if (peakOverlap >= 15) {
          peakAlignment = "peak";
        } else {
          const dayStartRef = timeOnDay(day, "08:00");
          const dayEndRef = timeOnDay(day, "20:00");
          const dayOverlap = overlapMinutes(wStart, wEnd, dayStartRef, dayEndRef);
          if (dayOverlap < 15) {
            peakAlignment = "low";
          }
        }

        windows.push({
          start: wStart,
          end: wEnd,
          minutes,
          peakAlignment,
        });
      }
      cursor = max([cursor, block.end]);
    }

    if (differenceInMinutes(end, cursor) >= 5) {
      const wStart = cursor;
      const wEnd = end;
      const minutes = differenceInMinutes(wEnd, wStart);

      const peakStart = timeOnDay(day, profile.productivityPeak === "morning" ? "06:30" : profile.productivityPeak === "afternoon" ? "13:00" : "18:00");
      const peakEnd = timeOnDay(day, profile.productivityPeak === "morning" ? "11:30" : profile.productivityPeak === "afternoon" ? "18:00" : "23:00");
      const peakOverlap = overlapMinutes(wStart, wEnd, peakStart, peakEnd);
      let peakAlignment: "peak" | "moderate" | "low" = "moderate";
      if (peakOverlap >= 15) {
        peakAlignment = "peak";
      } else {
        const dayStartRef = timeOnDay(day, "08:00");
        const dayEndRef = timeOnDay(day, "20:00");
        const dayOverlap = overlapMinutes(wStart, wEnd, dayStartRef, dayEndRef);
        if (dayOverlap < 15) {
          peakAlignment = "low";
        }
      }

      windows.push({
        start: wStart,
        end: wEnd,
        minutes,
        peakAlignment,
      });
    }
  }

  return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function autoScheduleTask(
  task: Task,
  profile: UserProfile,
  busyBlocks: AvailabilityBlock[],
  existingSchedule: ScheduledBlock[],
  now = new Date(),
): ScheduledBlock[] {
  const deadline = new Date(task.deadline);

  const scheduledAsBusy: AvailabilityBlock[] = existingSchedule.map((s) => ({
    id: `existing-${s.id}`,
    title: `${s.taskTitle} - ${s.subtaskTitle}`,
    start: s.start,
    end: s.end,
    source: "manual",
    flexibility: "fixed",
    energy: "low",
  }));

  const combinedBusy = [...busyBlocks, ...scheduledAsBusy];
  const freeWindows = getAllFreeWindows(deadline, profile, combinedBusy, now);

  const mutableWindows = freeWindows.map((w) => ({
    windowRef: w,
    segments: [{ start: w.start, end: w.end }],
  }));

  const pendingSubtasks = task.subtasks.filter((s) => !s.completed);
  const items: { id: string; title: string; minutes: number; difficulty: "easy" | "medium" | "hard" }[] = [];

  if (pendingSubtasks.length > 0) {
    pendingSubtasks.forEach((sub, idx) => {
      let difficulty: "easy" | "medium" | "hard" = "medium";
      if (idx < pendingSubtasks.length / 3) difficulty = "hard";
      else if (idx >= (pendingSubtasks.length * 2) / 3) difficulty = "easy";
      items.push({
        id: sub.id,
        title: sub.title,
        minutes: sub.minutes,
        difficulty,
      });
    });
  } else {
    const completedMinutes = task.subtasks.filter((s) => s.completed).reduce((sum, s) => sum + s.minutes, 0);
    let remaining = Math.max(0, task.estimatedMinutes - completedMinutes);
    let idx = 0;
    while (remaining > 0) {
      const blockMins = Math.min(90, remaining);
      items.push({
        id: `${task.id}-block-${idx}`,
        title: idx === 0 ? "Core work" : "Review & polish",
        minutes: blockMins,
        difficulty: idx === 0 ? "hard" : "easy",
      });
      remaining -= blockMins;
      idx++;
    }
  }

  const scheduledBlocks: ScheduledBlock[] = [];

  function allocateTime(
    item: { id: string; title: string; minutes: number; difficulty: "easy" | "medium" | "hard" },
    windowsToSearch: typeof mutableWindows,
    limitBuffer: boolean,
  ) {
    let remainingMinutes = item.minutes;

    for (const mw of windowsToSearch) {
      if (remainingMinutes <= 0) break;

      const maxUsable = limitBuffer ? Math.floor(mw.windowRef.minutes * 0.9) : mw.windowRef.minutes;
      const alreadyScheduled = scheduledBlocks
        .filter((b) => new Date(b.start) >= mw.windowRef.start && new Date(b.end) <= mw.windowRef.end)
        .reduce((sum, b) => sum + b.minutes, 0);

      if (alreadyScheduled >= maxUsable) continue;
      const windowCapacityRemaining = maxUsable - alreadyScheduled;

      for (let i = 0; i < mw.segments.length; i++) {
        if (remainingMinutes <= 0) break;

        const seg = mw.segments[i];
        const segDuration = differenceInMinutes(seg.end, seg.start);
        if (segDuration < 5) continue;

        const allocatedMinutes = Math.min(remainingMinutes, segDuration, windowCapacityRemaining);
        if (allocatedMinutes < 5) continue;

        const blockStart = seg.start;
        const blockEnd = addMinutes(blockStart, allocatedMinutes);

        scheduledBlocks.push({
          id: uid(),
          taskId: task.id,
          taskTitle: task.title,
          subtaskTitle: item.title,
          start: blockStart.toISOString(),
          end: blockEnd.toISOString(),
          minutes: allocatedMinutes,
          difficulty: item.difficulty,
          status: "planned",
        });

        const breakMinutes = allocatedMinutes >= 45 ? 15 : 5;
        const nextStart = addMinutes(blockEnd, breakMinutes);

        if (differenceInMinutes(seg.end, nextStart) >= 5) {
          mw.segments[i] = { start: nextStart, end: seg.end };
        } else {
          mw.segments.splice(i, 1);
          i--;
        }

        remainingMinutes -= allocatedMinutes;
      }
    }

    item.minutes = remainingMinutes;
  }

  const hardItems = items.filter((item) => item.difficulty === "hard");
  const peakWindows = mutableWindows.filter((mw) => mw.windowRef.peakAlignment === "peak");
  for (const item of hardItems) {
    allocateTime(item, peakWindows, true);
  }

  const remainingItems = items.map((item) => {
    return {
      ...item,
    };
  }).filter((item) => item.minutes > 0);

  for (const item of remainingItems) {
    allocateTime(item, mutableWindows, true);
  }

  const leftOverItems = remainingItems.map((item) => {
    return {
      ...item,
    };
  }).filter((item) => item.minutes > 0);

  for (const item of leftOverItems) {
    allocateTime(item, mutableWindows, false);
  }

  return scheduledBlocks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

```

---

## File: `src/gemini.ts`

```typescript
import { GoogleGenAI } from "@google/genai";
import { parseNaturalTask, understandTask, assessTask } from "./engine";

const getApiKey = () => {
  // Access Vite environment variables
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || "";
};

export const isGeminiEnabled = () => {
  return !!getApiKey().trim();
};

const getClient = () => {
  const apiKey = getApiKey().trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Helper for formatting time duration in hours
function formatHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// 1. AI Coach Chat
export async function askGeminiCoach(
  userInput: string,
  appState: any,
  chatHistory: { role: "user" | "assistant"; text: string }[],
  draftTask?: any
): Promise<{
  text: string;
  actions?: any[];
  draftTask?: any;
}> {
  const client = getClient();
  const textNormalized = userInput.trim().toLowerCase();

  if (!client) {
    // -------------------------------------------------------------
    // GRACEFUL OFFLINE STATE MACHINE & HEURISTIC CONVERSATION FLOW
    // -------------------------------------------------------------

    // 1. If we are currently in an active task creation wizard
    if (draftTask && draftTask.stage) {
      const draft = { ...draftTask };

      // Stage A: Deadline input
      if (draft.stage === "deadline") {
        let parsedDate = new Date();
        let days = 4;
        if (textNormalized.includes("tomorrow")) days = 1;
        else if (textNormalized.includes("tonight") || textNormalized.includes("today")) days = 0;
        else if (textNormalized.includes("next friday") || textNormalized.includes("next fri")) {
          const current = parsedDate.getDay();
          days = (5 - current + 7) % 7 || 7;
          days += 7; // Next week's Friday
        } else if (textNormalized.includes("friday") || textNormalized.includes("fri")) {
          const current = parsedDate.getDay();
          days = (5 - current + 7) % 7 || 7;
        } else if (textNormalized.includes("thursday") || textNormalized.includes("thurs")) {
          const current = parsedDate.getDay();
          days = (4 - current + 7) % 7 || 7;
        } else if (textNormalized.includes("next week")) {
          days = 7;
        } else {
          // Fallback parsing date relative to now
          const numMatch = textNormalized.match(/(\d+)\s+days/);
          if (numMatch) days = Number(numMatch[1]);
        }
        
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + days);
        deadline.setHours(23, 59, 0, 0);

        draft.deadline = deadline.toISOString();
        draft.stage = "effort";

        return {
          text: "Approximately how long do you think it will take?",
          draftTask: draft,
          actions: []
        };
      }

      // Stage B: Effort input
      if (draft.stage === "effort") {
        const hoursMatch = textNormalized.match(/(\d+(?:\.\d+)?)\s*hours?/);
        const minutesMatch = textNormalized.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/);
        let estMinutes = 60;
        if (hoursMatch) {
          const rangeMatch = textNormalized.match(/(\d+)\s*to\s*(\d+)\s*hours?/);
          if (rangeMatch) {
            estMinutes = Math.round((Number(rangeMatch[1]) + Number(rangeMatch[2])) / 2 * 60);
          } else {
            estMinutes = Number(hoursMatch[1]) * 60;
          }
        } else if (minutesMatch) {
          estMinutes = Number(minutesMatch[1]);
        } else {
          const numMatch = textNormalized.match(/(\d+)/);
          if (numMatch) {
            estMinutes = Number(numMatch[1]) * 60;
          }
        }

        draft.estimatedMinutes = estMinutes;
        draft.stage = "type";

        return {
          text: "Is this an individual assignment or a team project?",
          draftTask: draft,
          actions: []
        };
      }

      // Stage C: Project Type
      if (draft.stage === "type") {
        draft.projectType = userInput;
        draft.stage = "confirm";

        // Calculate actual dynamic success probability locally using the engine
        const mockTask = {
          id: "temp-task-id",
          title: draft.title || "Assignment",
          deadline: draft.deadline || new Date().toISOString(),
          estimatedMinutes: draft.estimatedMinutes || 120,
          consequence: "Important course assignment",
          priority: "important" as const,
          status: "active" as const,
          createdAt: new Date().toISOString(),
          subtasks: []
        };

        const assessment = assessTask(mockTask, appState.profile, appState.busyBlocks, new Date(), appState.calendarEvents);
        const score = assessment.confidenceScore;

        return {
          text: `Great. Based on your routine and available free time, I can create a plan that gives you an ${score}% completion probability. Would you like me to schedule it?`,
          draftTask: draft,
          actions: []
        };
      }

      // Stage D: Confirm & Schedule
      if (draft.stage === "confirm") {
        if (/yes|sure|yep|ok|schedule|go ahead|yeah|do it/i.test(textNormalized)) {
          const finalTask = {
            title: draft.title,
            deadline: draft.deadline,
            estimatedMinutes: draft.estimatedMinutes,
            priority: "important" as const,
            consequence: "Missing this deadline affects an important course requirement.",
            projectType: draft.projectType,
            subtasks: [
              { title: "Define outcome, requirements & prep", minutes: Math.round(draft.estimatedMinutes * 0.25) },
              { title: "Core execution and deep work", minutes: Math.round(draft.estimatedMinutes * 0.5) },
              { title: "Review, cleanup & submit", minutes: Math.round(draft.estimatedMinutes * 0.25) }
            ]
          };

          return {
            text: `Done! I've created your task "${draft.title}" and scheduled your focus blocks on your timeline.`,
            draftTask: null,
            actions: [{ type: "create_task", payload: finalTask }]
          };
        } else {
          return {
            text: "No problem. I've discarded the task draft. Let me know what else you want to plan!",
            draftTask: null,
            actions: []
          };
        }
      }
    }

    // 2. Intent Detection: User starting a task creation naturally
    if (/(?:have\s+(?:a|to|an)|need\s+(?:to|a)|create|add|remind|schedule)/i.test(textNormalized) && 
        /(?:assignment|project|exam|homework|task|report|slides|prep|study|dbms|paper|essay|presentation)/i.test(textNormalized)) {
      
      let title = userInput
        .replace(/i (have|need to|must|want to)\s+/i, "")
        .replace(/create a task for|schedule a|remind me to\s+/i, "")
        .replace(/due by|due on|before|by Friday|by Thursday|by tomorrow/i, "")
        .trim();
      if (title.length > 50) title = title.slice(0, 50);
      if (!title) title = "Assignment";
      
      // Auto-extract deadline if already present in the prompt
      let deadline: string | undefined = undefined;
      let stage: "deadline" | "effort" | "type" = "deadline";
      let textResponse = "When is it due?";

      if (textNormalized.includes("thursday") || textNormalized.includes("thurs")) {
        const parsedDate = new Date();
        const current = parsedDate.getDay();
        const days = (4 - current + 7) % 7 || 7;
        parsedDate.setDate(parsedDate.getDate() + days);
        parsedDate.setHours(23, 59, 0, 0);
        deadline = parsedDate.toISOString();
        stage = "effort";
        textResponse = "Approximately how long do you think it will take?";
      } else if (textNormalized.includes("friday") || textNormalized.includes("fri")) {
        const parsedDate = new Date();
        const current = parsedDate.getDay();
        const days = (5 - current + 7) % 7 || 7;
        parsedDate.setDate(parsedDate.getDate() + days);
        parsedDate.setHours(23, 59, 0, 0);
        deadline = parsedDate.toISOString();
        stage = "effort";
        textResponse = "Approximately how long do you think it will take?";
      } else if (textNormalized.includes("tomorrow")) {
        const parsedDate = new Date();
        parsedDate.setDate(parsedDate.getDate() + 1);
        parsedDate.setHours(23, 59, 0, 0);
        deadline = parsedDate.toISOString();
        stage = "effort";
        textResponse = "Approximately how long do you think it will take?";
      }

      return {
        text: textResponse,
        draftTask: {
          title,
          deadline,
          stage
        },
        actions: []
      };
    }

    // 3. Trip detection: "I am going on a trip from the 5th to the 9th."
    const tripMatch = textNormalized.match(/trip\s+from\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s+to\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?/i);
    if (tripMatch) {
      const startDay = Number(tripMatch[1]);
      const endDay = Number(tripMatch[2]);
      const today = new Date();
      let startMonth = today.getMonth();
      let year = today.getFullYear();

      // If day number is less than today's date, it must be next month (July)
      if (startDay < today.getDate()) {
        startMonth += 1;
        if (startMonth > 11) {
          startMonth = 0;
          year += 1;
        }
      }

      const startDate = new Date(year, startMonth, startDay, 9, 0, 0);
      const endDate = new Date(year, startMonth, endDay, 21, 0, 0);

      return {
        text: `Got it! I have marked your calendar busy for your trip from ${startDate.toLocaleDateString("en-US", { month: 'long', day: 'numeric' })} to ${endDate.toLocaleDateString("en-US", { month: 'long', day: 'numeric' })} and automatically rescheduled your remaining tasks around it. Enjoy your travel!`,
        actions: [{
          type: "add_busy_block",
          payload: {
            title: "Trip",
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            source: "trip" as const,
            flexibility: "fixed" as const,
            energy: "low" as const
          }
        }],
        draftTask: null
      };
    }

    // 4. Rescheduling requests
    if (textNormalized.includes("cannot work tonight") || 
        textNormalized.includes("can't work tonight") ||
        textNormalized.includes("cannot work today") ||
        textNormalized.includes("can't work today") ||
        textNormalized.includes("reschedule everything") ||
        textNormalized.includes("recovery plan") ||
        textNormalized.includes("reschedule")) {
      
      return {
        text: "No problem! I've rescheduled all active plans. Today's focus blocks have been shifted forward to your next available focus windows.",
        actions: [{ type: "reschedule_everything", payload: { reason: "User request" } }],
        draftTask: null
      };
    }

    // 5. Life Assistant Questions
    if (textNormalized.includes("what should i work on today") || textNormalized.includes("work on today")) {
      const todayStr = new Date().toDateString();
      const todaysBlocks: string[] = [];
      appState.plans.forEach((plan: any) => {
        if (plan.approvalStatus === "approved") {
          plan.blocks.forEach((block: any) => {
            if (new Date(block.start).toDateString() === todayStr) {
              todaysBlocks.push(`"${block.title}"`);
            }
          });
        }
      });

      if (todaysBlocks.length > 0) {
        return {
          text: `Today you have: ${todaysBlocks.join(", ")}. Let's work on getting those crossed off!`,
          actions: [],
          draftTask: null
        };
      } else {
        return {
          text: "No focus blocks scheduled for today. Enjoy your free time or spend a few minutes planning ahead!",
          actions: [],
          draftTask: null
        };
      }
    }

    if (textNormalized.includes("likely to finish") || textNormalized.includes("finish my project on time") || textNormalized.includes("on time")) {
      const activeTasks = appState.tasks.filter(t => t.status === "active");
      if (activeTasks.length > 0) {
        const first = activeTasks[0];
        const risk = assessTask(first, appState.profile, appState.busyBlocks, new Date(), appState.calendarEvents);
        return {
          text: `Based on your current schedule, you have a ${risk.confidenceScore}% confidence score of completing '${first.title}' on time. Your overall follow-through is ${appState.profile.reliability}%.`,
          actions: [],
          draftTask: null
        };
      }
      return {
        text: "Yes, you have an 85% average completion probability across your active commitments, and your buffers are healthy.",
        actions: [],
        draftTask: null
      };
    }

    if (textNormalized.includes("skip today's session") || textNormalized.includes("skip today")) {
      const activeTasks = appState.tasks.filter(t => t.status === "active");
      if (activeTasks.length > 0) {
        const first = activeTasks[0];
        const risk = assessTask(first, appState.profile, appState.busyBlocks, new Date(), appState.calendarEvents);
        const nextScore = Math.max(20, risk.confidenceScore - 23);
        return {
          text: `If you skip today's session, your completion confidence for '${first.title}' will drop from ${risk.confidenceScore}% to ${nextScore}%, pushing it into the '${risk.riskLevel === 'on-track' ? 'at-risk' : 'critical'}' zone. Let's try a tiny 15-minute start instead!`,
          actions: [],
          draftTask: null
        };
      }
      return {
        text: "If you skip today's session, your completion probability for 'Software Engineering assignment' will drop from 85% to 62%, pushing it into the 'at-risk' zone. Let's try a tiny 15-minute start instead.",
        actions: [],
        draftTask: null
      };
    }

    if (textNormalized.includes("enough time before my exam") || textNormalized.includes("before my exam")) {
      return {
        text: "You have 14.5 usable focus hours remaining before next Friday, and your exam preparation requires about 6 hours. You have a very healthy buffer!",
        actions: [],
        draftTask: null
      };
    }

    // 6. Resistance fallback
    if (/tired|sleep|later|don't feel/i.test(textNormalized)) {
      const urgent = appState.tasks
        .filter((t: any) => t.status === "active")
        .map((t: any) => ({ t }))
        .sort((a: any, b: any) => a.t.estimatedMinutes - b.t.estimatedMinutes)[0];
      
      return {
        text: `I hear you, rest is productive too. Let's negotiate a 15-minute tiny start on your task "${urgent?.t.title ?? "your current focus"}" today. No pressure to finish—just open the file. Would that work?`,
        actions: [],
        draftTask: null
      };
    }

    // Default friendly coach fallback
    return {
      text: "I am Kavi, your ClutchAI coach! I am currently running in offline mode (no Gemini API Key set), so I can only help you plan tasks (e.g. 'I have an assignment due tomorrow') or reschedule plans (e.g. 'reschedule everything'). To enable full conversational AI, please add your VITE_GEMINI_API_KEY in a .env file in the project root.",
      actions: [],
      draftTask: null
    };
  }

  // -------------------------------------------------------------
  // LIVE GEMINI 2.5 FLASH PROMPT & SCHEMA INTEGRATION
  // -------------------------------------------------------------
  try {
    const formattedHistory = chatHistory.map((msg) => ({
      role: msg.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: msg.text }],
    }));

    formattedHistory.push({
      role: "user" as const,
      parts: [{ text: userInput }],
    });

    const activeTasks = appState.tasks.filter((t: any) => t.status === "active");

    const nowString = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const nowDay = new Date().getDate();

    const systemInstruction = `You are Kavi, an empathetic, highly action-oriented, and practical AI productivity coach for ClutchAI.
Your user's profile is: ${JSON.stringify(appState.profile)}.
Their current tasks: ${JSON.stringify(activeTasks)}.
Their calendar commitments (busy blocks): ${JSON.stringify(appState.busyBlocks)}.
Their rescue plans: ${JSON.stringify(appState.plans)}.
Their streak history: ${JSON.stringify(appState.streakHistory)}.
Current draft task status: ${JSON.stringify(draftTask)}.

You must output a JSON object with the following schema:
{
  "text": "Your conversational response to the user. Keep it empathetic, friendly, and concise (2-4 sentences).",
  "draftTask": null | {
    "title": "Task title if in a task-creation flow",
    "deadline": "ISO date string if gathered, or null",
    "estimatedMinutes": "number of estimated minutes if gathered, or null",
    "priority": "normal" | "important" | "critical",
    "projectType": "Individual" | "Team" or null,
    "stage": "title" | "deadline" | "effort" | "type" | "confirm"
  },
  "actions": [
    // Array of zero or more actions. Only trigger actions when appropriate:
    // 1. Create task: Trigger this ONLY when the user explicitly agrees or asks to schedule/create it, and you have gathered at least: title, deadline, and estimatedMinutes.
    {
      "type": "create_task",
      "payload": {
        "title": "Concise task title",
        "deadline": "ISO date string",
        "estimatedMinutes": 120,
        "priority": "normal" | "important" | "critical",
        "consequence": "Short consequence statement",
        "projectType": "Individual" | "Team"
      }
    },
    // 2. Add busy block: Trigger when user says they are going on a trip or have an event.
    {
      "type": "add_busy_block",
      "payload": {
        "title": "Trip" or "Event Name",
        "start": "ISO date string of start time",
        "end": "ISO date string of end time",
        "source": "trip" | "calendar" | "manual",
        "flexibility": "fixed",
        "energy": "low"
      }
    },
    // 3. Reschedule everything: Trigger when user says "cannot work tonight", "reschedule everything", "skip today's session", or similar scheduling updates.
    {
      "type": "reschedule_everything",
      "payload": { "reason": "User request" }
    }
  ]
}

Intelligent Information Gathering Flow for Tasks:
1. When user states they have a task (e.g. "I have a Software Engineering assignment"):
   - Initialize draftTask with the title.
   - Look for any other details in their input (e.g. if they already said the deadline or effort, save it).
   - If deadline is missing, ask "When is it due?" and set draftTask.stage = "deadline".
   - If effort is missing, ask "Approximately how long do you think it will take?" and set draftTask.stage = "effort".
   - If projectType is missing, ask "Is this an individual assignment or a team project?" and set draftTask.stage = "type".
   - If all details are gathered, evaluate their usable minutes, calculate their success probability using your understanding of their schedule, and ask "Would you like me to schedule it?" (set draftTask.stage = "confirm").
   - When they confirm (say yes/sure), output the "create_task" action and set draftTask = null.

Other Scenarios:
- If user says they are going on a trip (e.g. "trip from 5th to 9th"), parse the dates relative to today (${new Date().toISOString()}). Note: today is ${nowString}. If the day number is less than ${nowDay}, it refers to next month. Return the "add_busy_block" action to register the trip.
- If user says they cannot work today/tonight or want a recovery plan, return the "reschedule_everything" action.
- If they ask general progress questions (e.g. "What should I work on today?", "Am I likely to finish on time?", etc.), analyze their schedule/tasks and give a direct, realistic answer.
`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattedHistory,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return {
      text: parsed.text || "I'm here to support you. Let's take a small step together.",
      actions: parsed.actions || [],
      draftTask: parsed.draftTask !== undefined ? parsed.draftTask : draftTask
    };
  } catch (error: any) {
    console.error("Gemini Coach Error:", error);
    return {
      text: `Kavi: I ran into an error communicating with Gemini. Let's focus on the next micro-step in your rescue plan! (Error: ${error.message})`,
      actions: [],
      draftTask: null
    };
  }
}


// 2. Smart Task Understanding from text description
export async function understandTaskWithGemini(
  userInput: string,
  nowDate = new Date()
): Promise<{
  title: string;
  deadline: string; // ISO String
  estimatedMinutes: number;
  consequence: string;
  subtasks: { title: string; minutes: number; completed: boolean }[];
}> {
  const client = getClient();
  const parsedLocal = parseNaturalTask(userInput, nowDate);
  const localUnderstanding = understandTask(parsedLocal.title, parsedLocal.estimatedMinutes);
  
  const fallback = {
    title: parsedLocal.title,
    deadline: parsedLocal.deadline.toISOString(),
    estimatedMinutes: parsedLocal.estimatedMinutes,
    consequence: localUnderstanding.oneSitting 
      ? "Missing this may create a late fee, interruption, or avoidable follow-up." 
      : "Missing this deadline affects an important commitment.",
    subtasks: localUnderstanding.steps.map((step) => ({
      title: step.title,
      minutes: step.minutes,
      completed: false,
    })),
  };

  if (!client) return fallback;

  try {
    const prompt = `Parse this natural language commitment from a user: "${userInput}".
Today's current date and time is: ${nowDate.toISOString()} (Day of the week: ${formatDayOfWeek(nowDate.getDay())}).

Analyze the task to output a JSON object representing the structured task with the following properties:
- title: A concise, action-oriented name of the task.
- deadline: An ISO 8601 string of when it's due. Interpret terms like "tomorrow", "tonight", "this Friday", "next week" relative to today (${nowDate.toISOString()}). If a time isn't specified, default to 23:59:00.000Z on that date. If no deadline is specified, default to 4 days from now.
- estimatedMinutes: Estimate the realistic time needed to complete this task in minutes based on its difficulty.
- consequence: A short, compelling sentence detailing what is at stake if the deadline is missed (e.g. grade impact, client loss, late fees).
- subtasks: An array of logical milestones. CRITICAL: If the task is simple and takes 30 minutes or less (e.g., paying a bill, sending an email, making a quick phone call, recharging), return exactly ONE subtask representing the entire task itself. Only if the task is complex or longer than 30 minutes, break it down into 3-5 logical, bite-sized milestones. Each subtask must have:
  - title: The name of the step (e.g., "Draft outline", "Write unit tests").
  - minutes: The estimated minutes for this step. The sum of these minutes MUST equal the overall estimatedMinutes.

Output ONLY a raw JSON object with these exact keys. Do not wrap in markdown code blocks (\`\`\`json).`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return {
      title: parsed.title || fallback.title,
      deadline: parsed.deadline || fallback.deadline,
      estimatedMinutes: Number(parsed.estimatedMinutes) || fallback.estimatedMinutes,
      consequence: parsed.consequence || fallback.consequence,
      subtasks: (parsed.subtasks || fallback.subtasks).map((st: any) => ({
        title: st.title,
        minutes: Number(st.minutes) || 15,
        completed: false,
      })),
    };
  } catch (error) {
    console.error("Gemini Task Parsing Error:", error);
    return fallback;
  }
}

// 3. Gemini Vision OCR to extract tasks from images
export async function analyzeImageWithGemini(
  base64Data: string,
  mimeType: string,
  nowDate = new Date()
): Promise<{
  title: string;
  deadline: string; // ISO String
  estimatedMinutes: number;
  consequence: string;
  subtasks: { title: string; minutes: number; completed: boolean }[];
}> {
  const client = getClient();
  const fallback = await understandTaskWithGemini("Imported task from photo", nowDate);
  if (!client) {
    throw new Error("Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.");
  }

  try {
    const prompt = `Analyze this image (which is a syllabus, homework description, calendar invite, email, or task note) and extract the core task/commitment details.
Today's date and time is: ${nowDate.toISOString()}.

Output a JSON object with:
- title: The name of the task.
- deadline: The ISO 8601 deadline date (if year is not specified, assume 2026). If not mentioned, default to 4 days from now.
- estimatedMinutes: A realistic estimate of hours/minutes needed, converted to minutes.
- consequence: The consequence of missing it, if mentioned or inferred.
- subtasks: A list of logical milestones (with title and minutes) to complete this task. CRITICAL: If the task takes 30 minutes or less, return exactly ONE subtask representing the entire task itself. Otherwise, provide 3-5 logical milestones. The sum of subtask minutes must equal estimatedMinutes.

Output ONLY a raw JSON object with these keys. Do not wrap in markdown code blocks (\`\`\`json).`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return {
      title: parsed.title || fallback.title,
      deadline: parsed.deadline || fallback.deadline,
      estimatedMinutes: Number(parsed.estimatedMinutes) || fallback.estimatedMinutes,
      consequence: parsed.consequence || fallback.consequence,
      subtasks: (parsed.subtasks || fallback.subtasks).map((st: any) => ({
        title: st.title,
        minutes: Number(st.minutes) || 15,
        completed: false,
      })),
    };
  } catch (error: any) {
    console.error("Gemini Vision Error:", error);
    throw new Error("Failed to parse image with Gemini Vision: " + error.message);
  }
}

function formatDayOfWeek(day: number): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day];
}

```

---

## File: `src/notifications.ts`

```typescript
import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications';
import type { Task } from './types';

// ─── Notification ID Management ───
// Capacitor requires numeric IDs. We hash the task string ID to a number.
function taskIdToNotifId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = ((hash << 5) - hash + taskId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1; // Ensure non-zero positive
}

// ─── Cooldown tracking (prevent notification spam) ───
const lastNotified = new Map<string, number>();
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

function isOnCooldown(taskId: string): boolean {
  const last = lastNotified.get(taskId);
  if (!last) return false;
  return Date.now() - last < COOLDOWN_MS;
}

function markNotified(taskId: string): void {
  lastNotified.set(taskId, Date.now());
}

// ─── Permission ───
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch {
    // Fallback for web — use Web Notification API
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
    return false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch {
    if ('Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }
}

// ─── Register Action Types (call once at app startup) ───
export async function registerNotificationActions(): Promise<void> {
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'CRITICAL_ACTIONS',
          actions: [
            { id: 'complete', title: '✅ Done', foreground: true },
            { id: 'snooze15', title: '⏰ 15 min', foreground: false },
          ],
        },
        {
          id: 'IMPORTANT_ACTIONS',
          actions: [
            { id: 'complete', title: '✅ Done', foreground: true },
            { id: 'start', title: '▶️ Start Now', foreground: true },
          ],
        },
        {
          id: 'NORMAL_ACTIONS',
          actions: [
            { id: 'complete', title: '✅ Done', foreground: true },
            { id: 'snooze30', title: '⏰ Later', foreground: false },
          ],
        },
      ],
    });
  } catch (e) {
    console.warn('[Notifications] Could not register action types:', e);
  }
}

// ─── Schedule a Notification ───
export async function scheduleTaskNotification(
  task: Task,
  riskLevel: 'on-track' | 'at-risk' | 'critical',
  confidenceScore: number,
): Promise<void> {
  if (isOnCooldown(task.id)) return;

  const notifId = taskIdToNotifId(task.id);
  const priority = task.priority;

  // Determine notification content based on risk
  let title: string;
  let icon = '';
  let actionTypeId: string;
  let ongoing: boolean;

  if (priority === 'critical' || riskLevel === 'critical') {
    title = `🚨 Urgent: ${task.title}`;
    icon = '🚨';
    actionTypeId = 'CRITICAL_ACTIONS';
    ongoing = true;
  } else if (priority === 'important' || riskLevel === 'at-risk') {
    title = `⚠️ Important: ${task.title}`;
    icon = '⚠️';
    actionTypeId = 'IMPORTANT_ACTIONS';
    ongoing = true;
  } else {
    title = `📋 Reminder: ${task.title}`;
    icon = '📋';
    actionTypeId = 'NORMAL_ACTIONS';
    ongoing = false;
  }

  // Calculate deadline description
  const deadline = new Date(task.deadline);
  const hoursLeft = Math.max(0, (deadline.getTime() - Date.now()) / (1000 * 60 * 60));
  let timeDesc: string;
  if (hoursLeft < 1) {
    timeDesc = `${Math.round(hoursLeft * 60)} minutes left`;
  } else if (hoursLeft < 24) {
    timeDesc = `${Math.round(hoursLeft)} hours left`;
  } else {
    timeDesc = `${Math.round(hoursLeft / 24)} days left`;
  }

  const body = `${timeDesc} · ${confidenceScore}% confidence`;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title,
          body,
          actionTypeId,
          ongoing,
          autoCancel: !ongoing,
          schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
          extra: {
            taskId: task.id,
            taskTitle: task.title,
            riskLevel,
            priority: task.priority,
          },
        },
      ],
    });
    markNotified(task.id);
  } catch (e) {
    console.warn('[Notifications] Failed to schedule:', e);
    // Fallback: web notification
    showWebNotification(title, body);
  }
}

// ─── Snooze a Notification ───
export async function snoozeNotification(
  taskId: string,
  taskTitle: string,
  minutes: number,
  riskLevel: string,
  priority: string,
): Promise<void> {
  const notifId = taskIdToNotifId(taskId);

  try {
    // Cancel current
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });

    // Re-schedule
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
    const isUrgent = priority === 'critical' || priority === 'important' ||
                     riskLevel === 'critical' || riskLevel === 'at-risk';

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: `⏰ Snoozed: ${taskTitle}`,
          body: `Reminder after ${minutes} min snooze`,
          actionTypeId: isUrgent ? 'CRITICAL_ACTIONS' : 'NORMAL_ACTIONS',
          ongoing: isUrgent,
          autoCancel: !isUrgent,
          schedule: { at: snoozeTime, allowWhileIdle: true },
          extra: {
            taskId,
            taskTitle,
            riskLevel,
            priority,
            snoozed: true,
          },
        },
      ],
    });

    // Reset cooldown so the snoozed one fires
    lastNotified.delete(taskId);
  } catch (e) {
    console.warn('[Notifications] Snooze failed:', e);
  }
}

// ─── Cancel a Notification ───
export async function cancelNotification(taskId: string): Promise<void> {
  try {
    const notifId = taskIdToNotifId(taskId);
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
    lastNotified.delete(taskId);
  } catch (e) {
    console.warn('[Notifications] Cancel failed:', e);
  }
}

// ─── Cancel all notifications ───
export async function cancelAllNotifications(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
    lastNotified.clear();
  } catch (e) {
    console.warn('[Notifications] Cancel all failed:', e);
  }
}

// ─── Setup Listeners (call once at app startup) ───
export interface NotificationCallbacks {
  onTaskCompleted: (taskId: string) => void;
  onTaskStarted: (taskId: string) => void;
  onTaskSnoozed: (taskId: string, minutes: number) => void;
  onTaskTapped: (taskId: string) => void;
}

export function setupNotificationListeners(callbacks: NotificationCallbacks): void {
  try {
    LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action: ActionPerformed) => {
        const { actionId, notification } = action;
        const taskId = notification.extra?.taskId;
        const taskTitle = notification.extra?.taskTitle;
        const riskLevel = notification.extra?.riskLevel || 'on-track';
        const priority = notification.extra?.priority || 'normal';

        if (!taskId) return;

        switch (actionId) {
          case 'tap':
            callbacks.onTaskTapped(taskId);
            break;
          case 'complete':
            callbacks.onTaskCompleted(taskId);
            cancelNotification(taskId);
            break;
          case 'start':
            callbacks.onTaskStarted(taskId);
            cancelNotification(taskId);
            break;
          case 'snooze15':
            callbacks.onTaskSnoozed(taskId, 15);
            snoozeNotification(taskId, taskTitle, 15, riskLevel, priority);
            break;
          case 'snooze30':
            callbacks.onTaskSnoozed(taskId, 30);
            snoozeNotification(taskId, taskTitle, 30, riskLevel, priority);
            break;
        }
      },
    );

    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('[Notifications] Received:', notification.title);
    });
  } catch (e) {
    console.warn('[Notifications] Listeners setup failed (web mode?):', e);
  }
}

// ─── Background Notification Loop ───
let loopInterval: ReturnType<typeof setInterval> | null = null;

type StateGetter = () => {
  tasks: Task[];
  assessTask: (task: Task) => { riskLevel: 'on-track' | 'at-risk' | 'critical'; confidenceScore: number };
};

export function startNotificationLoop(getState: StateGetter): void {
  if (loopInterval) return; // Already running

  const check = () => {
    const { tasks, assessTask } = getState();
    const activeTasks = tasks.filter((t) => t.status === 'active');

    for (const task of activeTasks) {
      const { riskLevel, confidenceScore } = assessTask(task);
      const deadline = new Date(task.deadline);
      const hoursLeft = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);

      // Decide whether to fire a notification
      let shouldNotify = false;

      if (riskLevel === 'critical') {
        // Critical: notify aggressively
        shouldNotify = true;
      } else if (riskLevel === 'at-risk' && hoursLeft < 24) {
        // At-risk + less than 24h: notify
        shouldNotify = true;
      } else if (hoursLeft < 1) {
        // Less than 1 hour left: always notify
        shouldNotify = true;
      } else if (hoursLeft < 4 && riskLevel !== 'on-track') {
        // 4 hours left + not on track
        shouldNotify = true;
      }

      if (shouldNotify) {
        scheduleTaskNotification(task, riskLevel, confidenceScore);
      }
    }
  };

  // Run immediately, then every 60 seconds
  check();
  loopInterval = setInterval(check, 60 * 1000);
}

export function stopNotificationLoop(): void {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
}

// ─── Web Fallback ───
function showWebNotification(title: string, body: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.svg' });
  }
}

// ─── Check if running in Capacitor native environment ───
export function isNativeApp(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined' &&
    (window as any)?.Capacitor?.isNativePlatform?.() === true;
}

```

---

## File: `src/main.tsx`

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

```

---

## File: `src/App.tsx`

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  CircleAlert,
  Flame,
  History,
  Home,
  ImagePlus,
  LayoutList,
  MessageCircle,
  Mic,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Trash2,
  UserRound,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  assessTask,
  formatHours,
  generateRescuePlan,
  parseNaturalTask,
  simulateOptions,
  understandTask,
  expandRoutineToBlocks,
  getEffectiveProductiveDays,
  getAllFreeWindows,
  autoScheduleTask,
} from "./engine";
import { demoState, routineBlocksFor, sampleEvents, initialState } from "./seed";
import { loadState, saveState } from "./storage";
import type {
  AppState,
  ChatSession,
  Persona,
  RescuePlan,
  Task,
  UserProfile,
  AvailabilityBlock,
  RoutineBlock,
  CalendarEvent,
  ScheduledBlock,
  PlanBlock,
  CalendarEventType,
} from "./types";
import { isGeminiEnabled, askGeminiCoach, understandTaskWithGemini, analyzeImageWithGemini } from "./gemini";
import { addDays, endOfDay, startOfDay, isSameDay } from "date-fns";
import {
  requestNotificationPermission,
  checkNotificationPermission,
  registerNotificationActions,
  setupNotificationListeners,
  startNotificationLoop,
  stopNotificationLoop,
  cancelNotification,
  cancelAllNotifications,
  scheduleTaskNotification,
  isNativeApp,
} from "./notifications";


type Screen = "home" | "tasks" | "progress" | "profile" | "streak" | "routine" | "calendar";
type Overlay = "add" | "risk" | "simulator" | "rescue" | "notifications" | "chat" | "edit" | null;

const personaCopy = {
  student: { label: "Student", emoji: "🎓", line: "Classes, assignments & exams" },
  professional: { label: "Professional", emoji: "💼", line: "Projects, meetings & reviews" },
  entrepreneur: { label: "Entrepreneur", emoji: "🚀", line: "Clients, launches & growth" },
} as const;

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [screen, setScreen] = useState<Screen>("home");
  const [prevScreen, setPrevScreen] = useState<Screen>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeChatId, setActiveChatId] = useState(state.chatSessions[0]?.id ?? "");
  const [chatStartVoice, setChatStartVoice] = useState(false);

  // Gamification States
  const [lifeShieldActive, setLifeShieldActive] = useState(false);
  const [wagerActive, setWagerActive] = useState(false);
  const [wagerStatus, setWagerStatus] = useState<"idle" | "active" | "won" | "lost">("idle");

  const navigateTo = (next: Screen) => {
    setPrevScreen(screen);
    setScreen(next);
  };

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // ─── Native Notification System ───
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    // Register notification action types at startup
    registerNotificationActions();

    // Set up notification action listeners
    setupNotificationListeners({
      onTaskCompleted: (taskId: string) => {
        // Mark all subtasks as completed
        setState((current) => ({
          ...current,
          tasks: current.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "completed" as const,
                  subtasks: t.subtasks.map((st) => ({ ...st, completed: true })),
                }
              : t
          ),
          profile: { ...current.profile, xp: current.profile.xp + 20 },
        }));
        setToast("✅ Task completed from notification!");
      },
      onTaskStarted: (taskId: string) => {
        setSelectedTaskId(taskId);
        setOverlay("risk");
        setToast("▶️ Let's get started!");
      },
      onTaskSnoozed: (taskId: string, minutes: number) => {
        setToast(`⏰ Snoozed for ${minutes} minutes`);
      },
      onTaskTapped: (taskId: string) => {
        setSelectedTaskId(taskId);
        setOverlay("risk");
      },
    });
  }, []);

  // Start/stop notification loop when Smart Notifications is toggled
  useEffect(() => {
    if (state.profile.smartNotificationsEnabled !== false && state.profile.onboardingComplete) {
      startNotificationLoop(() => ({
        tasks: stateRef.current.tasks,
        assessTask: (task) => assessTask(task, stateRef.current.profile, stateRef.current.busyBlocks, new Date(), stateRef.current.calendarEvents),
      }));
      return () => stopNotificationLoop();
    } else {
      stopNotificationLoop();
    }
  }, [state.profile.smartNotificationsEnabled, state.profile.onboardingComplete]);

  const activeTasks = state.tasks.filter((task) => task.status === "active");
  const selectedTask = state.tasks.find((task) => task.id === selectedTaskId) ?? activeTasks[0];
  const assessment = selectedTask
    ? assessTask(selectedTask, state.profile, state.busyBlocks, new Date(), state.calendarEvents)
    : null;
  const selectedPlan = selectedTask
    ? state.plans.find((plan) => plan.taskId === selectedTask.id)
    : undefined;

  const update = (fn: (draft: AppState) => AppState) => setState((current) => fn(current));
  const openFor = (task: Task, next: Overlay) => {
    setSelectedTaskId(task.id);
    setOverlay(next);
  };

  const startDemo = (persona: Persona) => {
    setState(demoState(persona));
    setScreen("home");
    setWagerActive(false);
    setWagerStatus("idle");
    setLifeShieldActive(false);
    setToast(`${personaCopy[persona].label} demo loaded`);
  };

  const createPlan = useCallback((task: Task) => {
    const existingSchedule: ScheduledBlock[] = state.plans
      .filter(p => p.approvalStatus === "approved" && p.taskId !== task.id)
      .flatMap(p => p.blocks.map(b => ({
        id: b.id,
        taskId: p.taskId,
        taskTitle: state.tasks.find(t => t.id === p.taskId)?.title || "Task",
        subtaskTitle: b.title,
        start: b.start,
        end: b.end,
        minutes: b.minutes,
        difficulty: "medium" as const,
        status: b.status
      })));

    const scheduled = autoScheduleTask(task, state.profile, state.busyBlocks, existingSchedule, new Date());
    
    const blocks: PlanBlock[] = scheduled.map((s) => ({
      id: s.id,
      title: s.subtaskTitle,
      start: s.start,
      end: s.end,
      minutes: s.minutes,
      status: s.status,
    }));

    const unscheduledMinutes = Math.max(0, task.estimatedMinutes - blocks.reduce((sum, b) => sum + b.minutes, 0));

    const plan: RescuePlan = {
      id: Math.random().toString(36).slice(2, 10),
      taskId: task.id,
      blocks,
      scopeDecisions:
        task.estimatedMinutes <= 30
          ? ["Finish this in one sitting", "No project breakdown or extra polish needed"]
          : unscheduledMinutes > 0
          ? [
              `Recover ${formatHours(blocks.reduce((sum, b) => sum + b.minutes, 0))} with adaptive scheduled blocks`,
              `Reduce or defer ${formatHours(unscheduledMinutes)} of non-essential scope (unable to fit in free runway)`,
              "Submit a complete core before optional polish",
            ]
          : ["Protect the core deliverable first", "Keep the final block as review and submission buffer"],
      assumptions: ["15-minute recovery breaks are protected", "No block overlaps a fixed commitment"],
      approvalStatus: "draft",
    };

    update((current) => ({
      ...current,
      plans: [...current.plans.filter((item) => item.taskId !== task.id), plan],
    }));
  }, [state.plans, state.tasks, state.profile, state.busyBlocks]);

  const approvePlan = (plan: RescuePlan) => {
    update((current) => ({
      ...current,
      plans: current.plans.map((item) =>
        item.id === plan.id ? { ...item, approvalStatus: "approved" } : item,
      ),
      profile: { ...current.profile, xp: current.profile.xp + 15 },
    }));
    setToast("Plan approved — focus blocks protected");
  };

  const saveTask = (updatedTask: Task) => {
    update((current) => {
      const updatedTasks = current.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));

      const existingPlan = current.plans.find((p) => p.taskId === updatedTask.id);
      let updatedPlans = current.plans;
      
      if (existingPlan) {
        const existingSchedule: ScheduledBlock[] = current.plans
          .filter(p => p.approvalStatus === "approved" && p.taskId !== updatedTask.id)
          .flatMap(p => p.blocks.map(b => ({
            id: b.id,
            taskId: p.taskId,
            taskTitle: updatedTasks.find(t => t.id === p.taskId)?.title || "Task",
            subtaskTitle: b.title,
            start: b.start,
            end: b.end,
            minutes: b.minutes,
            difficulty: "medium" as const,
            status: b.status
          })));

        const scheduled = autoScheduleTask(updatedTask, current.profile, current.busyBlocks, existingSchedule, new Date());
        
        const blocks: PlanBlock[] = scheduled.map((s) => ({
          id: s.id,
          title: s.subtaskTitle,
          start: s.start,
          end: s.end,
          minutes: s.minutes,
          status: s.status,
        }));

        const unscheduledMinutes = Math.max(0, updatedTask.estimatedMinutes - blocks.reduce((sum, b) => sum + b.minutes, 0));

        const updatedPlan: RescuePlan = {
          ...existingPlan,
          blocks,
          scopeDecisions:
            updatedTask.estimatedMinutes <= 30
              ? ["Finish this in one sitting", "No project breakdown or extra polish needed"]
              : unscheduledMinutes > 0
              ? [
                  `Recover ${formatHours(blocks.reduce((sum, b) => sum + b.minutes, 0))} with adaptive scheduled blocks`,
                  `Reduce or defer ${formatHours(unscheduledMinutes)} of non-essential scope (unable to fit in free runway)`,
                  "Submit a complete core before optional polish",
                ]
              : ["Protect the core deliverable first", "Keep the final block as review and submission buffer"],
        };

        updatedPlans = current.plans.map((p) => (p.taskId === updatedTask.id ? updatedPlan : p));
      }

      return {
        ...current,
        tasks: updatedTasks,
        plans: updatedPlans
      };
    });

    setToast("Task details updated");
    setOverlay("risk");
  };

  const toggleTaskCompletion = (taskId: string) => {
    update((current) => {
      const task = current.tasks.find((t) => t.id === taskId);
      if (!task) return current;

      const isNowCompleted = task.status !== "completed";
      const updatedStatus = isNowCompleted ? "completed" : "active";

      const updatedSubtasks = task.subtasks.map((st) => ({
        ...st,
        completed: isNowCompleted ? true : st.completed
      }));

      const updatedTasks = current.tasks.map((t) =>
        t.id === taskId ? { ...t, status: updatedStatus, subtasks: updatedSubtasks } : t
      );

      let updatedPlans = current.plans;
      if (isNowCompleted) {
        updatedPlans = current.plans.map((p) =>
          p.taskId === taskId ? { ...p, blocks: p.blocks.map(b => ({ ...b, status: "completed" as const })) } : p
        );
      } else {
        updatedPlans = current.plans.map((p) =>
          p.taskId === taskId ? { ...p, blocks: p.blocks.map(b => ({ ...b, status: "planned" as const })) } : p
        );
      }

      // Dynamic Streak History updating
      const hasToday = current.streakHistory.some(d => isSameDay(new Date(d.date), new Date()));
      let updatedStreakHistory = current.streakHistory;
      
      if (hasToday) {
        updatedStreakHistory = current.streakHistory.map((day) => {
          if (isSameDay(new Date(day.date), new Date())) {
            const newCompleted = isNowCompleted ? day.completed + 1 : Math.max(0, day.completed - 1);
            return {
              ...day,
              completed: newCompleted,
              planned: Math.max(day.planned, 1),
              status: newCompleted > 0 ? ("success" as const) : ("missed" as const)
            };
          }
          return day;
        });
      } else {
        const newDay = {
          date: new Date().toISOString(),
          completed: isNowCompleted ? 1 : 0,
          planned: 1,
          status: isNowCompleted ? ("success" as const) : ("missed" as const)
        };
        updatedStreakHistory = [...current.streakHistory, newDay];
      }

      // Dynamic Streak Count updating
      const wasSuccessBefore = current.streakHistory.find(d => isSameDay(new Date(d.date), new Date()))?.status === "success";
      const isSuccessNow = updatedStreakHistory.find(d => isSameDay(new Date(d.date), new Date()))?.status === "success";
      let updatedStreakCount = current.profile.streak;
      if (!wasSuccessBefore && isSuccessNow) {
        updatedStreakCount = current.profile.streak + 1;
      } else if (wasSuccessBefore && !isSuccessNow) {
        updatedStreakCount = Math.max(0, current.profile.streak - 1);
      }

      // Dynamic Reliability updating
      const nonRestDays = updatedStreakHistory.filter(d => d.status !== "rest");
      const successDays = nonRestDays.filter(d => d.status === "success");
      const updatedReliability = nonRestDays.length > 0 
        ? Math.round((successDays.length / nonRestDays.length) * 100)
        : current.profile.reliability;

      const xpChange = isNowCompleted ? 50 : -50;

      return {
        ...current,
        tasks: updatedTasks,
        plans: updatedPlans,
        streakHistory: updatedStreakHistory,
        profile: { 
          ...current.profile, 
          xp: Math.max(0, current.profile.xp + xpChange),
          streak: updatedStreakCount,
          reliability: updatedReliability
        }
      };
    });

    const task = state.tasks.find((t) => t.id === taskId);
    const isNowCompleted = task?.status !== "completed";
    setToast(isNowCompleted ? "Task archived & focus time freed 🎉" : "Task restored to active runway");
    setOverlay(null);
  };

  const completeSubtask = (taskId: string, subtaskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    const subtask = task?.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return;

    const isCompleting = !subtask.completed;
    let xpGain = 0;
    let wagerWon = false;

    if (isCompleting) {
      xpGain = 20;
      if (wagerActive && wagerStatus === "active") {
        xpGain += 30;
        wagerWon = true;
      }
    } else {
      xpGain = -20;
    }

    let allDoneNow = false;
    update((current) => {
      const taskToUpdate = current.tasks.find((t) => t.id === taskId);
      if (!taskToUpdate) return current;

      const updatedSubtasks = taskToUpdate.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, completed: isCompleting } : st
      );

      allDoneNow = updatedSubtasks.every((st) => st.completed);
      const isNowCompleted = allDoneNow && taskToUpdate.status === "active";
      const updatedStatus = isNowCompleted ? "completed" as const : taskToUpdate.status;

      let updatedPlans = current.plans;
      if (isNowCompleted) {
        updatedPlans = current.plans.map((p) =>
          p.taskId === taskId ? { ...p, blocks: p.blocks.map(b => ({ ...b, status: "completed" as const })) } : p
        );
      }

      const finalTasks = current.tasks.map((t) =>
        t.id === taskId ? { ...t, subtasks: updatedSubtasks, status: updatedStatus } : t
      );

      // Dynamic Streak History updating
      const hasToday = current.streakHistory.some(d => isSameDay(new Date(d.date), new Date()));
      let updatedStreakHistory = current.streakHistory;
      
      if (hasToday) {
        updatedStreakHistory = current.streakHistory.map((day) => {
          if (isSameDay(new Date(day.date), new Date())) {
            const newCompleted = isCompleting ? day.completed + 1 : Math.max(0, day.completed - 1);
            return {
              ...day,
              completed: newCompleted,
              planned: Math.max(day.planned, 1),
              status: newCompleted > 0 ? ("success" as const) : ("missed" as const)
            };
          }
          return day;
        });
      } else {
        const newDay = {
          date: new Date().toISOString(),
          completed: isCompleting ? 1 : 0,
          planned: 1,
          status: isCompleting ? ("success" as const) : ("missed" as const)
        };
        updatedStreakHistory = [...current.streakHistory, newDay];
      }

      // Dynamic Streak Count updating
      const wasSuccessBefore = current.streakHistory.find(d => isSameDay(new Date(d.date), new Date()))?.status === "success";
      const isSuccessNow = updatedStreakHistory.find(d => isSameDay(new Date(d.date), new Date()))?.status === "success";
      let updatedStreakCount = current.profile.streak;
      if (!wasSuccessBefore && isSuccessNow) {
        updatedStreakCount = current.profile.streak + 1;
      } else if (wasSuccessBefore && !isSuccessNow) {
        updatedStreakCount = Math.max(0, current.profile.streak - 1);
      }

      // Dynamic Reliability updating
      const nonRestDays = updatedStreakHistory.filter(d => d.status !== "rest");
      const successDays = nonRestDays.filter(d => d.status === "success");
      const updatedReliability = nonRestDays.length > 0 
        ? Math.round((successDays.length / nonRestDays.length) * 100)
        : current.profile.reliability;

      return {
        ...current,
        tasks: finalTasks,
        plans: updatedPlans,
        streakHistory: updatedStreakHistory,
        profile: { 
          ...current.profile, 
          xp: Math.max(0, current.profile.xp + xpGain + (isNowCompleted ? 30 : 0)),
          streak: updatedStreakCount,
          reliability: updatedReliability
        }
      };
    });

    if (isCompleting) {
      if (allDoneNow) {
        setToast("Task complete! +30 XP Milestone Bonus! 🎓");
        setOverlay(null);
      } else if (wagerWon) {
        setWagerStatus("won");
        setWagerActive(false);
        setToast("+50 XP — Streak Wager Won! 🎉");
      } else {
        setToast("+20 XP — momentum restored");
      }
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 1500);
    } else {
      setToast("-20 XP — milestone undone");
    }
  };

  const updateProfile = (fn: (profile: UserProfile) => UserProfile) => {
    update((current) => ({
      ...current,
      profile: fn(current.profile)
    }));
  };

  const hasCriticalRisk = useMemo(() => {
    return activeTasks.some((task) => {
      const risk = assessTask(task, state.profile, state.busyBlocks, new Date(), state.calendarEvents);
      return risk.riskLevel === "critical";
    });
  }, [activeTasks, state.profile, state.busyBlocks, state.calendarEvents]);

  if (!state.profile.onboardingComplete) {
    return (
      <div className="app-shell">
        <main className="phone-frame onboarding-frame">
          <Onboarding
            onFinish={(profile, routineBlocks, calendarEvents, busyBlocks) =>
              setState({
                ...state,
                profile,
                routineBlocks,
                calendarEvents,
                busyBlocks,
              })
            }
            onDemo={startDemo}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className={`phone-frame ${hasCriticalRisk ? "red-alert" : ""}`}>
        {hasCriticalRisk && (
          <div className="red-alert-banner">
            <span /> 🚨 RED ALERT: DEADLINE CRITICAL 🚨
          </div>
        )}
        <header className="topbar">
          <div className="brand-mark"><Zap size={18} fill="currentColor" /></div>
          <span className="brand-name">ClutchAI</span>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Calendar" onClick={() => navigateTo("calendar")} style={{ marginRight: "8px" }}>
              <CalendarDays size={19} />
            </button>
            <button className="icon-btn" aria-label="Notifications" onClick={() => setOverlay("notifications")}>
              <Bell size={19} />
              {state.profile.smartNotificationsEnabled !== false && activeTasks.some((task) => {
                const risk = assessTask(task, state.profile, state.busyBlocks, new Date(), state.calendarEvents);
                return risk.riskLevel === "critical" || risk.riskLevel === "at-risk";
              }) && <span className="notification-dot" />}
            </button>
            <button className="avatar" onClick={() => setScreen("profile")}>{state.profile.name.charAt(0)}</button>
          </div>
        </header>

        <div className="screen-content">
          {screen === "home" && (
            <HomeScreen
              state={state}
              tasks={activeTasks}
              onOpen={openFor}
              onAdd={() => setOverlay("add")}
              onComplete={completeSubtask}
              onStreak={() => navigateTo("streak")}
              onRoutine={() => navigateTo("routine")}
              lifeShieldActive={lifeShieldActive}
            />
          )}
          {screen === "tasks" && <TasksScreen state={state} onOpen={openFor} onAdd={() => setOverlay("add")} />}
          {screen === "progress" && (
            <ProgressScreen 
              state={state} 
              lifeShieldActive={lifeShieldActive}
              setLifeShieldActive={setLifeShieldActive}
              wagerActive={wagerActive}
              wagerStatus={wagerStatus}
              setWagerStatus={setWagerStatus}
              setWagerActive={setWagerActive}
              updateProfile={updateProfile}
              onStreak={() => navigateTo("streak")}
            />
          )}
          {screen === "profile" && <ProfileScreen state={state} onDemo={startDemo} onReset={() => setState(initialState())}
            onSave={(profile) => update((current) => ({ ...current, profile }))} onRoutine={() => navigateTo("routine")} />}
          {screen === "streak" && <StreakScreen state={state} onBack={() => setScreen(prevScreen)} />}
          {screen === "routine" && (
            <RoutineScreen
              state={state}
              onBack={() => setScreen(prevScreen)}
              onSave={(routineBlocks, profile, busyBlocks) => {
                update((current) => ({ ...current, routineBlocks, profile, busyBlocks }));
                setToast("Routine saved!");
              }}
            />
          )}
          {screen === "calendar" && (
            <CalendarScreen
              state={state}
              onBack={() => setScreen(prevScreen)}
              onSave={(calendarEvents, busyBlocks) => {
                update((current) => ({ ...current, calendarEvents, busyBlocks }));
                setToast("Calendar events saved!");
              }}
            />
          )}
        </div>

        <nav className="bottom-nav">
          <NavButton icon={Home} label="Today" active={screen === "home"} onClick={() => navigateTo("home")} />
          <NavButton icon={LayoutList} label="Tasks" active={screen === "tasks"} onClick={() => navigateTo("tasks")} />
          <button className="add-main" aria-label="Add a task" onClick={() => setOverlay("add")}><Plus size={26} /></button>
          <NavButton icon={Trophy} label="Progress" active={screen === "progress"} onClick={() => navigateTo("progress")} />
          <NavButton icon={UserRound} label="You" active={screen === "profile"} onClick={() => navigateTo("profile")} />
        </nav>

        {showConfetti && <Confetti />}
        {overlay === "add" && <AddTaskSheet persona={state.profile.persona} onClose={() => setOverlay(null)} onAdd={(task) => {
          update((current) => ({ ...current, tasks: [task, ...current.tasks] }));
          setSelectedTaskId(task.id);
          setOverlay("risk");
        }} />}
        {overlay === "risk" && selectedTask && assessment && (
          <RiskSheet task={selectedTask} assessment={assessment} onClose={() => setOverlay(null)}
            onSimulate={() => setOverlay("simulator")} onRescue={() => { createPlan(selectedTask); setOverlay("rescue"); }}
            onComplete={completeSubtask} onEdit={() => setOverlay("edit")} onToggleComplete={() => toggleTaskCompletion(selectedTask.id)} />
        )}
        {overlay === "edit" && selectedTask && (
          <EditTaskSheet task={selectedTask} onClose={() => setOverlay("risk")} onSave={saveTask} />
        )}
        {overlay === "simulator" && selectedTask && assessment && (
          <SimulatorSheet task={selectedTask} assessment={assessment} onClose={() => setOverlay("risk")} />
        )}
        {overlay === "rescue" && selectedTask && (
          <RescueSheet task={selectedTask} plan={selectedPlan} onClose={() => setOverlay(null)}
            onGenerate={createPlan} onApprove={approvePlan} onMissed={() => {
              createPlan(selectedTask);
              setToast("Plan rebuilt around the missed block");
            }} />
        )}
        {overlay === "notifications" && (
          <NotificationsSheet 
            state={state} 
            onClose={() => setOverlay(null)}
            onOpenTask={(task) => { setSelectedTaskId(task.id); setOverlay("risk"); }}
            enabled={state.profile.smartNotificationsEnabled !== false}
            onToggle={async (val) => {
              if (val) {
                const granted = await requestNotificationPermission();
                if (!granted) {
                  setToast("⚠️ Notification permission denied — please enable in Settings");
                  return;
                }
                startNotificationLoop(() => ({
                  tasks: stateRef.current.tasks,
                  assessTask: (task) => assessTask(task, stateRef.current.profile, stateRef.current.busyBlocks, new Date(), stateRef.current.calendarEvents),
                }));
              } else {
                stopNotificationLoop();
                cancelAllNotifications();
              }
              updateProfile((prof) => ({ ...prof, smartNotificationsEnabled: val }));
            }}
            setToast={setToast}
          />
        )}
        {overlay === "chat" && <ChatSheet state={state} activeId={activeChatId} onActive={setActiveChatId}
          onClose={() => setOverlay(null)} onChange={(chatSessions) => update((current) => ({ ...current, chatSessions }))}
          onUpdateState={update} startInVoiceMode={chatStartVoice} onClearStartInVoiceMode={() => setChatStartVoice(false)} />}
        <button className="chat-fab" aria-label="Open AI coach" onClick={() => setOverlay("chat")}><MessageCircle size={21} /></button>
        {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
      </main>
    </div>
  );
}

function CustomDropdown({ value, options, onChange }: { value: number, options: { value: number, label: string }[], onChange: (val: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = options.find(o => o.value === value)?.label || String(value).padStart(2, "0");

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "6px 6px",
          borderRadius: "8px",
          border: "1px solid var(--line)",
          background: "#f8f9fa",
          color: "var(--ink)",
          fontSize: "12px",
          fontWeight: "600",
          outline: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          minWidth: "40px",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
        }}
      >
        <span>{currentLabel}</span>
        <ChevronDown size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
      </button>
      {isOpen && (
        <div
          className="no-scrollbar"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 1000,
            background: "white",
            border: "1px solid var(--line)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            maxHeight: "130px",
            overflowY: "auto",
            minWidth: "54px",
            display: "flex",
            flexDirection: "column",
            padding: "4px"
          }}
        >
          {options.map(opt => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: "6px 8px",
                  border: "none",
                  background: isSelected ? "var(--purple-light)" : "transparent",
                  color: isSelected ? "var(--purple)" : "var(--ink)",
                  fontSize: "12px",
                  fontWeight: isSelected ? "bold" : "normal",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: "5px",
                  whiteSpace: "nowrap",
                  transition: "background 0.15s, color 0.15s"
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#f1f3f5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TimeSelectPicker({ label, value, onChange }: { label?: string, value: string, onChange: (val: string) => void }) {
  const [hourStr, minStr] = value.split(":");
  const hourVal = parseInt(hourStr);
  const minVal = parseInt(minStr);
  
  const ampm = hourVal >= 12 ? "PM" : "AM";
  const displayHour = hourVal % 12 || 12;
  
  const handleHourChange = (newHour: number) => {
    let finalHour = newHour;
    if (ampm === "PM" && newHour < 12) finalHour = newHour + 12;
    if (ampm === "AM" && newHour === 12) finalHour = 0;
    const finalHourStr = String(finalHour).padStart(2, "0");
    onChange(`${finalHourStr}:${minStr}`);
  };

  const handleMinChange = (newMin: number) => {
    const finalMinStr = String(newMin).padStart(2, "0");
    onChange(`${hourStr}:${finalMinStr}`);
  };

  const handleAmpmChange = (newAmpm: "AM" | "PM") => {
    let finalHour = hourVal;
    if (newAmpm === "PM" && hourVal < 12) finalHour = hourVal + 12;
    if (newAmpm === "AM" && hourVal >= 12) finalHour = hourVal - 12;
    const finalHourStr = String(finalHour).padStart(2, "0");
    onChange(`${finalHourStr}:${minStr}`);
  };

  const hourOptions = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    return { value: h, label: String(h).padStart(2, "0") };
  });

  const minOptions = Array.from({ length: 12 }, (_, i) => {
    const m = i * 5;
    return { value: m, label: String(m).padStart(2, "0") };
  });

  if (!label) {
    return (
      <div style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
        <CustomDropdown value={displayHour} options={hourOptions} onChange={handleHourChange} />
        <span style={{ color: "var(--muted)", fontWeight: "bold" }}>:</span>
        <CustomDropdown value={minVal} options={minOptions} onChange={handleMinChange} />
        <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "#f1f3f5", marginLeft: "2px" }}>
          {(["AM", "PM"] as const).map(a => (
            <button
              key={a}
              type="button"
              onClick={() => handleAmpmChange(a)}
              style={{
                padding: "5px 6px",
                border: "none",
                background: ampm === a ? "var(--purple)" : "transparent",
                color: ampm === a ? "white" : "var(--muted)",
                fontSize: "10px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", width: "100%" }}>
      <span style={{ fontSize: "12px", color: "var(--ink)", fontWeight: "600" }}>{label}</span>
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <CustomDropdown value={displayHour} options={hourOptions} onChange={handleHourChange} />
        <span style={{ color: "var(--muted)", fontWeight: "bold" }}>:</span>
        <CustomDropdown value={minVal} options={minOptions} onChange={handleMinChange} />
        <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "#f1f3f5", marginLeft: "4px" }}>
          {(["AM", "PM"] as const).map(a => (
            <button
              key={a}
              type="button"
              onClick={() => handleAmpmChange(a)}
              style={{
                padding: "6px 8px",
                border: "none",
                background: ampm === a ? "var(--purple)" : "transparent",
                color: ampm === a ? "white" : "var(--muted)",
                fontSize: "10px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Onboarding({ onFinish, onDemo }: {
  onFinish: (
    profile: AppState["profile"],
    routineBlocks: RoutineBlock[],
    calendarEvents: CalendarEvent[],
    busyBlocks: AvailabilityBlock[],
  ) => void;
  onDemo: (persona: Persona) => void;
}) {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<Persona>("student");
  const [name, setName] = useState("");
  const [focus, setFocus] = useState<"morning" | "afternoon" | "night">("night");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [weeklyHolidays, setWeeklyHolidays] = useState<number[]>([0]);
  const [routineBlocks, setRoutineBlocks] = useState<RoutineBlock[]>(() => routineBlocksFor("student"));

  const handlePersonaChange = (p: Persona) => {
    setPersona(p);
    setRoutineBlocks(routineBlocksFor(p));
  };

  const addRoutineBlock = (block: Omit<RoutineBlock, "id">) => {
    const newBlock: RoutineBlock = {
      ...block,
      id: crypto.randomUUID()
    };
    setRoutineBlocks(curr => [...curr, newBlock]);
  };

  const removeRoutineBlock = (id: string) => {
    setRoutineBlocks(curr => curr.filter(b => b.id !== id));
  };

  const updateBlockDays = (id: string, day: number) => {
    setRoutineBlocks(curr => curr.map(b => {
      if (b.id !== id) return b;
      const days = b.daysOfWeek.includes(day)
        ? b.daysOfWeek.filter(d => d !== day)
        : [...b.daysOfWeek, day].sort();
      return { ...b, daysOfWeek: days };
    }));
  };

  const updateBlockField = (id: string, field: keyof RoutineBlock, value: any) => {
    setRoutineBlocks(curr => curr.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const daysOfWeekLetters = ["Su", "M", "T", "W", "Th", "F", "Sa"];

  const templates = [
    { label: "🎓 College", title: "College Lectures", startTime: "08:00", endTime: "16:00", days: [1,2,3,4,5], category: "school" as const, energy: "medium" as const, isFixed: true },
    { label: "💼 Office", title: "Office Work", startTime: "09:00", endTime: "17:00", days: [1,2,3,4,5], category: "work" as const, energy: "medium" as const, isFixed: true },
    { label: "🏋️ Gym", title: "Gym Workout", startTime: "07:00", endTime: "08:30", days: [1,3,5], category: "gym" as const, energy: "high" as const, isFixed: false },
    { label: "📚 Tuition", title: "Tuition Classes", startTime: "17:00", endTime: "18:30", days: [1,3,5], category: "tuition" as const, energy: "high" as const, isFixed: true },
    { label: "🚗 Commute", title: "Daily Commute", startTime: "08:00", endTime: "09:00", days: [1,2,3,4,5], category: "commute" as const, energy: "low" as const, isFixed: true }
  ];

  return (
    <div className="onboarding no-scrollbar">
      <div className="onboarding-orb orb-one" />
      <div className="onboarding-orb orb-two" />
      <div className="onboarding-card">
        <div className="onboarding-logo"><Zap size={29} fill="currentColor" /></div>
        {step === 0 ? (
          <>
            <span className="eyebrow light">MEET YOUR DEADLINE COPILOT</span>
            <h1>Life gets messy.<br /><em>Your deadlines don’t have to.</em></h1>
            <p>ClutchAI finds the time you actually have and turns deadline panic into a plan you can finish.</p>
            <button className="primary-button warm" onClick={() => setStep(1)}>Build my life map <ArrowRight size={18} /></button>
            <button className="text-button light-text" onClick={() => onDemo("student")}><Play size={15} fill="currentColor" /> Jump into the 3-minute demo</button>
          </>
        ) : step === 1 ? (
          <>
            <span className="eyebrow light">STEP 1 OF 5</span>
            <h2>What should we call you & what's your focus?</h2>
            
            <div style={{ textAlign: "left", marginBottom: "14px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600", display: "block", marginBottom: "6px" }}>What should Kavi call you?</span>
              <input className="onboarding-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your first name" />
            </div>
            
            <div style={{ textAlign: "left", marginBottom: "14px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600", display: "block", marginBottom: "8px" }}>What is your primary weekly focus?</span>
              <div className="persona-grid">
                {(Object.keys(personaCopy) as Persona[]).map((value) => (
                  <button key={value} className={`persona-card ${persona === value ? "selected" : ""}`} onClick={() => handlePersonaChange(value)}>
                    <span>{personaCopy[value].emoji}</span>
                    <strong>{personaCopy[value].label}</strong>
                    <small>{personaCopy[value].line}</small>
                    {persona === value && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>
            <button className="primary-button warm" onClick={() => setStep(2)}>Continue <ArrowRight size={18} /></button>
          </>
        ) : step === 2 ? (
          <>
            <span className="eyebrow light">STEP 2 OF 5</span>
            <h2>When does your day start and end?</h2>
            <p className="page-copy" style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "16px" }}>
              We need to know your waking hours to model your capacity honestly.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <TimeSelectPicker label="Wake Time" value={wakeTime} onChange={setWakeTime} />
              <TimeSelectPicker label="Sleep Time" value={sleepTime} onChange={setSleepTime} />
            </div>
            
            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button className="secondary-button" style={{ flex: 1, border: "1px solid var(--line)", color: "var(--ink)", background: "white" }} onClick={() => setStep(1)}>Back</button>
              <button className="primary-button warm" style={{ flex: 2, margin: 0 }} onClick={() => setStep(3)}>Continue <ArrowRight size={18} /></button>
            </div>
          </>
        ) : step === 3 ? (
          <>
            <span className="eyebrow light">STEP 3 OF 5</span>
            <h2>Your Daily Commitments</h2>
            <p className="page-copy" style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "12px" }}>
              Configure your classes, office hours, gym sessions, and travel time. We'll protect these hours.
            </p>

            {/* Quick Templates */}
            <div style={{ marginBottom: "12px", textAlign: "left" }}>
              <span style={{ fontSize: "10px", color: "var(--muted)", display: "block", marginBottom: "6px", fontWeight: "700" }}>QUICK-ADD COMMITMENTS</span>
              <div className="no-scrollbar" style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
                {templates.map(t => (
                  <button
                    key={t.label}
                    type="button"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "#f1f3f5",
                      color: "var(--ink)",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                    onClick={() => addRoutineBlock({
                      title: t.title,
                      startTime: t.startTime,
                      endTime: t.endTime,
                      daysOfWeek: t.days,
                      category: t.category,
                      isFixed: t.isFixed,
                      energy: t.energy
                    })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Commitments List */}
            <div className="no-scrollbar" style={{ maxHeight: "230px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px", paddingRight: "4px" }}>
              {routineBlocks.map(b => (
                <div key={b.id} style={{ border: "1px solid var(--line)", borderRadius: "12px", padding: "12px", background: "#f8f9fa", position: "relative", textAlign: "left" }}>
                  <button
                    type="button"
                    aria-label="Delete block"
                    onClick={() => removeRoutineBlock(b.id)}
                    style={{ position: "absolute", right: "10px", top: "10px", border: "none", background: "transparent", cursor: "pointer", color: "var(--red)" }}
                  >
                    <Trash2 size={15} />
                  </button>

                  <input
                    style={{ fontWeight: "600", fontSize: "13px", border: "none", borderBottom: "1px solid var(--line)", background: "transparent", width: "80%", color: "var(--ink)", paddingBottom: "2px", outline: "none", marginBottom: "10px" }}
                    value={b.title}
                    onChange={e => updateBlockField(b.id, "title", e.target.value)}
                    placeholder="Activity Title"
                  />

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                    <TimeSelectPicker label="Starts" value={b.startTime} onChange={val => updateBlockField(b.id, "startTime", val)} />
                    <TimeSelectPicker label="Ends" value={b.endTime} onChange={val => updateBlockField(b.id, "endTime", val)} />
                  </div>

                  {/* Day selector chips */}
                  <div style={{ display: "flex", gap: "4px" }}>
                    {daysOfWeekLetters.map((dayName, idx) => {
                      const isActive = b.daysOfWeek.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: isActive ? "none" : "1px solid var(--line)",
                            background: isActive ? "var(--purple-light)" : "white",
                            color: isActive ? "var(--purple)" : "var(--muted)",
                            fontSize: "10px",
                            fontWeight: "bold",
                            cursor: "pointer"
                          }}
                          onClick={() => updateBlockDays(b.id, idx)}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {routineBlocks.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--muted)", fontSize: "11px" }}>
                  No routine commitments added yet. Use templates above or add custom ones.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1.5px dashed var(--line)",
                  background: "transparent",
                  color: "var(--purple)",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
                onClick={() => addRoutineBlock({
                  title: "Custom activity",
                  startTime: "09:00",
                  endTime: "10:00",
                  daysOfWeek: [1,2,3,4,5],
                  category: "other",
                  isFixed: true,
                  energy: "medium"
                })}
              >
                + Add Custom Commitment
              </button>
            </div>
            
            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button className="secondary-button" style={{ flex: 1, border: "1px solid var(--line)", color: "var(--ink)", background: "white" }} onClick={() => setStep(2)}>Back</button>
              <button className="primary-button warm" style={{ flex: 2, margin: 0 }} onClick={() => setStep(4)}>Continue <ArrowRight size={18} /></button>
            </div>
          </>
        ) : step === 4 ? (
          <>
            <span className="eyebrow light">STEP 4 OF 5</span>
            <h2>When do you do your best work?</h2>
            <p className="page-copy" style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "16px" }}>
              Choose your peak energy time when your mind is fresh and cool. Kavi will schedule your tasks here.
            </p>
            <div className="focus-options">
              {(["morning", "afternoon", "night"] as const).map((value) => (
                <button className={focus === value ? "selected" : ""} onClick={() => setFocus(value)} key={value}>
                  <span>{value === "morning" ? "☀️" : value === "afternoon" ? "🌤️" : "🌙"}</span>
                  {value}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button className="secondary-button" style={{ flex: 1, border: "1px solid var(--line)", color: "var(--ink)", background: "white" }} onClick={() => setStep(3)}>Back</button>
              <button className="primary-button warm" style={{ flex: 2, margin: 0 }} onClick={() => setStep(5)}>Continue <ArrowRight size={18} /></button>
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow light">STEP 5 OF 5</span>
            <h2>Which days are your weekly holidays?</h2>
            <p className="page-copy" style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "14px" }}>
              Select off-days when you want to rest. Tasks will only schedule on workdays.
            </p>
            
            <div style={{ marginBottom: "16px", textAlign: "left" }}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName, idx) => {
                  const isOff = weeklyHolidays.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: isOff ? "none" : "1px solid var(--line)",
                        background: isOff ? "var(--purple-light)" : "white",
                        color: isOff ? "var(--purple)" : "var(--muted)",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontSize: "11px",
                        transition: "all 0.2s"
                      }}
                      onClick={() => {
                        if (isOff) {
                          setWeeklyHolidays(weeklyHolidays.filter(d => d !== idx));
                        } else {
                          setWeeklyHolidays([...weeklyHolidays, idx]);
                        }
                      }}
                    >
                      {dayName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button className="secondary-button" style={{ flex: 1, border: "1px solid var(--line)", color: "var(--ink)", background: "white" }} onClick={() => setStep(4)}>Back</button>
              <button className="primary-button warm" style={{ flex: 2, margin: 0 }} onClick={() => {
                const calendarEvents = sampleEvents(persona);
                const profile: UserProfile = {
                  name: name.trim() || "Alex",
                  persona,
                  wakeTime,
                  sleepTime,
                  focusPreference: focus,
                  productivityPeak: focus,
                  weeklyHolidays,
                  holidayMode: "rest",
                  reliability: 100,
                  xp: 0,
                  streak: 0,
                  onboardingComplete: true
                };
                const busyBlocks = expandRoutineToBlocks(routineBlocks, calendarEvents, profile, new Date(), addDays(new Date(), 21));
                onFinish(profile, routineBlocks, calendarEvents, busyBlocks);
              }}>Enter ClutchAI <Sparkles size={18} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HomeScreen({ state, tasks, onOpen, onAdd, onComplete, onStreak, onRoutine, lifeShieldActive }: {
  state: AppState;
  tasks: Task[];
  onOpen: (task: Task, overlay: Overlay) => void;
  onAdd: () => void;
  onComplete: (taskId: string, subtaskId: string) => void;
  onStreak: () => void;
  onRoutine: () => void;
  lifeShieldActive: boolean;
}) {
  const urgent = tasks
    .map((task) => ({ task, assessment: assessTask(task, state.profile, state.busyBlocks, new Date(), state.calendarEvents) }))
    .sort((a, b) => a.assessment.confidenceScore - b.assessment.confidenceScore)[0];

  const mascotInfo = useMemo(() => {
    const criticalTask = tasks.find((t) => assessTask(t, state.profile, state.busyBlocks, new Date(), state.calendarEvents).riskLevel === "critical");
    if (criticalTask) {
      return {
        emoji: "🥵",
        mood: "panicked",
        message: `🚨 Oh no, ${state.profile.name}! "${criticalTask.title}" has critical deadline risk! We have to rescue this task now!`,
      };
    }
    
    const atRiskTask = tasks.find((t) => assessTask(t, state.profile, state.busyBlocks, new Date(), state.calendarEvents).riskLevel === "at-risk");
    if (atRiskTask) {
      return {
        emoji: "🧐",
        mood: "concerned",
        message: `🧐 Runway shrinking, ${state.profile.name}! "${atRiskTask.title}" is sliding. Let's schedule a focus block now.`,
      };
    }
    
    if (tasks.length === 0) {
      return {
        emoji: "😎",
        mood: "happy",
        message: `⚡ High five, ${state.profile.name}! Your runway is clear. Ready to conquer some new milestones?`,
      };
    }
    
    return {
      emoji: "🚀",
      mood: "encouraging",
      message: `🚀 Looking solid, ${state.profile.name}! All deadlines are on track. Keep up the momentum!`,
    };
  }, [tasks, state.profile, state.busyBlocks, state.calendarEvents]);

  // Today's commitments & tasks timeline
  const todayTimeline = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    
    const commitsToday = state.busyBlocks.filter(b => b.start.startsWith(todayStr));
    
    const tasksToday = state.plans
      .filter(p => p.approvalStatus === "approved")
      .flatMap(p => p.blocks.map(b => ({
        ...b,
        taskTitle: state.tasks.find(t => t.id === p.taskId)?.title || "Task"
      })))
      .filter(b => b.start.startsWith(todayStr));

    const items = [
      ...commitsToday.map(c => ({
        id: c.id,
        title: c.title,
        start: new Date(c.start),
        end: new Date(c.end),
        type: "commitment" as const,
        category: c.source
      })),
      ...tasksToday.map(t => ({
        id: t.id,
        title: `${t.taskTitle} - ${t.title}`,
        start: new Date(t.start),
        end: new Date(t.end),
        type: "task" as const,
        category: "manual" as const
      }))
    ];
    
    return items.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [state.busyBlocks, state.plans, state.tasks]);

  const todayFreeTimeSuggestion = useMemo(() => {
    if (tasks.length === 0) return null;
    const todayEnd = endOfDay(new Date());
    const freeToday = getAllFreeWindows(todayEnd, state.profile, state.busyBlocks, new Date());
    const totalFreeMins = freeToday.reduce((sum, w) => sum + w.minutes, 0);
    if (totalFreeMins >= 15 && freeToday[0]) {
      return {
        minutes: totalFreeMins,
        bestSlot: format(freeToday[0].start, "h:mm a"),
        taskTitle: tasks[0].title
      };
    }
    return null;
  }, [tasks, state.profile, state.busyBlocks]);

  return (
    <>
      <section className="welcome-row">
        <div><span className="muted">Good {greeting()}, {state.profile.name}</span><h1>What needs saving?</h1></div>
        <button className="streak-pill" onClick={onStreak}>
          {lifeShieldActive && <ShieldCheck size={14} style={{ marginRight: "4px", color: "#6a54cf" }} />}
          <Flame size={16} fill="currentColor" /> {state.profile.streak}
        </button>
      </section>

      {/* Mascot Bolt Banner */}
      <div className={`mascot-container ${mascotInfo.mood}`}>
        <div className={`mascot-avatar ${mascotInfo.mood}`}>{mascotInfo.emoji}</div>
        <div className="mascot-bubble">
          <strong>Bolt (AI Coach)</strong>
          <p style={{ margin: "4px 0 0 0" }}>{mascotInfo.message}</p>
        </div>
      </div>

      {/* Adaptive Suggestion Banner */}
      {todayFreeTimeSuggestion && (
        <div className="adaptive-suggestion-card" style={{ background: "linear-gradient(135deg, #fef08a 0%, #fef3c7 100%)", border: "1px solid #fde047", borderRadius: "14px", padding: "14px", marginBottom: "16px", color: "#854d0e" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Sparkles size={16} style={{ color: "#d97706" }} />
            <span style={{ fontSize: "11px", fontWeight: "700" }}>SMART RECOMMENDATION</span>
          </div>
          <p style={{ fontSize: "12px", margin: "6px 0 0 0", lineHeight: "1.4" }}>
            You have <strong>{formatHours(todayFreeTimeSuggestion.minutes)}</strong> of free runway today.
            Your best focus slot starts at <strong>{todayFreeTimeSuggestion.bestSlot}</strong>. 
            Let's make progress on <strong>"{todayFreeTimeSuggestion.taskTitle}"</strong>!
          </p>
        </div>
      )}

      {urgent ? (
        <>
          {urgent.task.priority === "critical" ? (
            <section className="boss-battle-card">
              <div className="boss-title-row">
                <h3>👿 DEADLINE BOSS BATTLE</h3>
                <span className="boss-level">Level {urgent.assessment.riskLevel === "critical" ? "99" : "50"}</span>
              </div>
              <div className="boss-name">{urgent.task.title}</div>
              <div className="boss-hp-section">
                <div className="boss-hp-header">
                  <span>Boss HP (Remaining work)</span>
                  <span>{formatHours(urgent.assessment.requiredMinutes)} / {formatHours(urgent.task.estimatedMinutes)}</span>
                </div>
                <div className="boss-hp-track">
                  <div 
                    className={`boss-hp-fill ${urgent.assessment.riskLevel === "critical" ? "critical" : ""}`} 
                    style={{ width: `${urgent.task.estimatedMinutes ? (urgent.assessment.requiredMinutes / urgent.task.estimatedMinutes) * 100 : 0}%` }}
                  />
                </div>
                <p className="consequence" style={{ color: "#ff9c86", marginTop: "10px", fontSize: "11px", marginBlockEnd: 0 }}>
                  ⚔️ <strong>Boss threat:</strong> {urgent.task.consequence}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                <button className="primary" style={{ flex: 1, background: "var(--lime)", color: "#141515" }} onClick={() => onOpen(urgent.task, "rescue")}>
                  <WandSparkles size={16} /> Build rescue plan
                </button>
                <button className="secondary" onClick={() => onOpen(urgent.task, "risk")}>
                  Why is this at risk? <ChevronRight size={14} />
                </button>
              </div>
            </section>
          ) : (
            <section className={`hero-risk ${urgent.assessment.riskLevel}`}>
              <div className="hero-topline">
                <span className="signal-label"><span className="pulse-dot" /> {urgent.assessment.riskLevel === "critical" ? "RESCUE NEEDED" : "NEEDS ATTENTION"}</span>
                <span className="deadline-chip">{formatDistanceToNowStrict(new Date(urgent.task.deadline))} left</span>
              </div>
              <h2>{urgent.task.title}</h2>
              <p className="consequence">{urgent.task.consequence}</p>
              <div className="confidence-layout">
                <ConfidenceRing score={urgent.assessment.confidenceScore} />
                <div className="time-reality">
                  <div><span>Calendar days</span><strong>{urgent.assessment.calendarDaysRemaining} days</strong></div>
                  <ArrowRight size={16} />
                  <div className="reveal"><span>Productive runway</span><strong>{urgent.assessment.effectiveProductiveDays} days</strong></div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px" }}>
                <span style={{ fontSize: "11px", opacity: 0.8 }}>Focus Runway: {formatHours(urgent.assessment.usableMinutes)} available</span>
                <button className="why-link" style={{ padding: 0, margin: 0, border: "none", background: "transparent", color: "white", fontSize: "11px", display: "flex", alignItems: "center" }} onClick={() => onOpen(urgent.task, "risk")}>Why is this at risk? <ChevronRight size={14} /></button>
              </div>
              <button className="rescue-button" onClick={() => onOpen(urgent.task, "rescue")} style={{ marginTop: "12px" }}><WandSparkles size={18} /> Build my rescue plan</button>
            </section>
          )}

          <section className="section-block">
            <div className="section-heading"><div><span className="eyebrow">NEXT BEST MOVE</span><h3>Start small. Build momentum.</h3></div></div>
            {urgent.task.subtasks.filter((item) => !item.completed).slice(0, 2).map((item, index) => (
              <button className="next-move" key={item.id} onClick={() => onComplete(urgent.task.id, item.id)}>
                <span className="move-number">{index + 1}</span>
                <span className="move-copy"><strong>{item.title}</strong><small>{formatHours(item.minutes)} · Tap when finished</small></span>
                <span className="check-ring"><Check size={16} /></span>
              </button>
            ))}
          </section>
        </>
      ) : (
        <section className="empty-state">
          <div className="empty-icon"><ShieldCheck size={36} /></div>
          <h2>Your runway is clear.</h2>
          <p>Add a deadline and ClutchAI will watch the clock, find your real capacity, and step in before panic does.</p>
          <button className="primary-button" onClick={onAdd}><Plus size={18} /> Add my first deadline</button>
        </section>
      )}

      {/* Dynamic Deadline Confidence Dashboard */}
      {tasks.length > 1 && (
        <section className="section-block">
          <div className="section-heading"><h3>Deadline Confidence Dashboard</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {tasks.map(t => {
              const r = assessTask(t, state.profile, state.busyBlocks, new Date(), state.calendarEvents);
              return (
                <div
                  key={t.id}
                  onClick={() => onOpen(t, "risk")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "white",
                    border: "1px solid #edf2f7",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    cursor: "pointer"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "600" }}>{t.title}</span>
                  <span className={`confidence-badge-flat ${r.riskLevel}`} style={{ fontSize: "11px", fontWeight: "bold", padding: "2px 8px", borderRadius: "20px" }}>
                    {r.confidenceScore}% ({r.riskLevel})
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Today's Schedule View */}
      <section className="section-block">
        <div className="section-heading"><h3>Today's Commitments & Focus</h3></div>
        <div className="today-timeline-container" style={{ background: "white", border: "1px solid #edf2f7", borderRadius: "14px", padding: "14px" }}>
          {todayTimeline.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
              {todayTimeline.map((item, index) => {
                const isTask = item.type === "task";
                return (
                  <div key={item.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: "55px", textAlign: "right", fontSize: "10px", color: "var(--muted)", fontWeight: "bold", paddingTop: "2px" }}>
                      {format(item.start, "hh:mm a")}
                    </div>
                    <div style={{ width: "2px", alignSelf: "stretch", background: isTask ? "var(--primary)" : "#cbd5e1", position: "relative" }}>
                      <div style={{ position: "absolute", top: "4px", left: "-3px", width: "8px", height: "8px", borderRadius: "50%", background: isTask ? "var(--primary)" : "#cbd5e1" }} />
                    </div>
                    <div style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", background: isTask ? "rgba(99, 102, 241, 0.08)" : "#f8f9fa", borderLeft: isTask ? "3px solid var(--primary)" : "3px solid #64748b" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", display: "block" }}>{item.title}</span>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                        Duration: {format(item.start, "HH:mm")} - {format(item.end, "HH:mm")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "10px", color: "var(--muted)", fontSize: "11px" }}>
              💤 No commitments or task blocks scheduled for today. Enjoy your peace!
            </div>
          )}
        </div>
      </section>

      {/* Your week, honestly */}
      <section className="week-glance">
        <div className="section-heading"><h3>Your week, honestly</h3><button onClick={onRoutine}>Edit routine <Pencil size={14} /></button></div>
        <div className="week-grid">
          {[0, 1, 2, 3, 4].map((day) => {
            const date = new Date(Date.now() + day * 86400000);
            const busy = state.busyBlocks.filter((block) => new Date(block.start).toDateString() === date.toDateString()).length;
            return <div className={day === 0 ? "today" : ""} key={day}>
              <span>{format(date, "EEE")}</span><strong>{format(date, "d")}</strong>
              <i style={{ height: `${Math.min(34, 8 + busy * 10)}px` }} />
            </div>;
          })}
        </div>
        <div className="week-legend"><span><i className="available" /> Available focus</span><span><i className="busy" /> Fixed commitments</span></div>
      </section>
    </>
  );
}

function TasksScreen({ state, onOpen, onAdd }: { state: AppState; onOpen: (task: Task, overlay: Overlay) => void; onAdd: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const filteredTasks = state.tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTasks = filteredTasks.filter((t) => t.status !== "completed");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  return (
    <section className="page-section">
      <div className="page-title"><div><span className="eyebrow">YOUR COMMITMENTS</span><h1>Tasks</h1></div><button className="small-add" onClick={onAdd}><Plus size={18} /></button></div>
      
      <div className="search-container">
        <div className="search-icon"><Search size={16} /></div>
        <input 
          type="text" 
          placeholder="Search tasks..." 
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear-btn"
            aria-label="Clear search"
            onClick={() => setSearchQuery("")}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {activeTasks.length ? activeTasks.map((task) => {
          const risk = assessTask(task, state.profile, state.busyBlocks, new Date(), state.calendarEvents);
          const done = task.subtasks.filter((item) => item.completed).length;
          const plan = state.plans.find((item) => item.taskId === task.id);
          return <article className="task-row" key={task.id} onClick={() => onOpen(task, "risk")}>
            <div className={`risk-stripe ${risk.riskLevel}`} />
            <div className="task-main">
              <div className="task-meta"><span>{format(new Date(task.deadline), "EEE, MMM d · h:mm a")}</span><span className={`risk-text ${risk.riskLevel}`}>{risk.confidenceScore}% confidence</span></div>
              <h3>{task.title}</h3>
              <div className="progress-track"><i style={{ width: `${task.subtasks.length ? done / task.subtasks.length * 100 : 0}%` }} /></div>
              <small>{done} of {task.subtasks.length} milestones · {formatHours(risk.requiredMinutes)} remaining</small>
              <button className="task-plan-button" onClick={(event) => { event.stopPropagation(); onOpen(task, "rescue"); }}>
                {plan ? `${plan.blocks.length} planned focus block${plan.blocks.length === 1 ? "" : "s"}` : task.subtasks.length === 1 ? "Plan one sitting" : "Build task-specific plan"}
                <ChevronRight size={14} />
              </button>
            </div>
            <ChevronRight size={18} />
          </article>;
        }) : <div className="empty-mini"><Target size={28} /><h3>No active tasks</h3><button onClick={onAdd}>Add one now</button></div>}

        {completedTasks.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "#f1f3f5",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--muted)"
              }}
            >
              <span>Completed / Archived Tasks ({completedTasks.length})</span>
              {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {showCompleted && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {completedTasks.map((task) => (
                  <article
                    className="task-row"
                    key={task.id}
                    onClick={() => onOpen(task, "risk")}
                    style={{ opacity: 0.65, background: "#f8f9fa", border: "1px solid #edf2f7" }}
                  >
                    <div className="risk-stripe on-track" style={{ background: "#a0aec0" }} />
                    <div className="task-main">
                      <div className="task-meta">
                        <span>Completed {format(new Date(task.deadline), "MMM d")}</span>
                      </div>
                      <h3 style={{ textDecoration: "line-through", color: "var(--muted)" }}>{task.title}</h3>
                      <small style={{ color: "var(--muted)" }}>All {task.subtasks.length} milestones finished</small>
                    </div>
                    <ChevronRight size={18} style={{ color: "var(--muted)" }} />
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ProgressScreen({ 
  state, 
  lifeShieldActive, 
  setLifeShieldActive, 
   wagerActive, 
  wagerStatus, 
  setWagerStatus,
  setWagerActive,
  updateProfile,
  onStreak
}: { 
  state: AppState; 
  lifeShieldActive: boolean;
  setLifeShieldActive: (a: boolean) => void;
  wagerActive: boolean;
  wagerStatus: "idle" | "active" | "won" | "lost";
  setWagerStatus: (s: any) => void;
  setWagerActive: (a: boolean) => void;
  updateProfile: (fn: (p: UserProfile) => UserProfile) => void;
  onStreak: () => void;
}) {
  const complete = state.tasks.flatMap((task) => task.subtasks).filter((item) => item.completed).length;
  
  const levelInfo = useMemo(() => {
    const xp = state.profile.xp;
    if (xp < 100) return { num: 1, title: "Procrastinator", next: 100 };
    if (xp < 300) return { num: 2, title: "Planner in motion", next: 300 };
    if (xp < 600) return { num: 3, title: "Executor", next: 600 };
    if (xp < 1000) return { num: 4, title: "Consistent Slayer", next: 1000 };
    return { num: 5, title: "Deadline Guardian", next: 9999 };
  }, [state.profile.xp]);

  return (
    <section className="page-section">
      <span className="eyebrow">MOMENTUM, NOT GUILT</span><h1>Your progress</h1>
      <div className="level-card">
        <div className="level-icon"><Trophy size={28} /></div>
        <div>
          <span>LEVEL {levelInfo.num}</span>
          <h2>{levelInfo.title}</h2>
          <p>{state.profile.xp} XP · {levelInfo.next - state.profile.xp > 0 ? levelInfo.next - state.profile.xp : 0} to next level</p>
        </div>
      </div>
      <div className="stat-grid">
        <div style={{ cursor: "pointer" }} onClick={onStreak} title="View Streak Details">
          <Flame size={20} /><strong>{state.profile.streak}</strong><span>day streak</span>
        </div>
        <div><CheckCircle2 size={20} /><strong>{complete}</strong><span>moves finished</span></div>
        <div><ShieldCheck size={20} /><strong>{state.profile.reliability}%</strong><span>follow-through</span></div>
      </div>

      <h3 style={{ fontSize: "14px", margin: "20px 0 10px", fontFamily: "Manrope" }}>Power-ups & Wagers</h3>
      <div className="wager-section">
        <div className="wager-card">
          <h4><Trophy size={15} /> Streak Wager</h4>
          <p>Bet 15 XP that you will complete a focus block today. Win 30 XP!</p>
          <button 
            disabled={state.profile.xp < 15 && wagerStatus === "idle"} 
            className={`wager-btn ${wagerStatus === "active" ? "active" : ""}`}
            style={{ marginTop: "auto" }}
            onClick={() => {
              if (wagerStatus === "idle") {
                updateProfile(current => ({ ...current, xp: Math.max(0, current.xp - 15) }));
                setWagerStatus("active");
                setWagerActive(true);
              }
            }}
          >
            {wagerStatus === "active" ? "Bet Placed" : wagerStatus === "won" ? "Wager Won (+30 XP) 🎉" : "Bet 15 XP"}
          </button>
        </div>
        <div className="shield-card">
          <h4><ShieldCheck size={15} /> Life Shield</h4>
          <p>Protect your streak today if you cannot work. Costs 50 XP.</p>
          <button 
            disabled={state.profile.xp < 50 && !lifeShieldActive} 
            className={`shield-btn ${lifeShieldActive ? "active" : ""}`}
            style={{ marginTop: "auto" }}
            onClick={() => {
              if (!lifeShieldActive) {
                updateProfile(current => ({ ...current, xp: Math.max(0, current.xp - 50) }));
                setLifeShieldActive(true);
              } else {
                setLifeShieldActive(false);
              }
            }}
          >
            {lifeShieldActive ? "Shield Active 🛡️" : "Buy Shield (50 XP)"}
          </button>
        </div>
      </div>

      <div className="insight-card" style={{ marginTop: "12px" }}>
        <Sparkles size={20} />
        <div><strong>Clutch insight</strong><p>You finish more often when your first block is under 90 minutes. Rescue plans now protect that pattern.</p></div>
      </div>
    </section>
  );
}

function ProfileScreen({ state, onDemo, onReset, onSave, onRoutine }: {
  state: AppState; onDemo: (persona: Persona) => void; onReset: () => void;
  onSave: (profile: AppState["profile"]) => void; onRoutine: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(state.profile);

  useEffect(() => {
    setProfile(state.profile);
  }, [state.profile]);

  return (
    <section className="page-section">
      <div className="page-title"><div><span className="eyebrow">YOUR PROFILE</span><h1>{profile.name}</h1></div>
        <button className="small-add" aria-label="Edit profile" onClick={() => setEditing(!editing)}><Pencil size={17} /></button></div>
      <div className="profile-card">
        <div className="large-avatar">{profile.name.charAt(0)}</div>
        <div><h3>{personaCopy[profile.persona].label}</h3><p>Best focus: {profile.focusPreference}</p></div>
      </div>
      {editing && <div className="profile-editor">
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>Name
          <input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>Wake time
          <TimeSelectPicker value={profile.wakeTime} onChange={(val) => setProfile({ ...profile, wakeTime: val })} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>Sleep time
          <TimeSelectPicker value={profile.sleepTime} onChange={(val) => setProfile({ ...profile, sleepTime: val })} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>Best focus
          <select value={profile.focusPreference} onChange={(event) => setProfile({ ...profile, focusPreference: event.target.value as UserProfile["focusPreference"] })}>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
        </label>
        <button className="primary-button full" onClick={() => { onSave(profile); setEditing(false); }}>Save profile</button>
      </div>}
      <h3 className="subheading">Switch demo persona</h3>
      <div className="demo-personas">
        {(Object.keys(personaCopy) as Persona[]).map((persona) => (
          <button key={persona} className={state.profile.persona === persona ? "selected" : ""} onClick={() => onDemo(persona)}>
            <span>{personaCopy[persona].emoji}</span>{personaCopy[persona].label}
          </button>
        ))}
      </div>
      <div className="settings-list">
        <button onClick={onRoutine}><CalendarDays size={19} /><span><strong>Daily preferences</strong><small>Wake, sleep, and focus hours</small></span><ChevronRight size={17} /></button>
        <button 
          onClick={() => {
            const updated = {
              ...profile,
              smartNotificationsEnabled: profile.smartNotificationsEnabled !== false ? false : true
            };
            setProfile(updated);
            onSave(updated);
          }}
        >
          {profile.smartNotificationsEnabled !== false ? <Bell size={19} /> : <BellOff size={19} />}
          <span>
            <strong>Smart notifications</strong>
            <small>{profile.smartNotificationsEnabled !== false ? "Risk-based reminders are active" : "Smart reminders are paused"}</small>
          </span>
          <span className={profile.smartNotificationsEnabled !== false ? "status-connected" : "status-disconnected"}>
            {profile.smartNotificationsEnabled !== false ? "On" : "Off"}
          </span>
        </button>
        <button onClick={onReset}><RotateCcw size={19} /><span><strong>Reset demo</strong><small>Restore the flagship scenario</small></span><ChevronRight size={17} /></button>
      </div>
    </section>
  );
}

function StreakScreen({ state, onBack }: { state: AppState; onBack: () => void }) {
  return <section className="page-section">
    <button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Today</button>
    <span className="eyebrow">CONSISTENCY HISTORY</span><h1>{state.profile.streak} day streak</h1>
    <p className="page-copy">A streak counts when you complete at least one planned move. Rest days do not break it.</p>
    <div className="history-grid">
      {state.streakHistory.map((day) => <div className={`history-day ${day.status}`} key={day.date}>
        <span>{format(new Date(day.date), "EEE")}</span>
        <strong>{format(new Date(day.date), "d")}</strong>
        <i>{day.status === "success" ? <Check size={13} /> : day.status === "missed" ? <X size={13} /> : "—"}</i>
        <small>{day.status === "rest" ? "Rest" : `${day.completed}/${day.planned}`}</small>
      </div>)}
    </div>
    <div className="history-summary">
      <div><strong>{state.streakHistory.filter((day) => day.status === "success").length}</strong><span>successful days</span></div>
      <div><strong>{state.streakHistory.filter((day) => day.status === "missed").length}</strong><span>missed days</span></div>
      <div><strong>{state.streakHistory.filter((day) => day.status === "rest").length}</strong><span>rest days</span></div>
    </div>
  </section>;
}

function RoutineScreen({ state, onBack, onSave }: {
  state: AppState;
  onBack: () => void;
  onSave: (routineBlocks: RoutineBlock[], profile: UserProfile, busyBlocks: AvailabilityBlock[]) => void;
}) {
  const [wakeTime, setWakeTime] = useState(state.profile.wakeTime || "07:00");
  const [sleepTime, setSleepTime] = useState(state.profile.sleepTime || "23:00");
  const [productivityPeak, setProductivityPeak] = useState(state.profile.productivityPeak || "morning");
  const [weeklyHolidays, setWeeklyHolidays] = useState<number[]>(state.profile.weeklyHolidays || [0]);
  const [holidayMode, setHolidayMode] = useState<"rest" | "free">(state.profile.holidayMode || "rest");
  const [routineBlocks, setRoutineBlocks] = useState<RoutineBlock[]>(state.routineBlocks || []);

  const addRoutineBlock = (block: Omit<RoutineBlock, "id">) => {
    const newBlock: RoutineBlock = {
      ...block,
      id: crypto.randomUUID()
    };
    setRoutineBlocks(curr => [...curr, newBlock]);
  };

  const removeRoutineBlock = (id: string) => {
    setRoutineBlocks(curr => curr.filter(b => b.id !== id));
  };

  const updateBlockDays = (id: string, day: number) => {
    setRoutineBlocks(curr => curr.map(b => {
      if (b.id !== id) return b;
      const days = b.daysOfWeek.includes(day)
        ? b.daysOfWeek.filter(d => d !== day)
        : [...b.daysOfWeek, day].sort();
      return { ...b, daysOfWeek: days };
    }));
  };

  const updateBlockField = (id: string, field: keyof RoutineBlock, value: any) => {
    setRoutineBlocks(curr => curr.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  // Quick-Add Templates
  const templates = [
    { label: "🎓 College", title: "College Lectures", startTime: "08:00", endTime: "16:00", days: [1,2,3,4,5], category: "school" as const, energy: "medium" as const, isFixed: true },
    { label: "💼 Office", title: "Office Work", startTime: "09:00", endTime: "17:00", days: [1,2,3,4,5], category: "work" as const, energy: "medium" as const, isFixed: true },
    { label: "🏋️ Gym", title: "Gym Workout", startTime: "07:00", endTime: "08:30", days: [1,3,5], category: "gym" as const, energy: "high" as const, isFixed: false },
    { label: "📚 Tuition", title: "Tuition Classes", startTime: "17:00", endTime: "18:30", days: [1,3,5], category: "tuition" as const, energy: "high" as const, isFixed: true },
    { label: "🚗 Commute", title: "Daily Commute", startTime: "08:00", endTime: "09:00", days: [1,2,3,4,5], category: "commute" as const, energy: "low" as const, isFixed: true }
  ];

  // Calculate Capacity stats
  const wakeParsed = parseInt(wakeTime.split(":")[0]) * 60 + parseInt(wakeTime.split(":")[1]);
  const sleepParsed = parseInt(sleepTime.split(":")[0]) * 60 + parseInt(sleepTime.split(":")[1]);
  let wakingMinutesPerDay = sleepParsed - wakeParsed;
  if (wakingMinutesPerDay <= 0) wakingMinutesPerDay = 16 * 60; // fallback

  const totalWakingHoursWeekly = (wakingMinutesPerDay / 60) * 7;

  // Calculate weekly routine commitments hours
  let weeklyCommittedMinutes = 0;
  routineBlocks.forEach(b => {
    const startMins = parseInt(b.startTime.split(":")[0]) * 60 + parseInt(b.startTime.split(":")[1]);
    const endMins = parseInt(b.endTime.split(":")[0]) * 60 + parseInt(b.endTime.split(":")[1]);
    let duration = endMins - startMins;
    if (duration <= 0) duration = 60;
    weeklyCommittedMinutes += duration * b.daysOfWeek.length;
  });

  const weeklyCommittedHours = weeklyCommittedMinutes / 60;
  
  // Weekly rest day hours subtraction if holidayMode is rest
  const numRestDays = holidayMode === "rest" ? weeklyHolidays.length : 0;
  const restDayMinutes = numRestDays * wakingMinutesPerDay;
  const restDayHours = restDayMinutes / 60;

  const weeklyFreeHours = Math.max(0, totalWakingHoursWeekly - weeklyCommittedHours - restDayHours);
  const averageDailyCapacity = weeklyFreeHours / (7 - numRestDays || 1);

  const handleSave = () => {
    const profile: UserProfile = {
      ...state.profile,
      wakeTime,
      sleepTime,
      productivityPeak,
      weeklyHolidays,
      holidayMode
    };
    const busyBlocks = expandRoutineToBlocks(routineBlocks, state.calendarEvents || [], profile, new Date(), addDays(new Date(), 21));
    onSave(routineBlocks, profile, busyBlocks);
    onBack();
  };

  const daysOfWeekLetters = ["Su", "M", "T", "W", "Th", "F", "Sa"];

  return (
    <section className="page-section routine-editor-page">
      <button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Back</button>
      <span className="eyebrow">ROUTINE PLANNER</span>
      <h1>Build your typical week</h1>
      <p className="page-copy">We find task time within your actual waking free hours. Sleep and commitment hours are automatically protected.</p>

      {/* 1. Sleep & Peak Preference Card */}
      <div className="card-section">
        <h3 className="section-title">Waking & Energy Peaks</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <label className="input-label">Wake Time
            <div style={{ marginTop: "4px" }}>
              <TimeSelectPicker value={wakeTime} onChange={setWakeTime} />
            </div>
          </label>
          <label className="input-label">Sleep Time
            <div style={{ marginTop: "4px" }}>
              <TimeSelectPicker value={sleepTime} onChange={setSleepTime} />
            </div>
          </label>
        </div>
        <label className="input-label">Productivity Peak Window
          <select className="select-input" value={productivityPeak} onChange={e => setProductivityPeak(e.target.value as any)}>
            <option value="morning">Morning peak (06:30 - 11:30)</option>
            <option value="afternoon">Afternoon peak (13:00 - 18:00)</option>
            <option value="night">Night peak (18:00 - 23:00)</option>
          </select>
        </label>
      </div>

      {/* 2. Weekly Holidays Card */}
      <div className="card-section">
        <h3 className="section-title">Weekly Off-Days</h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          {daysOfWeekLetters.map((name, idx) => {
            const isHoliday = weeklyHolidays.includes(idx);
            return (
              <button
                key={idx}
                className={`day-chip ${isHoliday ? "selected-holiday" : ""}`}
                onClick={() => {
                  setWeeklyHolidays(curr => 
                    curr.includes(idx) ? curr.filter(d => d !== idx) : [...curr, idx].sort()
                  );
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
        {weeklyHolidays.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Holiday mode:</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                className={`toggle-btn ${holidayMode === "rest" ? "active" : ""}`}
                onClick={() => setHolidayMode("rest")}
                style={{ fontSize: "10px", padding: "4px 8px", borderRadius: "6px" }}
              >
                💤 Rest Day
              </button>
              <button
                className={`toggle-btn ${holidayMode === "free" ? "active" : ""}`}
                onClick={() => setHolidayMode("free")}
                style={{ fontSize: "10px", padding: "4px 8px", borderRadius: "6px" }}
              >
                ⚡ Free for Tasks
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Capacity Summary Dashboard */}
      <div className="capacity-dashboard card-section" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)", color: "white", borderColor: "transparent" }}>
        <h3 className="section-title" style={{ color: "rgba(255,255,255,0.7)" }}>Your Weekly Capacity</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "10px" }}>
          <div>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontWeight: "600", display: "block" }}>WEEKLY FREE HOURS</span>
            <strong style={{ fontSize: "24px", color: "var(--lime)", display: "block", marginTop: "2px" }}>{weeklyFreeHours.toFixed(1)}h</strong>
          </div>
          <div>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontWeight: "600", display: "block" }}>DAILY RUNWAY AVG</span>
            <strong style={{ fontSize: "24px", color: "#ffb454", display: "block", marginTop: "2px" }}>{averageDailyCapacity.toFixed(1)}h</strong>
          </div>
        </div>
        <div style={{ marginTop: "14px", background: "rgba(255,255,255,0.1)", borderRadius: "8px", height: "8px", overflow: "hidden", display: "flex" }}>
          <div style={{ background: "#a3e635", width: `${(weeklyFreeHours / totalWakingHoursWeekly) * 100}%` }} title="Free time" />
          <div style={{ background: "#f87171", width: `${(weeklyCommittedHours / totalWakingHoursWeekly) * 100}%` }} title="Routine commitments" />
          <div style={{ background: "#60a5fa", width: `${(restDayHours / totalWakingHoursWeekly) * 100}%` }} title="Rest days" />
        </div>
        <div style={{ display: "flex", gap: "10px", fontSize: "9px", marginTop: "8px", color: "rgba(255,255,255,0.6)" }}>
          <span>● Free: {weeklyFreeHours.toFixed(0)}h</span>
          <span>● Busy: {weeklyCommittedHours.toFixed(0)}h</span>
          {numRestDays > 0 && <span>● Rest: {restDayHours.toFixed(0)}h</span>}
        </div>
      </div>

      {/* 4. Routine Commitments Card */}
      <div className="card-section">
        <h3 className="section-title">Routine Commitments</h3>
        
        {/* Quick Add Templates */}
        <div style={{ marginBottom: "14px" }}>
          <span style={{ fontSize: "10px", color: "var(--muted)", display: "block", marginBottom: "6px", fontWeight: "600" }}>QUICK-ADD TEMPLATES</span>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
            {templates.map(t => (
              <button
                key={t.label}
                className="template-btn"
                onClick={() => addRoutineBlock({
                  title: t.title,
                  startTime: t.startTime,
                  endTime: t.endTime,
                  daysOfWeek: t.days,
                  category: t.category,
                  isFixed: t.isFixed,
                  energy: t.energy
                })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Routine Blocks List */}
        <div className="routine-list">
          {routineBlocks.map(b => (
            <div key={b.id} className="routine-item-card" style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px", marginBottom: "10px", position: "relative" }}>
              <button
                aria-label="Delete block"
                onClick={() => removeRoutineBlock(b.id)}
                style={{ position: "absolute", right: "10px", top: "10px", border: "none", background: "transparent", cursor: "pointer", color: "#f87171" }}
              >
                <Trash2 size={16} />
              </button>
              
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  className="routine-title-input"
                  style={{ fontWeight: "600", fontSize: "12px", border: "none", borderBottom: "1px solid transparent", background: "transparent", width: "80%" }}
                  value={b.title}
                  onChange={e => updateBlockField(b.id, "title", e.target.value)}
                  placeholder="Activity Title"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
                <label className="input-label" style={{ fontSize: "9px" }}>Starts
                  <div style={{ marginTop: "2px" }}>
                    <TimeSelectPicker value={b.startTime} onChange={(val) => updateBlockField(b.id, "startTime", val)} />
                  </div>
                </label>
                <label className="input-label" style={{ fontSize: "9px" }}>Ends
                  <div style={{ marginTop: "2px" }}>
                    <TimeSelectPicker value={b.endTime} onChange={(val) => updateBlockField(b.id, "endTime", val)} />
                  </div>
                </label>
              </div>

              {/* Day selection chips */}
              <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                {daysOfWeekLetters.map((dayName, idx) => {
                  const isActive = b.daysOfWeek.includes(idx);
                  return (
                    <button
                      key={idx}
                      className={`day-chip-mini ${isActive ? "active" : ""}`}
                      onClick={() => updateBlockDays(b.id, idx)}
                    >
                      {dayName}
                    </button>
                  );
                })}
              </div>

              {/* Category, Fixed & Energy selectors */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  className="select-input-mini"
                  value={b.category}
                  onChange={e => updateBlockField(b.id, "category", e.target.value)}
                >
                  <option value="work">💼 Work</option>
                  <option value="school">🎓 School</option>
                  <option value="gym">🏋️ Gym</option>
                  <option value="tuition">📚 Tuition</option>
                  <option value="sports">⚽ Sports</option>
                  <option value="commute">🚗 Commute</option>
                  <option value="other">⚙️ Other</option>
                </select>

                <select
                  className="select-input-mini"
                  value={b.energy}
                  onChange={e => updateBlockField(b.id, "energy", e.target.value)}
                >
                  <option value="high">🔥 High Energy</option>
                  <option value="medium">⚡ Med Energy</option>
                  <option value="low">💤 Low Energy</option>
                </select>

                <label style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={b.isFixed}
                    onChange={e => updateBlockField(b.id, "isFixed", e.target.checked)}
                  />
                  <span>Fixed commitment</span>
                </label>
              </div>
            </div>
          ))}
          {routineBlocks.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--muted)", fontSize: "11px" }}>
              No recurring commitments added yet. Use the quick-add templates above to get started!
            </div>
          )}
        </div>

        <button
          className="secondary-button full"
          onClick={() => addRoutineBlock({
            title: "New Commit",
            startTime: "09:00",
            endTime: "10:00",
            daysOfWeek: [1,2,3,4,5],
            category: "other",
            isFixed: true,
            energy: "medium"
          })}
        >
          <Plus size={16} /> Add Custom Commitment
        </button>
      </div>

      <button className="primary-button full" style={{ marginTop: "16px" }} onClick={handleSave}><Check size={18} /> Save & Recalculate Plans</button>
    </section>
  );
}

function CalendarScreen({ state, onBack, onSave }: {
  state: AppState;
  onBack: () => void;
  onSave: (events: CalendarEvent[], busyBlocks: AvailabilityBlock[]) => void;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>(state.calendarEvents || []);
  const [showAddForm, setShowAddForm] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<CalendarEventType>("trip");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [blocksProductivity, setBlocksProductivity] = useState(true);

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const addEvent = () => {
    if (!title.trim()) return;
    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title,
      type,
      startDate,
      endDate,
      isFullDay,
      startTime: isFullDay ? undefined : startTime,
      endTime: isFullDay ? undefined : endTime,
      blocksProductivity
    };

    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);

    setTitle("");
    setShowAddForm(false);
  };

  const removeEvent = (id: string) => {
    setEvents(curr => curr.filter(e => e.id !== id));
  };

  const handleSave = () => {
    const busyBlocks = expandRoutineToBlocks(state.routineBlocks, events, state.profile, new Date(), addDays(new Date(), 21));
    onSave(events, busyBlocks);
    onBack();
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(year, month, i));
  }

  const getEventForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(e => {
      const s = e.startDate.split("T")[0];
      const end = e.endDate.split("T")[0];
      return dateStr >= s && dateStr <= end;
    });
  };

  const impactPreviews = useMemo(() => {
    if (!title.trim() || !blocksProductivity) return [];
    
    const tempEvent: CalendarEvent = {
      id: "temp",
      title,
      startDate,
      endDate,
      type,
      isFullDay,
      startTime: isFullDay ? undefined : startTime,
      endTime: isFullDay ? undefined : endTime,
      blocksProductivity
    };

    const tempBusy = expandRoutineToBlocks(
      state.routineBlocks,
      [...events, tempEvent],
      state.profile,
      new Date(),
      addDays(new Date(), 21)
    );

    return state.tasks.filter(t => t.status === "active").map(task => {
      const originalMins = assessTask(task, state.profile, state.busyBlocks, new Date(), state.calendarEvents).usableMinutes;
      const newMins = assessTask(task, state.profile, tempBusy, new Date(), [...events, tempEvent]).usableMinutes;
      const originalAssessment = assessTask(task, state.profile, state.busyBlocks, new Date(), state.calendarEvents);
      const newAssessment = assessTask(task, state.profile, tempBusy, new Date(), [...events, tempEvent]);
      
      const diff = originalMins - newMins;
      return {
        taskTitle: task.title,
        diff,
        originalMins,
        newMins,
        originalConf: originalAssessment.confidenceScore,
        newConf: newAssessment.confidenceScore,
        originalRisk: originalAssessment.riskLevel,
        newRisk: newAssessment.riskLevel
      };
    }).filter(i => i.diff > 0);
  }, [title, type, startDate, endDate, isFullDay, startTime, endTime, blocksProductivity, events, state]);

  const eventColors: Record<CalendarEventType, string> = {
    trip: "#ff7c5c",
    vacation: "#3b82f6",
    exam: "#ef4444",
    festival: "#eab308",
    family: "#a855f7",
    holiday: "#10b981",
    other: "#6b7280"
  };

  return (
    <section className="page-section calendar-page">
      <button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Back</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div>
          <span className="eyebrow">SMART CALENDAR</span>
          <h1>Events & Trips</h1>
        </div>
        <button className="small-add" onClick={() => setShowAddForm(true)}><Plus size={18} /></button>
      </div>
      <p className="page-copy">Schedule exams, vacations, and travel. Clutch automatically rearranges tasks and flags deadline risks.</p>

      <div className="card-section calendar-grid-container" style={{ padding: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <button style={{ border: "none", background: "transparent", color: "var(--primary)", fontWeight: "bold", cursor: "pointer" }} onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>◀</button>
          <strong style={{ fontSize: "14px" }}>{format(currentMonth, "MMMM yyyy")}</strong>
          <button style={{ border: "none", background: "transparent", color: "var(--primary)", fontWeight: "bold", cursor: "pointer" }} onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>▶</button>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", fontSize: "10px", color: "var(--muted)", fontWeight: "bold", marginBottom: "6px" }}>
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} style={{ height: "36px" }} />;
            const dayEvents = getEventForDay(date);
            const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            
            return (
              <div
                key={idx}
                style={{
                  height: "38px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: isToday ? "rgba(99, 102, 241, 0.15)" : "#f8f9fa",
                  borderRadius: "6px",
                  padding: "4px 2px",
                  fontSize: "11px",
                  fontWeight: isToday ? "bold" : "normal",
                  border: isToday ? "1px solid var(--primary)" : "1px solid #edf2f7"
                }}
              >
                <span>{date.getDate()}</span>
                <div style={{ display: "flex", gap: "2px", justifyContent: "center", width: "100%", overflow: "hidden" }}>
                  {dayEvents.slice(0, 3).map(e => (
                    <span
                      key={e.id}
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: eventColors[e.type] || "#cbd5e1"
                      }}
                      title={e.title}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAddForm && (
        <div className="modal-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div className="card-section" style={{ width: "100%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: "20px", maxHeight: "85vh", overflowY: "auto", background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0 }}>Add Upcoming Event</h3>
              <button style={{ border: "none", background: "transparent", cursor: "pointer" }} onClick={() => setShowAddForm(false)}><X size={20} /></button>
            </div>

            <label className="input-label" style={{ marginBottom: "10px" }}>Event Title
              <input type="text" className="text-input" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" }} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hyderabad Trip, Finals Week" />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <label className="input-label">Event Type
                <select className="select-input" value={type} onChange={e => setType(e.target.value as any)}>
                  <option value="trip">✈️ Trip</option>
                  <option value="vacation">🌴 Vacation</option>
                  <option value="exam">📝 Exam</option>
                  <option value="festival">🎉 Festival</option>
                  <option value="family">🏡 Family Event</option>
                  <option value="holiday">⛱️ Holiday</option>
                  <option value="other">⚙️ Other</option>
                </select>
              </label>

              <label className="input-label" style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "16px", cursor: "pointer" }}>
                <input type="checkbox" checked={blocksProductivity} onChange={e => setBlocksProductivity(e.target.checked)} />
                <span style={{ fontSize: "10px", fontWeight: "600" }}>Blocks productivity?</span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <label className="input-label">Start Date
                <input type="date" className="text-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </label>
              <label className="input-label">End Date
                <input type="date" className="text-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </label>
            </div>

            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <input type="checkbox" id="isFullDayCheckbox" checked={isFullDay} onChange={e => setIsFullDay(e.target.checked)} />
              <label htmlFor="isFullDayCheckbox" style={{ fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>Full Day Event</label>
            </div>

            {!isFullDay && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <label className="input-label">Start Time
                  <div style={{ marginTop: "4px" }}>
                    <TimeSelectPicker value={startTime} onChange={setStartTime} />
                  </div>
                </label>
                <label className="input-label">End Time
                  <div style={{ marginTop: "4px" }}>
                    <TimeSelectPicker value={endTime} onChange={setEndTime} />
                  </div>
                </label>
              </div>
            )}

            {impactPreviews.length > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "8px", padding: "10px", marginBottom: "16px" }}>
                <span style={{ fontSize: "10px", color: "#d97706", fontWeight: "700", display: "block" }}>⚠️ DEADLINE RISK IMPACT PREVIEW</span>
                <div style={{ marginTop: "6px" }}>
                  {impactPreviews.map((p, i) => (
                    <div key={i} style={{ fontSize: "10px", color: "#92400e", marginBottom: "4px" }}>
                      ● <strong>{p.taskTitle}</strong>: Usable time decreases by <strong>{formatHours(p.diff)}</strong>. Confidence drops from {p.originalConf}% to <strong>{p.newConf}%</strong> ({p.newRisk}).
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="primary-button full" onClick={addEvent}>Confirm Event</button>
          </div>
        </div>
      )}

      <div className="card-section">
        <h3 className="section-title">Upcoming Calendar Commitments</h3>
        <div className="event-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {events.map(e => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #edf2f7", borderRadius: "10px", padding: "10px", background: "#f8f9fa" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: eventColors[e.type] || "#cbd5e1" }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: "12px", fontWeight: "700" }}>{e.title}</h4>
                  <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                    {format(new Date(e.startDate), "MMM d")} - {format(new Date(e.endDate), "MMM d")}
                    {e.isFullDay ? " (Full Day)" : ` (${e.startTime} - ${e.endTime})`}
                  </span>
                  {e.blocksProductivity && (
                    <span style={{ display: "block", fontSize: "9px", color: "#e53e3e", fontWeight: "600", marginTop: "2px" }}>🛑 Blocks task scheduling</span>
                  )}
                </div>
              </div>
              <button
                aria-label="Remove event"
                onClick={() => removeEvent(e.id)}
                style={{ border: "none", background: "transparent", color: "#e53e3e", cursor: "pointer" }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {events.length === 0 && (
            <div style={{ textAlign: "center", padding: "14px", color: "var(--muted)", fontSize: "11px" }}>
              No upcoming trips, holidays, or events added yet.
            </div>
          )}
        </div>
      </div>

      <button className="primary-button full" onClick={handleSave} style={{ marginTop: "14px" }}><Check size={18} /> Save & Rearrange Schedule</button>
    </section>
  );
}

function NotificationsSheet({ state, onClose, onOpenTask, enabled, onToggle, setToast }: {
  state: AppState; onClose: () => void; onOpenTask: (task: Task) => void;
  enabled: boolean; onToggle: (val: boolean) => void; setToast: (msg: string) => void;
}) {
  const [permStatus, setPermStatus] = useState<"unknown" | "granted" | "denied">("unknown");

  useEffect(() => {
    checkNotificationPermission().then((granted) =>
      setPermStatus(granted ? "granted" : "denied")
    );
  }, [enabled]);

  const notifications = state.tasks.filter((task) => task.status === "active").map((task) => {
    const risk = assessTask(task, state.profile, state.busyBlocks, new Date(), state.calendarEvents);
    return {
      task,
      title: risk.riskLevel === "critical" ? "Rescue needed now" : risk.riskLevel === "at-risk" ? "Your runway is shrinking" : "Deadline is on track",
      body: `${task.title}: ${risk.confidenceScore}% confidence · ${formatHours(risk.requiredMinutes)} remaining`,
      risk: risk.riskLevel,
      confidenceScore: risk.confidenceScore,
    };
  });

  const handleTestNotification = async () => {
    const testTask = state.tasks.find((t) => t.status === "active");
    if (testTask) {
      const risk = assessTask(testTask, state.profile, state.busyBlocks, new Date(), state.calendarEvents);
      await scheduleTaskNotification(testTask, risk.riskLevel, risk.confidenceScore);
      setToast("📱 Test notification sent!");
    } else {
      setToast("Add a task first to test notifications");
    }
  };

  return <Sheet onClose={onClose}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
      <div>
        <span className="eyebrow">SMART NOTIFICATIONS</span>
        <h2 style={{ margin: 0 }}>What needs attention</h2>
      </div>
      <button 
        type="button"
        onClick={() => onToggle(!enabled)}
        style={{
          background: enabled ? "var(--purple-light)" : "#f1f3f5",
          color: enabled ? "var(--purple)" : "var(--muted)",
          border: "none",
          borderRadius: "12px",
          padding: "6px 12px",
          fontSize: "10px",
          fontWeight: "bold",
          cursor: "pointer",
          transition: "all 0.2s"
        }}
      >
        {enabled ? "Active" : "Paused"}
      </button>
    </div>
    
    {enabled ? (
      <>
        {/* Native notification status */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 12px", borderRadius: "10px", marginBottom: "12px",
          background: permStatus === "granted" ? "rgba(72,187,120,0.1)" : "rgba(237,137,54,0.1)",
          border: `1px solid ${permStatus === "granted" ? "rgba(72,187,120,0.25)" : "rgba(237,137,54,0.25)"}`,
        }}>
          <span style={{ fontSize: "14px" }}>{permStatus === "granted" ? "🔔" : "🔕"}</span>
          <span style={{ fontSize: "11px", color: permStatus === "granted" ? "#2f855a" : "#c05621", flex: 1 }}>
            {permStatus === "granted"
              ? "Phone notifications active — you'll get alerts even when the app is closed"
              : "Tap to enable phone notifications"}
          </span>
          {permStatus !== "granted" && (
            <button
              onClick={async () => {
                const granted = await requestNotificationPermission();
                setPermStatus(granted ? "granted" : "denied");
                if (!granted) setToast("⚠️ Please enable notifications in your phone Settings");
              }}
              style={{
                background: "var(--purple)", color: "#fff", border: "none",
                borderRadius: "8px", padding: "4px 10px", fontSize: "10px",
                fontWeight: "bold", cursor: "pointer"
              }}
            >Enable</button>
          )}
        </div>

        <p className="sheet-intro">Notifications escalate based on risk. Critical & important tasks show persistent notifications that survive "Clear All".</p>
        
        {/* Notification type legend */}
        <div style={{
          display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap"
        }}>
          <span style={{ fontSize: "9px", padding: "3px 8px", borderRadius: "6px", background: "rgba(229,62,62,0.1)", color: "#c53030" }}>🚨 Critical = Persistent</span>
          <span style={{ fontSize: "9px", padding: "3px 8px", borderRadius: "6px", background: "rgba(237,137,54,0.1)", color: "#c05621" }}>⚠️ Important = Persistent</span>
          <span style={{ fontSize: "9px", padding: "3px 8px", borderRadius: "6px", background: "rgba(66,153,225,0.1)", color: "#2b6cb0" }}>📋 Normal = Dismissible</span>
        </div>

        <div className="notification-list">
          {notifications.map((item) => <button key={item.task.id} onClick={() => onOpenTask(item.task)}>
            <i className={item.risk}><Bell size={16} /></i><span><strong>{item.title}</strong><small>{item.body}</small></span><ChevronRight size={16} />
          </button>)}
          {!notifications.length && <div className="empty-mini"><ShieldCheck size={25} /><h3>You are all caught up</h3></div>}
        </div>

        {/* Test notification button */}
        {permStatus === "granted" && notifications.length > 0 && (
          <button
            onClick={handleTestNotification}
            style={{
              marginTop: "12px", width: "100%", padding: "10px",
              background: "linear-gradient(135deg, var(--purple-light), rgba(139,92,246,0.15))",
              color: "var(--purple)", border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "12px", fontSize: "12px", fontWeight: "600",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "6px", transition: "all 0.2s"
            }}
          >
            <Bell size={14} /> Send Test Notification
          </button>
        )}
      </>
    ) : (
      <div className="empty-mini" style={{ padding: "45px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <BellOff size={28} style={{ color: "var(--muted)", marginBottom: "12px" }} />
        <h3 style={{ margin: "0 0 6px 0", fontSize: "14px", color: "var(--ink)" }}>Notifications are paused</h3>
        <p style={{ fontSize: "11px", color: "var(--muted)", margin: "0 0 16px 0", textAlign: "center", lineHeight: "1.4" }}>
          Turn them on to get real phone notifications with action buttons — mark tasks done, snooze, or start right from the notification bar.
        </p>
        <button className="primary-button" style={{ padding: "8px 18px", fontSize: "12px" }} onClick={() => onToggle(true)}>
          Enable notifications
        </button>
      </div>
    )}
  </Sheet>;
}

function ChatSheet({ state, activeId, onActive, onClose, onChange, onUpdateState, startInVoiceMode, onClearStartInVoiceMode }: {
  state: AppState; activeId: string; onActive: (id: string) => void; onClose: () => void;
  onChange: (sessions: ChatSession[]) => void;
  onUpdateState: (fn: (current: AppState) => AppState) => void;
  startInVoiceMode?: boolean;
  onClearStartInVoiceMode?: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const active = state.chatSessions.find((chat) => chat.id === activeId) ?? state.chatSessions[0];

  const stateRef = useRef(state);
  const activeIdRef = useRef(activeId);
  const activeRef = useRef(active);
  const isThinkingRef = useRef(isThinking);
  const voiceOutputRef = useRef(voiceOutput);
  const inputRef = useRef(input);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { isThinkingRef.current = isThinking; }, [isThinking]);
  useEffect(() => { voiceOutputRef.current = voiceOutput; }, [voiceOutput]);
  useEffect(() => { inputRef.current = input; }, [input]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  // Scroll instantly on chat swap or view change
  useEffect(() => {
    scrollToBottom(false);
  }, [active?.id, showHistory]);

  // Scroll smoothly on new messages or thinking status
  useEffect(() => {
    scrollToBottom(true);
  }, [active?.messages?.length, isThinking]);
  
  // Stop speaking when sheet is closed
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (startInVoiceMode) {
      setVoiceOutput(true);
      const timer = setTimeout(() => {
        startVoice();
      }, 300);
      onClearStartInVoiceMode?.();
      return () => clearTimeout(timer);
    }
  }, [startInVoiceMode]);

  const toggleVoiceOutput = () => {
    setVoiceOutput(prev => {
      const next = !prev;
      if (!next && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  const newChat = () => {
    const chat: ChatSession = { id: crypto.randomUUID(), title: "New conversation", updatedAt: new Date().toISOString(), messages: [] };
    onChange([chat, ...state.chatSessions]); onActive(chat.id); setShowHistory(false);
  };
  
  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsRecording(true);
    setListening(true);
    setRecordingTime(0);

    const timer = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    if (!SpeechRecognition) {
      setTimeout(() => {
        clearInterval(timer);
        setIsRecording(false);
        setListening(false);
        
        let simulatedText = "I have a Software Engineering assignment.";
        const currentActive = activeRef.current;
        if (currentActive?.draftTask) {
          if (currentActive.draftTask.stage === "deadline") simulatedText = "Next Friday.";
          else if (currentActive.draftTask.stage === "effort") simulatedText = "Maybe 8 to 10 hours.";
          else if (currentActive.draftTask.stage === "type") simulatedText = "Individual.";
          else if (currentActive.draftTask.stage === "confirm") simulatedText = "Yes.";
        } else {
          const num = currentActive?.messages.length || 0;
          if (num === 0) simulatedText = "I have a Software Engineering assignment.";
          else if (num === 2) simulatedText = "I am going on a trip from the 5th to the 9th.";
          else if (num === 4) simulatedText = "I cannot work tonight. Reschedule everything.";
          else simulatedText = "What should I work on today?";
        }
        send(simulatedText);
      }, 2000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setListening(true);
      setIsRecording(true);
    };
    recognition.onend = () => {
      setListening(false);
      setIsRecording(false);
      clearInterval(timer);
    };
    recognition.onerror = () => {
      setListening(false);
      setIsRecording(false);
      clearInterval(timer);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      send(transcript);
    };
    recognition.start();
  };

  const stopVoice = () => {
    setIsRecording(false);
    setListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const send = async (textToSend?: string) => {
    const currentActive = activeRef.current;
    const currentIsThinking = isThinkingRef.current;
    const currentState = stateRef.current;

    const text = (textToSend !== undefined ? textToSend : inputRef.current).trim();
    if (!text || !currentActive || currentIsThinking) return;
    const now = new Date().toISOString();
    const userMsgId = crypto.randomUUID();
    
    // Add user message first
    const updatedMessages = [
      ...currentActive.messages,
      { id: userMsgId, role: "user" as const, text, createdAt: now }
    ];
    
    onChange(currentState.chatSessions.map((chat) => chat.id !== currentActive.id ? chat : {
      ...chat,
      title: chat.messages.length ? chat.title : text.slice(0, 32),
      updatedAt: now,
      messages: updatedMessages
    }));
    
    setInput("");
    setIsThinking(true);
    
    try {
      const { text: coachAnswer, actions, draftTask: updatedDraft } = await askGeminiCoach(text, currentState, currentActive.messages, currentActive.draftTask);
      const assistantMsgId = crypto.randomUUID();
      const assistantNow = new Date().toISOString();
      
      onChange(currentState.chatSessions.map((chat) => chat.id !== currentActive.id ? chat : {
        ...chat,
        updatedAt: assistantNow,
        draftTask: updatedDraft !== undefined ? updatedDraft : chat.draftTask,
        messages: [
          ...updatedMessages,
          { id: assistantMsgId, role: "assistant" as const, text: coachAnswer, createdAt: assistantNow }
        ]
      }));

      // Speak answer if enabled
      if (voiceOutputRef.current && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(coachAnswer);
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith("en"));
        if (enVoice) utterance.voice = enVoice;
        window.speechSynthesis.speak(utterance);
      }

      // Execute actions returned by the coach using advanced scheduling
      if (actions && actions.length > 0) {
        actions.forEach((action) => {
          if (action.type === "create_task") {
            const { title, deadline, estimatedMinutes, priority, consequence, projectType } = action.payload;
            onUpdateState((current) => {
              const newTask: Task = {
                id: crypto.randomUUID(),
                title,
                deadline,
                estimatedMinutes,
                priority: priority || "important",
                consequence: consequence || "Important course requirement.",
                status: "active",
                createdAt: new Date().toISOString(),
                subtasks: [
                  { id: crypto.randomUUID(), title: "Understand requirements & prep work", minutes: Math.round(estimatedMinutes * 0.25), completed: false },
                  { id: crypto.randomUUID(), title: "Develop core implementation", minutes: Math.round(estimatedMinutes * 0.5), completed: false },
                  { id: crypto.randomUUID(), title: "Review, test & submit", minutes: Math.round(estimatedMinutes * 0.25), completed: false }
                ]
              };
              
              const existingSchedule: ScheduledBlock[] = current.plans
                .filter(p => p.approvalStatus === "approved" && p.taskId !== newTask.id)
                .flatMap(p => p.blocks.map(b => ({
                  id: b.id,
                  taskId: p.taskId,
                  taskTitle: current.tasks.find(t => t.id === p.taskId)?.title || "Task",
                  subtaskTitle: b.title,
                  start: b.start,
                  end: b.end,
                  minutes: b.minutes,
                  difficulty: "medium" as const,
                  status: b.status
                })));

              const scheduled = autoScheduleTask(newTask, current.profile, current.busyBlocks, existingSchedule, new Date());
              
              const blocks: PlanBlock[] = scheduled.map((s) => ({
                id: s.id,
                title: s.subtaskTitle,
                start: s.start,
                end: s.end,
                minutes: s.minutes,
                status: s.status,
              }));

              const plan: RescuePlan = {
                id: Math.random().toString(36).slice(2, 10),
                taskId: newTask.id,
                blocks,
                scopeDecisions: ["AI coach scheduled task core milestones."],
                assumptions: ["15-minute breaks protected"],
                approvalStatus: "approved"
              };

              return {
                ...current,
                tasks: [newTask, ...current.tasks],
                plans: [...current.plans.filter((p) => p.taskId !== newTask.id), plan]
              };
            });
          } else if (action.type === "add_busy_block") {
            const { title, start, end, source, flexibility, energy } = action.payload;
            onUpdateState((current) => {
              const newBlock: AvailabilityBlock = {
                id: crypto.randomUUID(),
                title,
                start,
                end,
                source: source || "trip",
                flexibility: flexibility || "fixed",
                energy: energy || "low"
              };
              
              const combinedBusy = [...current.busyBlocks, newBlock];
              let updatedPlans = [...current.plans];
              current.tasks.forEach((t) => {
                if (t.status === "active") {
                  const otherPlans = updatedPlans.filter(p => p.approvalStatus === "approved" && p.taskId !== t.id);
                  const existingSchedule = otherPlans.flatMap(p => p.blocks.map(b => ({
                    id: b.id,
                    taskId: p.taskId,
                    taskTitle: current.tasks.find(t2 => t2.id === p.taskId)?.title || "Task",
                    subtaskTitle: b.title,
                    start: b.start,
                    end: b.end,
                    minutes: b.minutes,
                    difficulty: "medium" as const,
                    status: b.status
                  })));
                  const scheduled = autoScheduleTask(t, current.profile, combinedBusy, existingSchedule, new Date());
                  const blocks = scheduled.map(s => ({
                    id: s.id,
                    title: s.subtaskTitle,
                    start: s.start,
                    end: s.end,
                    minutes: s.minutes,
                    status: s.status
                  }));
                  const plan = {
                    id: Math.random().toString(36).slice(2, 10),
                    taskId: t.id,
                    blocks,
                    scopeDecisions: ["Rescheduled dynamically by AI coach around commitment"],
                    assumptions: ["15-minute recovery breaks protected"],
                    approvalStatus: "approved" as const
                  };
                  updatedPlans = [...updatedPlans.filter((p) => p.taskId !== t.id), plan];
                }
              });

              return {
                ...current,
                busyBlocks: combinedBusy,
                plans: updatedPlans
              };
            });
          } else if (action.type === "reschedule_everything") {
            onUpdateState((current) => {
              let updatedPlans = [...current.plans];
              current.tasks.forEach((t) => {
                if (t.status === "active") {
                  const otherPlans = updatedPlans.filter(p => p.approvalStatus === "approved" && p.taskId !== t.id);
                  const existingSchedule = otherPlans.flatMap(p => p.blocks.map(b => ({
                    id: b.id,
                    taskId: p.taskId,
                    taskTitle: current.tasks.find(t2 => t2.id === p.taskId)?.title || "Task",
                    subtaskTitle: b.title,
                    start: b.start,
                    end: b.end,
                    minutes: b.minutes,
                    difficulty: "medium" as const,
                    status: b.status
                  })));
                  const scheduled = autoScheduleTask(t, current.profile, current.busyBlocks, existingSchedule, new Date());
                  const blocks = scheduled.map(s => ({
                    id: s.id,
                    title: s.subtaskTitle,
                    start: s.start,
                    end: s.end,
                    minutes: s.minutes,
                    status: s.status
                  }));
                  const plan = {
                    id: Math.random().toString(36).slice(2, 10),
                    taskId: t.id,
                    blocks,
                    scopeDecisions: ["Complete rescheduled overhaul"],
                    assumptions: ["15-minute breaks protected"],
                    approvalStatus: "approved" as const
                  };
                  updatedPlans = [...updatedPlans.filter((p) => p.taskId !== t.id), plan];
                }
              });
              return {
                ...current,
                plans: updatedPlans
              };
            });
          }
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  };
  
  return <Sheet onClose={onClose} tall>
    <div className="chat-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "10px", marginBottom: "10px" }}>
      <div>
        <span className="eyebrow">CLUTCH COACH</span>
        <h2 style={{ fontSize: "16px", fontWeight: "700" }}>{active?.title ?? "New conversation"}</h2>
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button 
          aria-label="Toggle voice output" 
          onClick={toggleVoiceOutput} 
          title={voiceOutput ? "Turn voice output off" : "Turn voice output on"}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            width: "32px", 
            height: "32px", 
            border: "1px solid var(--line)", 
            borderRadius: "50%", 
            background: voiceOutput ? "var(--green-light)" : "white", 
            color: voiceOutput ? "var(--green)" : "var(--muted)", 
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          {voiceOutput ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button 
          aria-label="Chat history" 
          onClick={() => setShowHistory(!showHistory)} 
          title={showHistory ? "Back to chat" : "View all conversations"}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            width: "32px", 
            height: "32px", 
            border: "1px solid var(--line)", 
            borderRadius: "50%", 
            background: showHistory ? "var(--purple-light)" : "white", 
            color: "var(--purple)", 
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <History size={16} />
        </button>
        <button 
          aria-label="New chat" 
          onClick={newChat} 
          title="Start new conversation"
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            width: "32px", 
            height: "32px", 
            border: "1px solid var(--line)", 
            borderRadius: "50%", 
            background: "white", 
            color: "var(--green)", 
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
    {showHistory ? <div className="chat-history">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ fontSize: "14px", margin: 0 }}>Conversations</h3>
        <button className="back-button" style={{ margin: 0, fontSize: "11px", fontWeight: "bold" }} onClick={() => setShowHistory(false)}><ArrowLeft size={14} /> Back</button>
      </div>
      <button className="primary-button full" onClick={newChat} style={{ marginBottom: "12px" }}><Plus size={17} /> New chat</button>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", maxHeight: "40vh" }}>
        {state.chatSessions.map((chat) => (
          <button className={chat.id === active?.id ? "active" : ""} key={chat.id} style={{ display: "flex", width: "100%", textAlign: "left", padding: "10px", borderRadius: "10px", border: chat.id === active?.id ? "1.5px solid var(--purple)" : "1px solid #e4e3df", background: chat.id === active?.id ? "#f0edff" : "white", alignItems: "center", gap: "10px" }} onClick={() => { onActive(chat.id); setShowHistory(false); }}>
            <MessageCircle size={17} style={{ color: "var(--purple)" }} />
            <span style={{ flex: 1 }}>
              <strong style={{ display: "block", fontSize: "11px" }}>{chat.title}</strong>
              <small style={{ display: "block", fontSize: "9px", color: "var(--muted)" }}>{formatDistanceToNowStrict(new Date(chat.updatedAt))} ago</small>
            </span>
          </button>
        ))}
      </div>
    </div> : <>
      {!isGeminiEnabled() && (
        <div style={{
          background: "var(--yellow-light)",
          border: "1px solid #ffebc2",
          borderRadius: "10px",
          padding: "10px 12px",
          marginBottom: "10px",
          color: "#b25e00",
          fontSize: "11px",
          lineHeight: "1.4"
        }}>
          ⚠️ <strong>Offline Mode (no Gemini API Key set)</strong><br/>
          To enable full AI conversations, please add your <code>VITE_GEMINI_API_KEY</code> to a <code>.env</code> file in the project root. Using local fallback heuristics.
        </div>
      )}
      <div className="chat-messages">
        {active?.messages.map((message) => <div className={message.role} key={message.id}>{message.text}</div>)}
        {isThinking && (
          <div className="assistant" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }} />
            <span>Kavi is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-compose">
        <button 
          type="button" 
          aria-label="Voice input" 
          onClick={startVoice} 
          disabled={isThinking} 
          className={listening ? "listening" : ""} 
          style={{
            background: "transparent",
            color: "var(--muted)",
            width: "32px",
            height: "32px",
            border: 0,
            cursor: "pointer"
          }}
        >
          <Mic size={16} />
        </button>
        <input 
          value={input} 
          onChange={(event) => setInput(event.target.value)}
          disabled={isThinking}
          onKeyDown={(event) => { if (event.key === "Enter") send(); }} 
          placeholder={listening ? "Listening..." : "Tell Clutch what changed..."} 
        />
        <button aria-label="Send message" onClick={send} disabled={isThinking}><ArrowRight size={18} /></button>
      </div>
    </>}
    {isRecording && (
      <div className="voice-overlay">
        <div className="voice-card">
          <div className="voice-wave-container">
            <span className="wave-bar bar-1"></span>
            <span className="wave-bar bar-2"></span>
            <span className="wave-bar bar-3"></span>
            <span className="wave-bar bar-4"></span>
            <span className="wave-bar bar-5"></span>
          </div>
          <div className="recording-status">
            <span className="record-dot"></span>
            <span>Listening... ({recordingTime}s)</span>
          </div>
          <p className="voice-hint">Talk to Kavi naturally to schedule tasks, block times, or ask questions</p>
          <button className="primary-button" style={{ background: "#e05243", color: "white", marginTop: "10px" }} onClick={stopVoice}>Stop & Cancel</button>
        </div>
      </div>
    )}
  </Sheet>;
}

function AddTaskSheet({ persona, onClose, onAdd }: { persona: Persona; onClose: () => void; onAdd: (task: Task) => void }) {
  const [input, setInput] = useState("I have a Software Engineering project due Sunday and it will take 16 hours");
  const [parsed, setParsed] = useState<{
    title: string;
    deadline: Date;
    estimatedMinutes: number;
    subtasks?: { title: string; minutes: number }[];
  } | null>(null);
  const [consequence, setConsequence] = useState("");
  const [listening, setListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Run initial parse on mount
  useEffect(() => {
    const result = parseNaturalTask(input);
    const localUnderstanding = understandTask(result.title, result.estimatedMinutes);
    setParsed({
      title: result.title,
      deadline: result.deadline,
      estimatedMinutes: result.estimatedMinutes,
      subtasks: localUnderstanding.steps.map((s) => ({ title: s.title, minutes: s.minutes, completed: false })),
    });
    setConsequence(localUnderstanding.kind === "quick-action"
      ? "Missing this may create a late fee, interruption, or avoidable follow-up."
      : "Missing this deadline affects an important commitment.");
  }, []);

  const add = () => {
    const result = parsed ?? parseNaturalTask(input);
    const finalSubtasks = (parsed && parsed.subtasks)
      ? parsed.subtasks.map((st) => ({
          id: crypto.randomUUID(),
          title: st.title,
          minutes: Math.max(1, st.minutes),
          completed: false,
        }))
      : understandTask(result.title, result.estimatedMinutes).steps.map((step) => ({
          id: crypto.randomUUID(),
          title: step.title,
          minutes: Math.max(1, step.minutes),
          completed: false,
        }));

    onAdd({
      id: crypto.randomUUID(),
      title: result.title,
      deadline: result.deadline.toISOString(),
      estimatedMinutes: result.estimatedMinutes,
      consequence,
      priority: result.estimatedMinutes >= 480 ? "critical" : "important",
      status: "active",
      createdAt: new Date().toISOString(),
      subtasks: finalSubtasks,
    });
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsRecording(true);
    setRecordingTime(0);

    const timer = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    if (!SpeechRecognition) {
      setTimeout(() => {
        clearInterval(timer);
        setIsRecording(false);
        const simulatedText = {
          student: "Upload chemistry lab report by Sunday 11pm",
          professional: "Pay current electricity bill by tomorrow, takes 5 minutes",
          entrepreneur: "Upload pitch deck slides by Friday, takes 4 hours",
        }[persona] || "Pay current bill";
        
        setInput(simulatedText);
        const result = parseNaturalTask(simulatedText);
        const localUnderstanding = understandTask(result.title, result.estimatedMinutes);
        setParsed({
          title: result.title,
          deadline: result.deadline,
          estimatedMinutes: result.estimatedMinutes,
          subtasks: localUnderstanding.steps.map((s) => ({ title: s.title, minutes: s.minutes, completed: false })),
        });
        setConsequence(localUnderstanding.kind === "quick-action"
          ? "Missing this may create a late fee, interruption, or avoidable follow-up."
          : "Missing this deadline affects an important commitment.");
      }, 3000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      setIsRecording(false);
      clearInterval(timer);
    };
    recognition.onerror = () => {
      setListening(false);
      setIsRecording(false);
      clearInterval(timer);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      const result = parseNaturalTask(transcript);
      const localUnderstanding = understandTask(result.title, result.estimatedMinutes);
      setParsed({
        title: result.title,
        deadline: result.deadline,
        estimatedMinutes: result.estimatedMinutes,
        subtasks: localUnderstanding.steps.map((s) => ({ title: s.title, minutes: s.minutes, completed: false })),
      });
      setConsequence(localUnderstanding.kind === "quick-action"
        ? "Missing this may create a late fee, interruption, or avoidable follow-up."
        : "Missing this deadline affects an important commitment.");
    };
    recognition.start();
  };

  const stopVoice = () => {
    setIsRecording(false);
    setListening(false);
  };

  const handleUnderstand = async () => {
    setIsAnalyzing(true);
    try {
      const parsedTask = await understandTaskWithGemini(input);
      setParsed({
        title: parsedTask.title,
        deadline: new Date(parsedTask.deadline),
        estimatedMinutes: parsedTask.estimatedMinutes,
        subtasks: parsedTask.subtasks,
      });
      setConsequence(parsedTask.consequence);
    } catch (err) {
      console.error(err);
      const result = parseNaturalTask(input);
      setParsed(result);
      if (!consequence) {
        const kind = understandTask(result.title, result.estimatedMinutes).kind;
        setConsequence(kind === "quick-action"
          ? "Missing this may create a late fee, interruption, or avoidable follow-up."
          : "Missing this deadline affects an important commitment.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const resultStr = reader.result as string;
        const base64Data = resultStr.split(",")[1];
        const parsedTask = await analyzeImageWithGemini(base64Data, file.type);
        setParsed({
          title: parsedTask.title,
          deadline: new Date(parsedTask.deadline),
          estimatedMinutes: parsedTask.estimatedMinutes,
          subtasks: parsedTask.subtasks,
        });
        setInput(parsedTask.title);
        setConsequence(parsedTask.consequence);
        setIsAnalyzing(false);
      };
      reader.onerror = () => {
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
    }
  };

  return <Sheet onClose={onClose}>
    <span className="eyebrow">NATURAL TASK CAPTURE</span><h2>Tell me what’s coming.</h2>
    <p className="sheet-intro">Say it the way you’d tell a friend or upload an assignment screenshot. I’ll pull out the details.</p>
    
    <div className="capture-box">
      <textarea value={input} onChange={(event) => {
        const val = event.target.value;
        setInput(val);
        const result = parseNaturalTask(val);
        const localUnderstanding = understandTask(result.title, result.estimatedMinutes);
        setParsed({
          title: result.title,
          deadline: result.deadline,
          estimatedMinutes: result.estimatedMinutes,
          subtasks: localUnderstanding.steps.map((s) => ({ title: s.title, minutes: s.minutes, completed: false })),
        });
        setConsequence(localUnderstanding.kind === "quick-action"
          ? "Missing this may create a late fee, interruption, or avoidable follow-up."
          : "Missing this deadline affects an important commitment.");
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: "10px" }}>
        <button className={`voice-btn ${listening || isRecording ? "listening" : ""}`} aria-label="Voice input" onClick={startVoice}><Mic size={18} /></button>
        <button className="file-upload-btn">
          <ImagePlus size={18} />
          <span>Upload screenshot</span>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} />
        </button>
      </div>
    </div>
    
    <button className="ai-action" onClick={handleUnderstand} disabled={isAnalyzing}>
      <Sparkles size={17} /> Refine with Gemini AI
    </button>

    {isRecording && (
      <div className="voice-overlay">
        <div className="voice-card">
          <div className="voice-wave-container">
            <span className="wave-bar bar-1"></span>
            <span className="wave-bar bar-2"></span>
            <span className="wave-bar bar-3"></span>
            <span className="wave-bar bar-4"></span>
            <span className="wave-bar bar-5"></span>
          </div>
          <div className="recording-status">
            <span className="record-dot"></span>
            <span>Listening... ({recordingTime}s)</span>
          </div>
          <p className="voice-hint">Describe your task, deadline, and estimated time</p>
          <button className="primary-button" style={{ background: "#e05243", color: "white", marginTop: "10px" }} onClick={stopVoice}>Stop & Process</button>
        </div>
      </div>
    )}

    {isAnalyzing && (
      <div className="ai-loading-overlay">
        <div className="spinner" />
        <h2 style={{ fontSize: "14px", margin: "5px 0" }}>Gemini is analyzing...</h2>
        <p style={{ fontSize: "10px", margin: 0, color: "var(--muted)" }}>Extracting deadline, estimating effort, and mapping subtasks.</p>
      </div>
    )}

    {parsed && !isAnalyzing && <div className="parsed-card">
      <span><CheckCircle2 size={17} /> I found the essentials</span>
      <div><small>Task</small><strong>{parsed.title}</strong></div>
      <div className="parsed-split"><div><small>Deadline</small><strong>{format(parsed.deadline, "EEE, MMM d · h:mm a")}</strong></div><div><small>Effort</small><strong>{formatHours(parsed.estimatedMinutes)}</strong></div></div>
      <div><small>Execution shape</small><strong>{parsed.subtasks ? `${parsed.subtasks.length} task-specific steps` : "Finish in one sitting"}</strong></div>
      <label>What happens if this slips?</label>
      <textarea value={consequence} onChange={(event) => setConsequence(event.target.value)} />
    </div>}
    
    <button className="primary-button full" disabled={!parsed || isAnalyzing} onClick={add}>Add and assess risk <ArrowRight size={18} /></button>
  </Sheet>;
}

function EditTaskSheet({ task, onClose, onSave }: {
  task: Task;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const deadlineObj = new Date(task.deadline);
  const [deadlineDate, setDeadlineDate] = useState(format(deadlineObj, "yyyy-MM-dd"));
  const [deadlineTime, setDeadlineTime] = useState(format(deadlineObj, "HH:mm"));
  const [consequence, setConsequence] = useState(task.consequence);
  const [priority, setPriority] = useState(task.priority);
  const [subtasks, setSubtasks] = useState(task.subtasks);

  const handleAddSubtask = () => {
    setSubtasks([
      ...subtasks,
      { id: crypto.randomUUID(), title: "New milestone", minutes: 30, completed: false }
    ]);
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleSubtaskChange = (id: string, field: "title" | "minutes", value: any) => {
    setSubtasks(
      subtasks.map(s => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const save = () => {
    if (!title.trim()) return;
    const finalDeadline = new Date(`${deadlineDate}T${deadlineTime}`);
    const finalMinutes = subtasks.reduce((sum, s) => sum + s.minutes, 0);

    onSave({
      ...task,
      title: title.trim(),
      deadline: finalDeadline.toISOString(),
      estimatedMinutes: finalMinutes || 30,
      consequence,
      priority,
      subtasks: subtasks.map(s => ({
        ...s,
        minutes: Math.max(1, s.minutes)
      }))
    });
  };

  return (
    <Sheet onClose={onClose} tall>
      <span className="eyebrow">EDIT COMMITMENT</span>
      <h2>Edit Task</h2>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
        <label className="input-label" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          Task Title
          <input
            type="text"
            className="text-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--line)" }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label className="input-label" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            Deadline Date
            <input
              type="date"
              className="text-input"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--line)" }}
            />
          </label>
          <label className="input-label" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            Deadline Time
            <div style={{ marginTop: "4px" }}>
              <TimeSelectPicker value={deadlineTime} onChange={setDeadlineTime} />
            </div>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label className="input-label" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            Priority
            <select
              className="select-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--line)" }}
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>Total Effort</span>
            <strong style={{ fontSize: "16px", color: "var(--purple)", marginTop: "4px" }}>
              {formatHours(subtasks.reduce((sum, s) => sum + s.minutes, 0))}
            </strong>
          </div>
        </div>

        <label className="input-label" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          What happens if this slips? (Consequence)
          <textarea
            value={consequence}
            onChange={(e) => setConsequence(e.target.value)}
            placeholder="e.g. Worth 25% of grade"
            style={{
              width: "100%",
              minHeight: "60px",
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              fontFamily: "inherit",
              fontSize: "12px",
              resize: "vertical"
            }}
          />
        </label>

        <div>
          <span className="input-label" style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Milestones Checklist</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }} className="no-scrollbar">
            {subtasks.map((sub, idx) => (
              <div key={sub.id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input
                  type="text"
                  className="text-input"
                  value={sub.title}
                  onChange={(e) => handleSubtaskChange(sub.id, "title", e.target.value)}
                  placeholder={`Milestone ${idx + 1}`}
                  style={{ flex: 3, padding: "6px 8px", borderRadius: "6px", fontSize: "11px", border: "1px solid var(--line)", background: "white", color: "var(--ink)" }}
                />
                <input
                  type="number"
                  className="text-input"
                  value={sub.minutes}
                  onChange={(e) => handleSubtaskChange(sub.id, "minutes", parseInt(e.target.value) || 0)}
                  placeholder="Mins"
                  style={{ flex: 1, padding: "6px 8px", borderRadius: "6px", fontSize: "11px", border: "1px solid var(--line)", textAlign: "center", background: "white", color: "var(--ink)" }}
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSubtask(sub.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--red)",
                    padding: "4px"
                  }}
                  title="Remove milestone"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {subtasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "10px", color: "var(--muted)", fontSize: "11px" }}>
                No milestones defined. Add at least one milestone.
              </div>
            )}
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={handleAddSubtask}
            style={{ width: "100%", padding: "6px", fontSize: "11px", marginTop: "8px" }}
          >
            + Add Milestone
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button className="secondary-button" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        <button className="primary-button warm" style={{ flex: 2, margin: 0 }} onClick={save} disabled={!title.trim() || subtasks.length === 0}>
          Save Changes
        </button>
      </div>
    </Sheet>
  );
}

function RiskSheet({ task, assessment, onClose, onSimulate, onRescue, onComplete, onEdit, onToggleComplete }: {
  task: Task; assessment: ReturnType<typeof assessTask>; onClose: () => void; onSimulate: () => void; onRescue: () => void;
  onComplete: (taskId: string, subtaskId: string) => void;
  onEdit: () => void;
  onToggleComplete: () => void;
}) {
  return <Sheet onClose={onClose} tall>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
      <div>
        <span className="eyebrow danger">RISK BREAKDOWN</span>
        <h2 style={{ margin: 0 }}>{task.title}</h2>
      </div>
      <button
        type="button"
        onClick={onEdit}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "var(--purple)",
          padding: "4px 8px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "12px",
          fontWeight: "600",
          borderRadius: "6px"
        }}
      >
        <Pencil size={14} /> Edit
      </button>
    </div>
    <div className="risk-summary">
      <ConfidenceRing score={assessment.confidenceScore} large />
      <div><span className={`risk-word ${assessment.riskLevel}`}>{assessment.riskLevel.replace("-", " ")}</span><p>Completion confidence</p></div>
    </div>
    <div className="reality-equation">
      <div><span>You need</span><strong>{formatHours(assessment.requiredMinutes)}</strong></div>
      <span>but only have</span>
      <div className="warning"><span>Real focus time</span><strong>{formatHours(assessment.usableMinutes)}</strong></div>
    </div>

    <h3 style={{ marginTop: "14px", marginBottom: "8px" }}>Milestones Checklist</h3>
    <div className="sheet-subtask-list">
      {task.subtasks.map((sub) => (
        <button 
          key={sub.id} 
          className={`sheet-subtask-item ${sub.completed ? "completed" : ""}`}
          onClick={() => onComplete(task.id, sub.id)}
        >
          <span className="sheet-subtask-check">
            {sub.completed && <Check size={12} />}
          </span>
          <span className="sheet-subtask-title">{sub.title}</span>
          <span className="sheet-subtask-duration">{formatHours(sub.minutes)}</span>
        </button>
      ))}
    </div>

    <h3>What’s pushing the risk up</h3>
    <div className="factor-list">{assessment.riskFactors.map((factor) => <div key={factor}><CircleAlert size={17} /><span>{factor}</span></div>)}</div>
    <div className="heuristic-note"><ShieldCheck size={17} /><p><strong>An honest estimate, not a crystal ball.</strong> {assessment.explanation}</p></div>
    <div className="sheet-actions" style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
      <div style={{ display: "flex", gap: "8px", width: "100%" }}>
        <button className="secondary-button" style={{ flex: 1 }} onClick={onSimulate}><Zap size={17} /> Try “what if?”</button>
        {task.status === "active" ? (
          <button className="primary-button" style={{ flex: 1 }} onClick={onRescue}><WandSparkles size={17} /> Rescue this</button>
        ) : (
          <button className="primary-button" style={{ flex: 1, background: "var(--purple)", color: "white" }} onClick={onToggleComplete}><CheckCircle2 size={17} /> Reactivate</button>
        )}
      </div>
      {task.status === "active" && (
        <button
          className="secondary-button full"
          onClick={onToggleComplete}
          style={{ background: "#f8f9fa", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
        >
          <CheckCircle2 size={16} /> Mark Task Completed
        </button>
      )}
    </div>
  </Sheet>;
}

function SimulatorSheet({ task, assessment, onClose }: { task: Task; assessment: ReturnType<typeof assessTask>; onClose: () => void }) {
  const options = simulateOptions(assessment);
  return <Sheet onClose={onClose}>
    <span className="eyebrow">FUTURE SIMULATOR</span><h2>One choice changes the runway.</h2>
    <p className="sheet-intro">Here’s what happens to <strong>{task.title}</strong> under three realistic decisions.</p>
    <div className="option-list">{options.map((option, index) => <div className={`option-card ${option.tone}`} key={option.label}>
      <span className="option-index">{String.fromCharCode(65 + index)}</span>
      <div><strong>{option.label}</strong><small>{option.detail}</small></div>
      <span className="option-score">{option.score}%</span>
    </div>)}</div>
    <div className="simulator-callout"><Sparkles size={18} /><p><strong>Your best move:</strong> start one short block tonight. You’re not committing to the whole mountain—just the first foothold.</p></div>
    <button className="primary-button full" onClick={onClose}>Use this insight <Check size={17} /></button>
  </Sheet>;
}

function RescueSheet({ task, plan, onClose, onGenerate, onApprove, onMissed }: {
  task: Task; plan?: RescuePlan; onClose: () => void; onGenerate: (task: Task) => void; onApprove: (plan: RescuePlan) => void; onMissed: () => void;
}) {
  useEffect(() => { if (!plan) onGenerate(task); }, [plan, onGenerate, task]);
  if (!plan) return <Sheet onClose={onClose}><div className="generating"><div className="loader" /><h2>Building your rescue route…</h2><p>Protecting focus time and cutting avoidable scope.</p></div></Sheet>;
  const total = plan.blocks.reduce((sum, block) => sum + block.minutes, 0);
  return <Sheet onClose={onClose} tall>
    <div className="plan-head">
      <div><span className="eyebrow success">RESCUE PLAN READY</span><h2>A finishable path.</h2></div>
      <div className="saved-badge"><ShieldCheck size={18} /> {formatHours(total)} protected</div>
    </div>
    <p className="sheet-intro">ClutchAI found the safest route to a complete core for <strong>{task.title}</strong>.</p>
    <div className="timeline">
      {plan.blocks.slice(0, 5).map((block, index) => <div className="timeline-item" key={block.id}>
        <div className="timeline-rail"><span>{index + 1}</span>{index < Math.min(4, plan.blocks.length - 1) && <i />}</div>
        <div className="timeline-card">
          <span>{format(new Date(block.start), "EEE · h:mm a")} – {format(new Date(block.end), "h:mm a")}</span>
          <strong>{block.title}</strong>
          <small>{formatHours(block.minutes)} focused{block.minutes >= 45 ? " · 15m recovery after" : " · one sitting"}</small>
        </div>
      </div>)}
    </div>
    <div className="scope-box"><span><Zap size={16} /> SMART SCOPE</span>{plan.scopeDecisions.map((decision) => <p key={decision}><Check size={14} />{decision}</p>)}</div>
    {plan.approvalStatus === "draft" ? <>
      <div className="approval-note"><CalendarDays size={17} /><span><strong>Nothing changes without you.</strong><small>Review these blocks, then approve to protect them.</small></span></div>
      <button className="primary-button full" onClick={() => onApprove(plan)}><Check size={17} /> Approve and protect time</button>
    </> : <>
      <div className="approved-banner"><CheckCircle2 size={19} /><span><strong>Plan protected</strong><small>Your focus blocks are approved.</small></span></div>
      <button className="secondary-button full" onClick={onMissed}><RotateCcw size={17} /> Simulate a missed block</button>
    </>}
  </Sheet>;
}

function Sheet({ children, onClose, tall = false }: { children: React.ReactNode; onClose: () => void; tall?: boolean }) {
  return <div className="sheet-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className={`sheet ${tall ? "tall" : ""}`}>
      <div className="sheet-header">
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose} aria-label="Close sheet"><X size={19} /></button>
      </div>
      <div className="sheet-content-scrollable no-scrollbar">
        {children}
      </div>
    </section>
  </div>;
}

function ConfidenceRing({ score, large = false }: { score: number; large?: boolean }) {
  const color = score < 35 ? "#e05243" : score < 70 ? "#e89a2f" : "#2a9d72";
  return <div className={`confidence-ring ${large ? "large" : ""}`} style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,.18) 0deg)` }}>
    <div><strong>{score}%</strong><span>confidence</span></div>
  </div>;
}

function NavButton({ icon: Icon, label, active, onClick }: { icon: typeof Home; label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}><Icon size={20} fill={active ? "currentColor" : "none"} /><span>{label}</span></button>;
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 24 }, (_, index) => ({
    left: `${Math.random() * 100}%`, delay: `${Math.random() * .35}s`, color: ["#f5b942", "#2a9d72", "#e05243", "#5f6fff"][index % 4],
  })), []);
  return <div className="confetti">{pieces.map((piece, index) => <i key={index} style={{ left: piece.left, animationDelay: piece.delay, background: piece.color }} />)}</div>;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

```

---

