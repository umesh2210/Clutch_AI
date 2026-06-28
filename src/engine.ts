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
