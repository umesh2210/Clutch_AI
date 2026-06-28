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
