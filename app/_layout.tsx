import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ResourceProvider } from "@/hooks/resource-context";
import { TimerProvider } from "@/hooks/timer-context";
import { DebugProvider } from "@/hooks/debug-context";
import { UpdatesProvider } from "@/hooks/updates-context";
import { AppStatusProvider } from "@/hooks/app-status-context";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal", headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppStatusProvider>
          <DebugProvider>
            <UpdatesProvider>
              <ResourceProvider>
                <TimerProvider>
                  <RootLayoutNav />
                </TimerProvider>
              </ResourceProvider>
            </UpdatesProvider>
          </DebugProvider>
        </AppStatusProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}