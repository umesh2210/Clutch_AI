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
