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
