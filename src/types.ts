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
