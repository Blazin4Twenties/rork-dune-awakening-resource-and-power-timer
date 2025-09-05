import { useState, useEffect, useMemo } from "react";
import { AppState, AppStateStatus } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export const [AppStatusProvider, useAppStatus] = createContextHook(() => {
  const [isOnline, setIsOnline] = useState(true);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isAppFocused, setIsAppFocused] = useState(true);

  useEffect(() => {
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

  return useMemo(() => ({
    isOnline,
    appState,
    isAppFocused,
    isBackground: appState === 'background',
    isInactive: appState === 'inactive',
  }), [isOnline, appState, isAppFocused]);
});