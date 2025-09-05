import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { Resource, PowerTimer } from "@/types/resource";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const STORAGE_KEY = "dune_resources";
const POWER_TIMER_KEY = "dune_power_timer";
const NOTIFICATIONS_KEY = "dune_notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationRecord {
  lastNotified: number;
  level: 'critical' | 'warning' | 'info';
  count: number;
}

export const [ResourceProvider, useResources] = createContextHook(() => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [powerTimer, setPowerTimerState] = useState<PowerTimer | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationHistory = useRef<Map<string, NotificationRecord>>(new Map());
  const lastPowerNotification = useRef<{ time: number; remaining: number }>({ time: 0, remaining: 0 });

  const getNotificationCooldown = (level: 'critical' | 'warning' | 'info'): number => {
    switch (level) {
      case 'critical': return 30000; // 30 seconds for critical
      case 'warning': return 60000; // 1 minute for warnings
      case 'info': return 120000; // 2 minutes for info
      default: return 60000;
    }
  };

  const checkResourceThresholds = useCallback(async () => {
    if (!notificationsEnabled || Platform.OS === "web") return;

    const now = Date.now();
    const pendingNotifications: Array<{ title: string; body: string; priority: number }> = [];

    resources.forEach((resource) => {
      const resourceKey = `resource-${resource.id}`;
      const history = notificationHistory.current.get(resourceKey);
      
      if (resource.value <= resource.threshold) {
        const percentage = Math.round((resource.value / resource.threshold) * 100);
        let level: 'critical' | 'warning' | 'info';
        let title: string;
        let body: string;
        let priority: number;
        
        if (resource.value === 0) {
          level = 'critical';
          title = "🚨 Resource Depleted";
          body = `${resource.name} is completely depleted!`;
          priority = 1;
        } else if (percentage <= 25) {
          level = 'critical';
          title = "⚠️ Critical Resource Level";
          body = `${resource.name}: ${resource.value} (${percentage}% of safe threshold)`;
          priority = 1;
        } else if (percentage <= 50) {
          level = 'warning';
          title = "⚡ Resource Warning";
          body = `${resource.name} dropping: ${resource.value} remaining`;
          priority = 2;
        } else {
          level = 'info';
          title = "📊 Resource Update";
          body = `${resource.name}: ${resource.value} (approaching threshold)`;
          priority = 3;
        }
        
        const cooldown = getNotificationCooldown(level);
        const shouldNotify = !history || 
          now - history.lastNotified > cooldown || 
          (history.level !== level && level === 'critical');
        
        if (shouldNotify) {
          notificationHistory.current.set(resourceKey, {
            lastNotified: now,
            level,
            count: (history?.count || 0) + 1
          });
          
          pendingNotifications.push({ title, body, priority });
        }
      } else {
        // Resource recovered, clear history
        notificationHistory.current.delete(resourceKey);
      }
    });

    // Group and send notifications
    if (pendingNotifications.length > 0) {
      pendingNotifications.sort((a, b) => a.priority - b.priority);
      
      if (pendingNotifications.length === 1) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: pendingNotifications[0].title,
            body: pendingNotifications[0].body,
            sound: true,
            priority: 'high',
          },
          trigger: null,
        });
      } else {
        // Group multiple notifications
        const criticals = pendingNotifications.filter(n => n.priority === 1);
        const warnings = pendingNotifications.filter(n => n.priority === 2);
        const infos = pendingNotifications.filter(n => n.priority === 3);
        
        if (criticals.length > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: criticals.length === 1 ? criticals[0].title : `🚨 ${criticals.length} Critical Alerts`,
              body: criticals.map(n => n.body).join('\n'),
              sound: true,
              priority: 'high',
            },
            trigger: null,
          });
        }
        
        if (warnings.length > 0 && criticals.length === 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⚡ ${warnings.length} Resource Warning${warnings.length > 1 ? 's' : ''}`,
              body: warnings.map(n => n.body).join('\n'),
              sound: true,
              priority: 'default',
            },
            trigger: null,
          });
        }
        
        if (infos.length > 0 && criticals.length === 0 && warnings.length === 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `📊 Resource Updates`,
              body: infos.map(n => n.body).join('\n'),
              sound: false,
              priority: 'default',
            },
            trigger: null,
          });
        }
      }
    }
  }, [resources, notificationsEnabled]);

  const checkPowerTimer = useCallback(async () => {
    if (!notificationsEnabled || !powerTimer || Platform.OS === "web") return;

    const now = Date.now();
    const remaining = powerTimer.endTime - now;
    const timeSinceLastNotification = now - lastPowerNotification.current.time;
    
    if (remaining <= 0) {
      // Power expired
      if (timeSinceLastNotification > 300000) { // Notify once every 5 minutes after expiry
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "💀 Power Expired",
            body: "Your power has run out! Reset the timer when power is restored.",
            sound: true,
            priority: 'high',
          },
          trigger: null,
        });
        lastPowerNotification.current = { time: now, remaining: 0 };
      }
      return;
    }
    
    // Smart notification intervals based on remaining time
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    let shouldNotify = false;
    let title = "";
    let body = "";
    let minInterval = 0;
    
    if (remaining <= 10000) { // Last 10 seconds
      minInterval = 3000; // Every 3 seconds
      title = "🔴 CRITICAL: Power Imminent";
      body = `${seconds} seconds until power loss!`;
      shouldNotify = true;
    } else if (remaining <= 30000) { // Last 30 seconds
      minInterval = 10000; // Every 10 seconds
      title = "🟠 Power Critical";
      body = `Only ${seconds} seconds of power remaining!`;
      shouldNotify = true;
    } else if (remaining <= 60000) { // Last minute
      minInterval = 20000; // Every 20 seconds
      title = "⚡ Power Running Out";
      body = `${seconds} seconds until power loss`;
      shouldNotify = true;
    } else if (remaining <= 2 * 60000) { // Last 2 minutes
      minInterval = 30000; // Every 30 seconds
      title = "⏰ Power Alert";
      body = `${minutes}m ${seconds}s of power remaining`;
      shouldNotify = true;
    } else if (remaining <= 5 * 60000) { // Last 5 minutes
      minInterval = 60000; // Every minute
      title = "⏱️ Power Update";
      body = `${minutes} minutes of power left`;
      shouldNotify = true;
    } else if (remaining <= 10 * 60000) { // Last 10 minutes
      minInterval = 120000; // Every 2 minutes
      title = "Power Status";
      body = `${minutes} minutes remaining`;
      shouldNotify = true;
    } else if (remaining <= 30 * 60000) { // Last 30 minutes
      minInterval = 300000; // Every 5 minutes
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      title = "Power Check";
      body = hours > 0 ? `${hours}h ${mins}m remaining` : `${minutes} minutes remaining`;
      shouldNotify = true;
    }
    
    if (shouldNotify && timeSinceLastNotification >= minInterval) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: remaining <= 60000, // Sound only for last minute
          priority: remaining <= 30000 ? 'high' : 'default',
        },
        trigger: null,
      });
      lastPowerNotification.current = { time: now, remaining };
    }
  }, [powerTimer, notificationsEnabled]);

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

  const saveResources = useCallback(async (newResources: Resource[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newResources));
      setResources(newResources);
    } catch (error) {
      console.error("Error saving resources:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [resourcesData, powerData, notificationsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(POWER_TIMER_KEY),
        AsyncStorage.getItem(NOTIFICATIONS_KEY),
      ]);

      if (resourcesData) {
        setResources(JSON.parse(resourcesData));
      }

      if (powerData) {
        const timer = JSON.parse(powerData);
        if (timer.endTime > Date.now()) {
          setPowerTimerState(timer);
        } else {
          await AsyncStorage.removeItem(POWER_TIMER_KEY);
        }
      }

      if (notificationsData !== null) {
        setNotificationsEnabled(JSON.parse(notificationsData));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);

  useEffect(() => {
    // Dynamic interval based on urgency
    const getCheckInterval = () => {
      if (!powerTimer) return 10000; // Default 10 seconds
      
      const remaining = powerTimer.endTime - Date.now();
      
      if (remaining <= 0) return 10000; // Power expired, check less frequently
      if (remaining <= 30000) return 1000; // Last 30 seconds: check every second
      if (remaining <= 60000) return 2000; // Last minute: check every 2 seconds
      if (remaining <= 5 * 60000) return 5000; // Last 5 minutes: check every 5 seconds
      
      // Check if any resources are critical
      const hasCritical = resources.some(r => 
        r.threshold > 0 && r.value <= r.threshold * 0.25
      );
      
      if (hasCritical) return 3000; // Critical resources: check every 3 seconds
      
      return 10000; // Default: check every 10 seconds
    };
    
    const updateInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      const interval = getCheckInterval();
      
      intervalRef.current = setInterval(() => {
        checkResourceThresholds();
        checkPowerTimer();
        updateInterval(); // Recalculate interval after each check
      }, interval);
    };
    
    // Initial check
    checkResourceThresholds();
    checkPowerTimer();
    updateInterval();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkResourceThresholds, checkPowerTimer, powerTimer, resources]);

  const addResource = useCallback((resource: Omit<Resource, "id">) => {
    const newResource: Resource = {
      ...resource,
      id: Date.now().toString(),
    };
    const updatedResources = [...resources, newResource];
    saveResources(updatedResources);
  }, [resources, saveResources]);

  const updateResource = useCallback((id: string, updates: Partial<Resource>) => {
    const updatedResources = resources.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    );
    saveResources(updatedResources);
    
    if (updates.value && updates.threshold) {
      if (updates.value > updates.threshold) {
        notificationHistory.current.delete(`resource-${id}`);
      }
    }
  }, [resources, saveResources]);

  const deleteResource = useCallback((id: string) => {
    const updatedResources = resources.filter((r) => r.id !== id);
    saveResources(updatedResources);
    notificationHistory.current.delete(`resource-${id}`);
  }, [resources, saveResources]);

  const setPowerTimer = useCallback(async (duration: number) => {
    const timer: PowerTimer = {
      startTime: Date.now(),
      endTime: Date.now() + duration,
      duration,
    };
    setPowerTimerState(timer);
    await AsyncStorage.setItem(POWER_TIMER_KEY, JSON.stringify(timer));
    // Reset power notification history when timer is set
    lastPowerNotification.current = { time: 0, remaining: 0 };
  }, []);

  const toggleNotifications = useCallback(async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(newValue));
  }, [notificationsEnabled]);

  useEffect(() => {
    loadData();
    requestNotificationPermissions();
  }, [loadData, requestNotificationPermissions]);

  return useMemo(() => ({
    resources,
    powerTimer,
    addResource,
    updateResource,
    deleteResource,
    setPowerTimer,
    notificationsEnabled,
    toggleNotifications,
  }), [resources, powerTimer, addResource, updateResource, deleteResource, setPowerTimer, notificationsEnabled, toggleNotifications]);
});