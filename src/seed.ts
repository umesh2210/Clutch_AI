import { addDays, set } from "date-fns";
import type { AppState, AvailabilityBlock, Persona, Task, RoutineBlock, CalendarEvent } from "./types";
import { expandRoutineToBlocks } from "./engine";

const at = (dayOffset: number, hour: number, minute = 0) =>
  set(addDays(new Date(), dayOffset), { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 }).toISOString();

export function routineBlocksFor(persona: Persona): RoutineBlock[] {
  if (persona === "student") {
    return [
      {
        id: "student-college",
        title: "College Lectures",
        startTime: "08:00",
        endTime: "16:00",
        daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
        category: "school",
        isFixed: true,
        energy: "medium",
      },
      {
        id: "student-tuition",
        title: "Tuition & Prep",
        startTime: "17:00",
        endTime: "18:00",
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        category: "tuition",
        isFixed: true,
        energy: "high",
      },
    ];
  } else if (persona === "professional") {
    return [
      {
        id: "prof-work",
        title: "Office Work",
        startTime: "09:00",
        endTime: "18:00",
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        category: "work",
        isFixed: true,
        energy: "medium",
      },
      {
        id: "prof-gym",
        title: "Gym Session",
        startTime: "07:00",
        endTime: "08:00",
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        category: "gym",
        isFixed: false,
        energy: "high",
      },
    ];
  } else {
    return [
      {
        id: "ent-client",
        title: "Client Meetings",
        startTime: "10:00",
        endTime: "13:00",
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        category: "work",
        isFixed: true,
        energy: "high",
      },
      {
        id: "ent-network",
        title: "Networking & Learning",
        startTime: "18:00",
        endTime: "20:00",
        daysOfWeek: [2, 4], // Tue, Thu
        category: "other",
        isFixed: false,
        energy: "medium",
      },
    ];
  }
}

export function sampleEvents(persona: Persona): CalendarEvent[] {
  const dateStr = (dayOffset: number) => {
    const date = addDays(new Date(), dayOffset);
    return date.toISOString().split("T")[0];
  };

  if (persona === "student") {
    return [
      {
        id: "stud-trip",
        title: "Hyderabad Trip",
        startDate: dateStr(4),
        endDate: dateStr(5),
        type: "trip",
        isFullDay: true,
        blocksProductivity: true,
      },
      {
        id: "stud-exam",
        title: "Mid-semester Exams",
        startDate: dateStr(8),
        endDate: dateStr(10),
        type: "exam",
        isFullDay: false,
        startTime: "09:00",
        endTime: "12:00",
        blocksProductivity: true,
      },
    ];
  } else if (persona === "professional") {
    return [
      {
        id: "prof-offsite",
        title: "Team Offsite",
        startDate: dateStr(5),
        endDate: dateStr(6),
        type: "other",
        isFullDay: true,
        blocksProductivity: true,
      },
      {
        id: "prof-diwali",
        title: "Diwali Holiday",
        startDate: dateStr(10),
        endDate: dateStr(10),
        type: "holiday",
        isFullDay: true,
        blocksProductivity: true,
      },
    ];
  } else {
    return [
      {
        id: "ent-summit",
        title: "Startup Summit",
        startDate: dateStr(3),
        endDate: dateStr(4),
        type: "other",
        isFullDay: true,
        blocksProductivity: true,
      },
      {
        id: "ent-wedding",
        title: "Family Wedding",
        startDate: dateStr(8),
        endDate: dateStr(9),
        type: "family",
        isFullDay: true,
        blocksProductivity: true,
      },
    ];
  }
}

export function seedTask(persona: Persona): Task {
  const config = {
    student: {
      title: "Software Engineering Project",
      consequence: "Worth 25% of your grade. Missing it means losing the chance to demo in class.",
      subtasks: ["Define core user flow", "Build working prototype", "Test and fix critical paths", "Prepare final submission"],
    },
    professional: {
      title: "Quarterly Client Proposal",
      consequence: "The client review is fixed. A late proposal risks the renewal conversation.",
      subtasks: ["Review client data", "Draft recommendation", "Build proposal deck", "Final review and send"],
    },
    entrepreneur: {
      title: "Investor Demo Build",
      consequence: "The investor call cannot move. A broken core flow weakens the fundraising story.",
      subtasks: ["Lock demo story", "Build golden path", "Add proof metrics", "Rehearse and stabilize"],
    },
  }[persona];
  const minutes = [180, 360, 240, 180];
  return {
    id: "flagship-task",
    title: config.title,
    deadline: at(5, 22),
    estimatedMinutes: 960,
    consequence: config.consequence,
    priority: "critical",
    status: "active",
    createdAt: new Date().toISOString(),
    subtasks: config.subtasks.map((title, index) => ({
      id: `sub-${index}`,
      title,
      minutes: minutes[index],
      completed: false,
    })),
  };
}

export function initialState(): AppState {
  const streakHistory = Array.from({ length: 21 }, (_, index) => {
    const date = addDays(new Date(), index - 20);
    return {
      date: date.toISOString(),
      completed: 0,
      planned: 0,
      status: "rest" as const,
    };
  });
  return {
    profile: {
      name: "",
      persona: "student",
      wakeTime: "07:00",
      sleepTime: "23:00",
      focusPreference: "morning",
      reliability: 100,
      xp: 0,
      streak: 0,
      onboardingComplete: false,
      weeklyHolidays: [0],
      holidayMode: "rest",
      productivityPeak: "morning",
    },
    tasks: [],
    busyBlocks: [],
    routineBlocks: [],
    calendarEvents: [],
    plans: [],
    streakHistory,
    chatSessions: [{
      id: "welcome-chat",
      title: "Getting back on track",
      updatedAt: new Date().toISOString(),
      messages: [{
        id: "welcome-message",
        role: "assistant",
        text: "I am watching your deadlines and real capacity. Tell me what changed, and I will replan around it.",
        createdAt: new Date().toISOString(),
      }],
    }],
  };
}

export function demoState(persona: Persona): AppState {
  const state = initialState();
  state.profile = {
    ...state.profile,
    name: persona === "student" ? "Aarav" : persona === "professional" ? "Maya" : "Rohan",
    persona,
    onboardingComplete: true,
    weeklyHolidays: persona === "student" ? [0] : persona === "professional" ? [0, 6] : [0],
    holidayMode: "rest",
    productivityPeak: persona === "student" ? "night" : persona === "professional" ? "morning" : "afternoon",
    focusPreference: persona === "student" ? "night" : persona === "professional" ? "morning" : "afternoon",
    xp: 240,
    streak: 4,
    reliability: 62,
  };
  state.routineBlocks = routineBlocksFor(persona);
  state.calendarEvents = sampleEvents(persona);
  state.tasks = [seedTask(persona)];
  state.busyBlocks = expandRoutineToBlocks(
    state.routineBlocks,
    state.calendarEvents,
    state.profile,
    new Date(),
    addDays(new Date(), 21),
  );
  
  // Populate demo streakHistory with mock data
  state.streakHistory = Array.from({ length: 21 }, (_, index) => {
    const date = addDays(new Date(), index - 20);
    const missed = [3, 10, 16].includes(index);
    const rest = [6, 13].includes(index);
    const planned = rest ? 0 : 2 + (index % 3);
    return {
      date: date.toISOString(),
      completed: missed || rest ? 0 : Math.min(planned, 1 + (index % 4)),
      planned,
      status: rest ? "rest" as const : missed ? "missed" as const : "success" as const,
    };
  });
  
  return state;
}
