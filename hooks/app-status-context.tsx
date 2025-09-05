import { useState, useEffect, useMemo, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export const [AppStatusProvider, useAppStatus] = createContextHook(() => {
  const [isOnline, setIsOnline] = useState(true);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isAppFocused, setIsAppFocused] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isLoadingTerms, setIsLoadingTerms] = useState(true);

  useEffect(() => {
    // Load terms acceptance status
    loadTermsStatus();

    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
    });

    // Monitor app state (foreground/background)
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
      setIsAppFocused(nextAppState === 'active');
    });

    // Check initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const loadTermsStatus = async () => {
    try {
      const status = await AsyncStorage.getItem('hasAcceptedTerms');
      if (status === 'true') {
        setHasAcceptedTerms(true);
      }
    } catch (error) {
      console.error('Error loading terms status:', error);
    } finally {
      setIsLoadingTerms(false);
    }
  };

  const acceptTerms = useCallback(async () => {
    try {
      await AsyncStorage.setItem('hasAcceptedTerms', 'true');
      setHasAcceptedTerms(true);
    } catch (error) {
      console.error('Error saving terms status:', error);
    }
  }, []);

  const resetTerms = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('hasAcceptedTerms');
      setHasAcceptedTerms(false);
    } catch (error) {
      console.error('Error resetting terms:', error);
    }
  }, []);

  return useMemo(() => ({
    isOnline,
    appState,
    isAppFocused,
    isBackground: appState === 'background',
    isInactive: appState === 'inactive',
    hasAcceptedTerms,
    isLoadingTerms,
    acceptTerms,
    resetTerms,
  }), [isOnline, appState, isAppFocused, hasAcceptedTerms, isLoadingTerms, acceptTerms, resetTerms]);
});