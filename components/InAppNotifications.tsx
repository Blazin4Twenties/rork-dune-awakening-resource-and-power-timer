import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Bell } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useTimers } from "@/hooks/timer-context";

const { width } = Dimensions.get("window");

export default function InAppNotifications() {
  const { inAppNotifications, dismissInAppNotification } = useTimers();
  const insets = useSafeAreaInsets();

  return (
    <>
      {inAppNotifications.map((notification, index) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          index={index}
          topInset={insets.top}
          onDismiss={() => dismissInAppNotification(notification.id)}
        />
      ))}
    </>
  );
}

interface NotificationCardProps {
  notification: {
    id: string;
    title: string;
    body: string;
    timestamp: number;
  };
  index: number;
  topInset: number;
  onDismiss: () => void;
}

function NotificationCard({ notification, index, topInset, onDismiss }: NotificationCardProps) {
  const translateY = React.useRef(new Animated.Value(-200)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const isUrgent = notification.title.includes("🚨") || notification.title.includes("⏰");
  const isWarning = notification.title.includes("⚠️");

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topInset + 10 + index * 100,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handleDismiss}>
        <BlurView intensity={90} style={styles.blurView}>
          <LinearGradient
            colors={
              isUrgent
                ? ["rgba(255,59,48,0.15)", "rgba(255,59,48,0.05)"]
                : isWarning
                ? ["rgba(255,184,0,0.15)", "rgba(255,184,0,0.05)"]
                : ["rgba(0,212,255,0.15)", "rgba(0,212,255,0.05)"]
            }
            style={styles.gradient}
          >
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Bell
                  size={20}
                  color={isUrgent ? "#FF3B30" : isWarning ? "#FFB800" : "#00D4FF"}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>
                  {notification.title}
                </Text>
                <Text style={styles.body} numberOfLines={2}>
                  {notification.body}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 10,
    right: 10,
    zIndex: 9999,
    elevation: 999,
  },
  blurView: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  gradient: {
    padding: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFF",
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    color: "#AAA",
    lineHeight: 16,
  },
  closeButton: {
    padding: 4,
  },
});