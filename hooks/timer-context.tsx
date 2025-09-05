import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { Timer } from "@/types/resource";
import * as Notifications from "expo-notifications";
import { Platform, AppState, Alert } from "react-native";

const TIMERS_KEY = "dune_timers";
const TIMER_NOTIFICATIONS_KEY = "dune_timer_notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface TimerNotificationRecord {
  lastNotified: number;
  thresholdPassed: boolean;
  lastReminderSent?: number; // Track last reminder notification
}

export const [TimerProvider, useTimers] = createContextHook(() => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [inAppNotifications, setInAppNotifications] = useState<{ id: string; title: string; body: string; timestamp: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationHistory = useRef<Map<string, TimerNotificationRecord>>(new Map());
  const appStateRef = useRef(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');

  const requestNotificationPermissions = useCallback(async () => {
    if (Platform.OS === "web") return;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
    }
  }, []);

  const saveTimers = useCallback(async (newTimers: Timer[]) => {
    try {
      await AsyncStorage.setItem(TIMERS_KEY, JSON.stringify(newTimers));
      setTimers(newTimers);
    } catch (error) {
      console.error("Error saving timers:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [timersData, notificationsData] = await Promise.all([
        AsyncStorage.getItem(TIMERS_KEY),
        AsyncStorage.getItem(TIMER_NOTIFICATIONS_KEY),
      ]);

      if (timersData) {
        const loadedTimers = JSON.parse(timersData) as Timer[];
        // Update active status based on current time
        const updatedTimers = loadedTimers.map(timer => ({
          ...timer,
          isActive: timer.endTime > Date.now()
        }));
        setTimers(updatedTimers);
      }

      if (notificationsData !== null) {
        setNotificationsEnabled(JSON.parse(notificationsData));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);

  const sendInAppNotification = useCallback((title: string, body: string, requiresInteraction: boolean = false) => {
    if (requiresInteraction) {
      // Show alert that requires user interaction
      Alert.alert(
        title,
        body,
        [
          {
            text: "OK",
            onPress: () => console.log("Timer reminder acknowledged"),
            style: "default"
          }
        ],
        { cancelable: false }
      );
    } else {
      // Show regular in-app notification
      const notification = {
        id: Date.now().toString(),
        title,
        body,
        timestamp: Date.now()
      };
      setInAppNotifications(prev => [...prev, notification]);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setInAppNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  }, []);

  const dismissInAppNotification = useCallback((id: string) => {
    setInAppNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const checkTimerNotifications = useCallback(async () => {
    if (!notificationsEnabled) return;

    const now = Date.now();
    const appIsActive = isAppActive;
    const pendingNotifications: { title: string; body: string; priority: number; sound: boolean; requiresInteraction?: boolean }[] = [];

    for (const timer of timers) {
      if (!timer.isActive) continue;

      const remaining = timer.endTime - now;
      const timerKey = `timer-${timer.id}`;
      const history = notificationHistory.current.get(timerKey);

      // Check for custom reminder notifications
      if (timer.reminder?.enabled && timer.reminder.interval > 0 && remaining > 0) {
        const lastReminder = history?.lastReminderSent || timer.startTime;
        const timeSinceLastReminder = now - lastReminder;
        
        if (timeSinceLastReminder >= timer.reminder.interval) {
          const days = Math.floor(remaining / 86400000);
          const hours = Math.floor((remaining % 86400000) / 3600000);
          const minutes = Math.floor((remaining % 3600000) / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          
          let timeStr = "";
          if (days > 0) timeStr += `${days}d `;
          if (hours > 0) timeStr += `${hours}h `;
          if (minutes > 0) timeStr += `${minutes}m `;
          if (seconds > 0 && days === 0 && hours === 0) timeStr += `${seconds}s`;
          
          pendingNotifications.push({
            title: `⏱️ ${timer.name} Reminder`,
            body: timer.reminder.message || `${timeStr.trim()} remaining on your timer`,
            priority: 2,
            sound: true,
            requiresInteraction: true
          });
          
          notificationHistory.current.set(timerKey, {
            lastNotified: history?.lastNotified || now,
            thresholdPassed: history?.thresholdPassed || false,
            lastReminderSent: now
          });
        }
      }

      if (remaining <= 0) {
        // Timer expired
        if (!history || now - history.lastNotified > 300000) { // Notify once every 5 minutes
          pendingNotifications.push({
            title: `⏰ ${timer.name} Expired`,
            body: `Your ${timer.name} timer has expired!`,
            priority: 1,
            sound: true
          });
          notificationHistory.current.set(timerKey, {
            lastNotified: now,
            thresholdPassed: true,
            lastReminderSent: history?.lastReminderSent
          });
        }
      } else if (remaining <= timer.threshold) {
        // Below threshold
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        let notificationInterval = 60000; // Default 1 minute
        let urgency = "low";
        
        if (remaining <= 30000) {
          notificationInterval = 10000; // Every 10 seconds for last 30 seconds
          urgency = "critical";
        } else if (remaining <= 60000) {
          notificationInterval = 20000; // Every 20 seconds for last minute
          urgency = "high";
        } else if (remaining <= 5 * 60000) {
          notificationInterval = 30000; // Every 30 seconds for last 5 minutes
          urgency = "medium";
        }

        if (!history || now - history.lastNotified > notificationInterval || !history.thresholdPassed) {
          const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
          
          pendingNotifications.push({
            title: urgency === "critical" ? `🚨 ${timer.name} Critical` : `⚠️ ${timer.name} Low`,
            body: `Only ${timeStr} remaining!`,
            priority: urgency === "critical" ? 1 : 2,
            sound: urgency === "critical" || urgency === "high"
          });
          
          notificationHistory.current.set(timerKey, {
            lastNotified: now,
            thresholdPassed: true,
            lastReminderSent: history?.lastReminderSent
          });
        }
      } else {
        // Above threshold, keep reminder history but clear threshold history
        if (history?.thresholdPassed) {
          notificationHistory.current.set(timerKey, {
            lastNotified: history.lastNotified,
            thresholdPassed: false,
            lastReminderSent: history.lastReminderSent
          });
        }
      }
    }

    // Send notifications based on app state
    for (const notification of pendingNotifications) {
      if (appIsActive) {
        // App is in foreground - show in-app notification or alert
        sendInAppNotification(notification.title, notification.body, notification.requiresInteraction || false);
      } else if (Platform.OS !== "web") {
        // App is in background or closed - send system notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.body,
            sound: notification.sound,
            priority: notification.priority === 1 ? 'high' : 'default',
            data: { type: 'timer-reminder' },
          },
          trigger: null,
        });
      }
    }
  }, [timers, notificationsEnabled, sendInAppNotification, isAppActive]);

  useEffect(() => {
    // Update current time every second for live countdown
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    // Check for notifications based on timer urgency
    const getCheckInterval = () => {
      const activeTimers = timers.filter(t => t.isActive);
      if (activeTimers.length === 0) return 10000; // 10 seconds if no active timers

      const now = Date.now();
      let minRemaining = Infinity;

      for (const timer of activeTimers) {
        const remaining = timer.endTime - now;
        if (remaining > 0 && remaining < minRemaining) {
          minRemaining = remaining;
        }
      }

      if (minRemaining <= 30000) return 1000; // Check every second for last 30 seconds
      if (minRemaining <= 60000) return 2000; // Check every 2 seconds for last minute
      if (minRemaining <= 5 * 60000) return 5000; // Check every 5 seconds for last 5 minutes
      
      return 10000; // Default 10 seconds
    };

    const updateInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const interval = getCheckInterval();
      
      intervalRef.current = setInterval(() => {
        // Update active status
        setTimers(prev => {
          const updated = prev.map(timer => ({
            ...timer,
            isActive: timer.endTime > Date.now()
          }));
          return updated;
        });
        
        checkTimerNotifications();
        updateInterval(); // Recalculate interval
      }, interval);
    };

    checkTimerNotifications();
    updateInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkTimerNotifications, timers]);

  const addTimer = useCallback((timer: Omit<Timer, "id" | "startTime" | "endTime" | "isActive">, days: number, hours: number, minutes: number, seconds: number) => {
    const duration = ((days * 24 + hours) * 60 + minutes) * 60 * 1000 + seconds * 1000;
    const newTimer: Timer = {
      ...timer,
      id: Date.now().toString(),
      startTime: Date.now(),
      endTime: Date.now() + duration,
      duration,
      isActive: true,
    };
    const updatedTimers = [...timers, newTimer];
    saveTimers(updatedTimers);
  }, [timers, saveTimers]);

  const updateTimer = useCallback((id: string, days: number, hours: number, minutes: number, seconds: number) => {
    const duration = ((days * 24 + hours) * 60 + minutes) * 60 * 1000 + seconds * 1000;
    const updatedTimers = timers.map((t) =>
      t.id === id ? { 
        ...t, 
        startTime: Date.now(),
        endTime: Date.now() + duration,
        duration,
        isActive: true
      } : t
    );
    saveTimers(updatedTimers);
    // Clear notification history for this timer
    notificationHistory.current.delete(`timer-${id}`);
  }, [timers, saveTimers]);

  const deleteTimer = useCallback((id: string) => {
    const updatedTimers = timers.filter((t) => t.id !== id);
    saveTimers(updatedTimers);
    notificationHistory.current.delete(`timer-${id}`);
  }, [timers, saveTimers]);

  const toggleNotifications = useCallback(async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    await AsyncStorage.setItem(TIMER_NOTIFICATIONS_KEY, JSON.stringify(newValue));
  }, [notificationsEnabled]);

  const resetTimer = useCallback((id: string) => {
    const timer = timers.find(t => t.id === id);
    if (timer) {
      const updatedTimers = timers.map((t) =>
        t.id === id ? { 
          ...t, 
          startTime: Date.now(),
          endTime: Date.now() + timer.duration,
          isActive: true
        } : t
      );
      saveTimers(updatedTimers);
      notificationHistory.current.delete(`timer-${id}`);
    }
  }, [timers, saveTimers]);

  useEffect(() => {
    loadData();
    requestNotificationPermissions();
    
    // Track app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      appStateRef.current = nextAppState;
      setIsAppActive(nextAppState === 'active');
    });
    
    return () => {
      subscription.remove();
    };
  }, [loadData, requestNotificationPermissions]);

  // Schedule background notifications for reminders when app is closed
  const scheduleBackgroundReminders = useCallback(async (timer: Timer) => {
    if (!timer.reminder?.enabled || Platform.OS === "web") return;
    
    // Cancel existing scheduled notifications for this timer
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const now = Date.now();
    const endTime = timer.endTime;
    const interval = timer.reminder.interval;
    
    // Schedule up to 10 reminder notifications
    const maxReminders = 10;
    let nextReminderTime = now + interval;
    let scheduledCount = 0;
    
    while (nextReminderTime < endTime && scheduledCount < maxReminders) {
      const remaining = endTime - nextReminderTime;
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      
      let timeStr = "";
      if (hours > 0) timeStr += `${hours}h `;
      if (minutes > 0) timeStr += `${minutes}m`;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏱️ ${timer.name} Reminder`,
          body: timer.reminder.message || `${timeStr.trim()} remaining on your timer`,
          sound: true,
          data: { type: 'timer-reminder', timerId: timer.id },
        },
        trigger: {
          date: nextReminderTime,
        } as Notifications.DateTriggerInput,
      });
      
      nextReminderTime += interval;
      scheduledCount++;
    }
  }, []);

  // Update addTimer to schedule background notifications
  const addTimerWithBackgroundNotifications = useCallback(async (timer: Omit<Timer, "id" | "startTime" | "endTime" | "isActive">, days: number, hours: number, minutes: number, seconds: number) => {
    const duration = ((days * 24 + hours) * 60 + minutes) * 60 * 1000 + seconds * 1000;
    const newTimer: Timer = {
      ...timer,
      id: Date.now().toString(),
      startTime: Date.now(),
      endTime: Date.now() + duration,
      duration,
      isActive: true,
    };
    const updatedTimers = [...timers, newTimer];
    saveTimers(updatedTimers);
    
    // Schedule background notifications if reminder is enabled
    if (newTimer.reminder?.enabled) {
      await scheduleBackgroundReminders(newTimer);
    }
  }, [timers, saveTimers, scheduleBackgroundReminders]);

  return useMemo(() => ({
    timers,
    currentTime,
    addTimer: addTimerWithBackgroundNotifications,
    updateTimer,
    deleteTimer,
    resetTimer,
    notificationsEnabled,
    toggleNotifications,
    inAppNotifications,
    dismissInAppNotification,
  }), [timers, currentTime, addTimerWithBackgroundNotifications, updateTimer, deleteTimer, resetTimer, notificationsEnabled, toggleNotifications, inAppNotifications, dismissInAppNotification]);
});