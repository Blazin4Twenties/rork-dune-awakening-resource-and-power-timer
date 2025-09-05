import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';

export interface Update {
  id: string;
  title: string;
  message: string;
  date: Date;
  type: 'update' | 'information' | 'warning' | 'critical';
  author?: string;
  viewed: boolean;
}

const UPDATES_STORAGE_KEY = 'app_updates';
const VIEWED_UPDATES_KEY = 'viewed_updates';
const LAST_NOTIFIED_KEY = 'last_notified_update';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const [UpdatesProvider, useUpdates] = createContextHook(() => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastNotifiedIdRef = useRef<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Request notification permissions
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS !== 'web') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
        }
      }
    };
    requestPermissions();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Navigate to updates panel when notification is clicked
      router.push('/');
      // You might want to trigger opening the updates panel here
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Load updates and viewed status from storage
  useEffect(() => {
    const loadUpdates = async () => {
      try {
        const [storedUpdates, storedViewed, storedLastNotified] = await Promise.all([
          AsyncStorage.getItem(UPDATES_STORAGE_KEY),
          AsyncStorage.getItem(VIEWED_UPDATES_KEY),
          AsyncStorage.getItem(LAST_NOTIFIED_KEY),
        ]);

        if (storedUpdates) {
          const parsed = JSON.parse(storedUpdates);
          const updatesWithDates = parsed.map((u: any) => ({
            ...u,
            date: new Date(u.date),
          }));
          setUpdates(updatesWithDates);
        }

        if (storedViewed) {
          const viewedArray = JSON.parse(storedViewed);
          setViewedIds(new Set(viewedArray));
        }

        if (storedLastNotified) {
          lastNotifiedIdRef.current = storedLastNotified;
        }
      } catch (error) {
        console.error('Failed to load updates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUpdates();
  }, []);

  // Check for new updates
  useEffect(() => {
    const hasNew = updates.some(update => !viewedIds.has(update.id));
    setHasNewUpdates(hasNew);
  }, [updates, viewedIds]);

  // Send notification for new updates (separate effect to avoid infinite loop)
  useEffect(() => {
    if (isLoading) return;
    if (!hasNewUpdates) return;
    
    const sendUpdateNotification = async () => {
      const unviewedUpdates = updates.filter(update => !viewedIds.has(update.id));
      if (unviewedUpdates.length > 0) {
        const latestUpdate = unviewedUpdates[0];
        
        // Only send notification if we haven't already notified about this update
        if (latestUpdate.id !== lastNotifiedIdRef.current) {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Test Notification',
                body: 'This is just a test for the applications notifications.',
                data: { updateId: latestUpdate.id, type: latestUpdate.type },
                sound: true,
              },
              trigger: null, // Send immediately
            });

            // Save the ID of the update we just notified about
            lastNotifiedIdRef.current = latestUpdate.id;
            await AsyncStorage.setItem(LAST_NOTIFIED_KEY, latestUpdate.id);
          } catch (error) {
            console.error('Failed to send notification:', error);
          }
        }
      }
    };

    sendUpdateNotification();
  }, [updates, viewedIds, hasNewUpdates, isLoading]);

  // Save updates to storage
  const saveUpdates = async (updatesToSave: Update[]) => {
    try {
      await AsyncStorage.setItem(UPDATES_STORAGE_KEY, JSON.stringify(updatesToSave));
    } catch (error) {
      console.error('Failed to save updates:', error);
    }
  };

  // Save viewed IDs to storage
  const saveViewedIds = async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem(VIEWED_UPDATES_KEY, JSON.stringify(Array.from(ids)));
    } catch (error) {
      console.error('Failed to save viewed IDs:', error);
    }
  };

  const addUpdate = useCallback(async (
    title: string,
    message: string,
    type: Update['type'] = 'information',
    author?: string
  ) => {
    const newUpdate: Update = {
      id: `update-${Date.now()}-${Math.random()}`,
      title,
      message,
      date: new Date(),
      type,
      author,
      viewed: false,
    };

    setUpdates(prevUpdates => {
      const newUpdates = [newUpdate, ...prevUpdates];
      saveUpdates(newUpdates);
      return newUpdates;
    });
  }, []);

  const removeUpdate = useCallback(async (id: string) => {
    setUpdates(prevUpdates => {
      const newUpdates = prevUpdates.filter(u => u.id !== id);
      saveUpdates(newUpdates);
      return newUpdates;
    });
  }, []);

  const markAsViewed = useCallback(async (id: string) => {
    setViewedIds(prevIds => {
      const newViewedIds = new Set(prevIds);
      newViewedIds.add(id);
      saveViewedIds(newViewedIds);
      return newViewedIds;
    });
  }, []);

  const markAllAsViewed = useCallback(async () => {
    // Mark all as viewed and then clear all updates
    const allIds = new Set(updates.map(u => u.id));
    setViewedIds(allIds);
    setUpdates([]);
    
    // Save the empty state to storage
    await Promise.all([
      AsyncStorage.setItem(UPDATES_STORAGE_KEY, JSON.stringify([])),
      AsyncStorage.setItem(VIEWED_UPDATES_KEY, JSON.stringify(Array.from(allIds))),
    ]);
  }, [updates]);

  const getUnviewedUpdates = useCallback(() => {
    return updates.filter(update => !viewedIds.has(update.id));
  }, [updates, viewedIds]);

  const getLatestUpdate = useCallback(() => {
    return updates[0] || null;
  }, [updates]);

  const clearAllUpdates = useCallback(async () => {
    setUpdates([]);
    setViewedIds(new Set());
    await Promise.all([
      AsyncStorage.removeItem(UPDATES_STORAGE_KEY),
      AsyncStorage.removeItem(VIEWED_UPDATES_KEY),
    ]);
  }, []);

  return useMemo(() => ({
    updates,
    hasNewUpdates,
    isLoading,
    addUpdate,
    removeUpdate,
    markAsViewed,
    markAllAsViewed,
    getUnviewedUpdates,
    getLatestUpdate,
    clearAllUpdates,
  }), [updates, hasNewUpdates, isLoading, addUpdate, removeUpdate, markAsViewed, markAllAsViewed, getUnviewedUpdates, getLatestUpdate, clearAllUpdates]);
});