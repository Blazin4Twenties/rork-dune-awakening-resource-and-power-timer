import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  ImageBackground,
  Dimensions,

} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Plus,
  Clock,
  AlertTriangle,
  Trash2,
  Bell,
  BellOff,
  Zap,
  Package,
  MoreHorizontal,
  RefreshCw,
  BellRing,
  Timer as TimerIcon,
  Droplets,
  Cpu,
  Shield,
  Activity,
  Gauge,
  Battery,
  Flame,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useResources } from "@/hooks/resource-context";
import { useTimers } from "@/hooks/timer-context";
import { useDebug } from "@/hooks/debug-context";
import { useUpdates } from "@/hooks/updates-context";
import { useAppStatus } from "@/hooks/app-status-context";
import InAppNotifications from "@/components/InAppNotifications";
import * as Notifications from 'expo-notifications';
import { Resource, ResourceCategory, TimerCategory, TimerReminder } from "@/types/resource";
import DebugPanel from "@/components/DebugPanel";
import UpdatesPanel from "@/components/UpdatesPanel";
import OnboardingScreen from "@/components/OnboardingScreen";

const { width } = Dimensions.get("window");

const DUNE_BG = 'https://images.unsplash.com/photo-1682686581030-7fa4ea2b96c3?w=1920&q=80';

export default function DuneResourceManager() {
  // Call all hooks first, before any conditional returns
  const { addLog, isFunctionPaused, getPausedMessage } = useDebug();
  const { hasNewUpdates } = useUpdates();
  const { isOnline, hasAcceptedTerms, isLoadingTerms } = useAppStatus();
  
  const {
    resources,
    addResource,
    updateResource,
    deleteResource,
    notificationsEnabled: resourceNotifications,
    toggleNotifications: toggleResourceNotifications,
  } = useResources();

  const {
    timers,
    currentTime,
    addTimer,
    updateTimer,
    deleteTimer,
    resetTimer,
    notificationsEnabled: timerNotifications,
    toggleNotifications: toggleTimerNotifications,
  } = useTimers();

  const [activeTab, setActiveTab] = useState<"resources" | "timers" | "updates">("timers");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceName, setResourceName] = useState("");
  const [resourceValue, setResourceValue] = useState("");
  const [resourceNeeded, setResourceNeeded] = useState("");
  const [resourceCategory, setResourceCategory] = useState<ResourceCategory>("resources");
  
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [timerName, setTimerName] = useState("");
  const [timerDays, setTimerDays] = useState("");
  const [timerHours, setTimerHours] = useState("");
  const [timerMinutes, setTimerMinutes] = useState("");
  const [timerSeconds, setTimerSeconds] = useState("");
  const [timerThresholdMinutes, setTimerThresholdMinutes] = useState("");
  const [timerCategory, setTimerCategory] = useState<TimerCategory>("generator");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderInterval, setReminderInterval] = useState("5"); // Default 5 minutes
  const [reminderIntervalUnit, setReminderIntervalUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [reminderMessage, setReminderMessage] = useState("");
  
  useEffect(() => {
    // Only log on initial mount
    const logTimeout = setTimeout(() => {
      addLog('system', 'App Started', 'Dune Resource Manager initialized');
    }, 100);
    
    // Set up notification response listener to open updates tab
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification clicked:', response);
      // Navigate to updates tab when notification is clicked
      setActiveTab('updates');
    });

    return () => {
      clearTimeout(logTimeout);
      subscription.remove();
    };
  }, []); // Empty dependency array - only run once on mount

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return "EXPIRED";
    
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleAddResource = useCallback(() => {
    if (isFunctionPaused('addResource')) {
      Alert.alert('Function Paused', getPausedMessage('addResource'));
      return;
    }
    
    if (!resourceName || !resourceValue || !resourceNeeded) {
      Alert.alert("Error", "Please fill all fields");
      addLog('error', 'Add Resource Failed', 'Missing required fields');
      return;
    }

    const value = parseInt(resourceValue);
    const needed = parseInt(resourceNeeded);

    if (isNaN(value) || isNaN(needed)) {
      Alert.alert("Error", "Value and resources needed must be numbers");
      addLog('error', 'Add Resource Failed', 'Invalid number values');
      return;
    }

    if (editingResource) {
      updateResource(editingResource.id, {
        name: resourceName,
        value,
        needed,
        category: resourceCategory,
      });
      addLog('resource', 'Resource Updated', `${resourceName} updated`, { value, needed });
    } else {
      addResource({
        name: resourceName,
        value,
        needed,
        category: resourceCategory,
      });
      addLog('resource', 'Resource Added', `${resourceName} added`, { value, needed });
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setModalVisible(false);
    resetResourceForm();
  }, [resourceName, resourceValue, resourceNeeded, resourceCategory, editingResource, addResource, updateResource, isFunctionPaused, getPausedMessage, addLog]);

  const handleAddTimer = useCallback(() => {
    if (isFunctionPaused('addTimer')) {
      Alert.alert('Function Paused', getPausedMessage('addTimer'));
      return;
    }
    
    if (!timerName) {
      Alert.alert("Error", "Please enter a timer name");
      addLog('error', 'Add Timer Failed', 'Missing timer name');
      return;
    }

    const days = parseInt(timerDays) || 0;
    const hours = parseInt(timerHours) || 0;
    const minutes = parseInt(timerMinutes) || 0;
    const seconds = parseInt(timerSeconds) || 0;
    const thresholdMinutes = parseInt(timerThresholdMinutes) || 5;

    if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
      Alert.alert("Error", "Please set a valid time");
      addLog('error', 'Add Timer Failed', 'Invalid time duration');
      return;
    }

    // Calculate reminder interval in milliseconds
    let reminderIntervalMs = 0;
    if (reminderEnabled) {
      const intervalValue = parseInt(reminderInterval) || 5;
      switch (reminderIntervalUnit) {
        case "minutes":
          reminderIntervalMs = intervalValue * 60 * 1000;
          break;
        case "hours":
          reminderIntervalMs = intervalValue * 60 * 60 * 1000;
          break;
        case "days":
          reminderIntervalMs = intervalValue * 24 * 60 * 60 * 1000;
          break;
      }
    }

    const reminder: TimerReminder | undefined = reminderEnabled ? {
      interval: reminderIntervalMs,
      message: reminderMessage || `Timer reminder: ${timerName}`,
      enabled: true
    } : undefined;

    if (editingTimerId) {
      updateTimer(editingTimerId, days, hours, minutes, seconds);
      addLog('timer', 'Timer Updated', `${timerName} updated`);
    } else {
      addTimer(
        {
          name: timerName,
          threshold: thresholdMinutes * 60 * 1000,
          category: timerCategory,
          duration: 0, // Will be calculated in addTimer
          reminder
        },
        days,
        hours,
        minutes,
        seconds
      );
      const totalTime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      const reminderInfo = reminderEnabled ? ` with reminders every ${reminderInterval} ${reminderIntervalUnit}` : '';
      addLog('timer', 'Timer Started', `${timerName} set for ${totalTime}${reminderInfo}`);
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setTimerModalVisible(false);
    resetTimerForm();
  }, [timerName, timerDays, timerHours, timerMinutes, timerSeconds, timerThresholdMinutes, timerCategory, editingTimerId, reminderEnabled, reminderInterval, reminderIntervalUnit, reminderMessage, addTimer, updateTimer, isFunctionPaused, getPausedMessage, addLog]);

  const resetResourceForm = () => {
    setResourceName("");
    setResourceValue("");
    setResourceNeeded("");
    setResourceCategory("resources");
    setEditingResource(null);
  };

  const resetTimerForm = () => {
    setTimerName("");
    setTimerDays("");
    setTimerHours("");
    setTimerMinutes("");
    setTimerSeconds("");
    setTimerThresholdMinutes("5");
    setTimerCategory("generator");
    setEditingTimerId(null);
    setReminderEnabled(false);
    setReminderInterval("5");
    setReminderIntervalUnit("minutes");
    setReminderMessage("");
  };

  const openEditResourceModal = (resource: Resource) => {
    if (isFunctionPaused('updateResource')) {
      Alert.alert('Function Paused', getPausedMessage('updateResource'));
      return;
    }
    setEditingResource(resource);
    setResourceName(resource.name);
    setResourceValue(resource.value.toString());
    setResourceNeeded(resource.needed.toString());
    setResourceCategory(resource.category);
    setModalVisible(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const openEditTimerModal = (timerId: string) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;
    
    const totalSeconds = Math.floor(timer.duration / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    setEditingTimerId(timerId);
    setTimerName(timer.name);
    setTimerDays(days > 0 ? days.toString() : "");
    setTimerHours(hours > 0 ? hours.toString() : "");
    setTimerMinutes(minutes > 0 ? minutes.toString() : "");
    setTimerSeconds(seconds > 0 ? seconds.toString() : "");
    setTimerThresholdMinutes(Math.floor(timer.threshold / 60000).toString());
    setTimerCategory(timer.category);
    
    // Set reminder settings if they exist
    if (timer.reminder) {
      setReminderEnabled(timer.reminder.enabled);
      setReminderMessage(timer.reminder.message);
      
      // Convert interval back to user-friendly units
      const intervalMs = timer.reminder.interval;
      if (intervalMs >= 24 * 60 * 60 * 1000 && intervalMs % (24 * 60 * 60 * 1000) === 0) {
        setReminderInterval((intervalMs / (24 * 60 * 60 * 1000)).toString());
        setReminderIntervalUnit("days");
      } else if (intervalMs >= 60 * 60 * 1000 && intervalMs % (60 * 60 * 1000) === 0) {
        setReminderInterval((intervalMs / (60 * 60 * 1000)).toString());
        setReminderIntervalUnit("hours");
      } else {
        setReminderInterval((intervalMs / (60 * 1000)).toString());
        setReminderIntervalUnit("minutes");
      }
    } else {
      setReminderEnabled(false);
      setReminderInterval("5");
      setReminderIntervalUnit("minutes");
      setReminderMessage("");
    }
    
    setTimerModalVisible(true);
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDeleteResource = (id: string) => {
    if (isFunctionPaused('deleteResource')) {
      Alert.alert('Function Paused', getPausedMessage('deleteResource'));
      return;
    }
    
    const resource = resources.find(r => r.id === id);
    Alert.alert(
      "Delete Resource",
      "Are you sure you want to delete this resource?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteResource(id);
            addLog('resource', 'Resource Deleted', `${resource?.name} deleted`);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          },
        },
      ]
    );
  };

  const handleDeleteTimer = (id: string) => {
    if (isFunctionPaused('deleteTimer')) {
      Alert.alert('Function Paused', getPausedMessage('deleteTimer'));
      return;
    }
    
    const timer = timers.find(t => t.id === id);
    Alert.alert(
      "Delete Timer",
      "Are you sure you want to delete this timer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteTimer(id);
            addLog('timer', 'Timer Deleted', `${timer?.name} deleted`);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: ResourceCategory | TimerCategory, size = 20) => {
    const iconProps = { size, color: "#FFB800" };
    switch (category) {
      case "power":
        return <Zap {...iconProps} />;
      case "resources":
        return <Package {...iconProps} color="#00D4FF" />;
      case "generator":
        return <Battery {...iconProps} />;
      case "equipment":
        return <Shield {...iconProps} color="#9B59B6" />;
      case "cooldown":
        return <Clock {...iconProps} color="#3498DB" />;
      case "other":
        return <MoreHorizontal {...iconProps} color="#FF6B6B" />;
      default:
        return <MoreHorizontal {...iconProps} color="#FF6B6B" />;
    }
  };

  const getResourceIcon = (name: string, size = 24) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('water')) return <Droplets size={size} color="#00D4FF" />;
    if (lowerName.includes('spice')) return <Flame size={size} color="#FF6B35" />;
    if (lowerName.includes('power') || lowerName.includes('energy')) return <Zap size={size} color="#FFB800" />;
    if (lowerName.includes('metal') || lowerName.includes('ore')) return <Cpu size={size} color="#8B7355" />;
    if (lowerName.includes('fuel')) return <Battery size={size} color="#FF6B6B" />;
    if (lowerName.includes('shield')) return <Shield size={size} color="#9B59B6" />;
    return <Package size={size} color="#00D4FF" />;
  };

  const resourcesByCategory = resources.reduce((acc, resource) => {
    if (!acc[resource.category]) {
      acc[resource.category] = [];
    }
    acc[resource.category].push(resource);
    return acc;
  }, {} as Record<ResourceCategory, Resource[]>);

  const activeTimers = timers.filter(t => t.isActive);
  const expiredTimers = timers.filter(t => !t.isActive);

  // Conditional returns must come after all hooks
  // Show loading state while checking terms status
  if (isLoadingTerms) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['rgba(10,10,10,0.85)', 'rgba(26,26,46,0.9)', 'rgba(22,33,62,0.95)']}
          style={styles.gradient}
        >
          <View style={styles.loadingContent}>
            <Activity size={48} color="#FFB800" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Show onboarding screen if terms haven't been accepted
  if (!hasAcceptedTerms) {
    return <OnboardingScreen />;
  }

  return (
    <ImageBackground source={{ uri: DUNE_BG }} style={styles.bgImage} resizeMode="cover">
      <LinearGradient
        colors={['rgba(10,10,10,0.85)', 'rgba(26,26,46,0.9)', 'rgba(22,33,62,0.95)']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.statusBar}>
              <View style={[styles.statusIndicator, isOnline ? styles.statusOnline : styles.statusOffline]}>
                <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
                <Text style={styles.statusText}>{isOnline ? "ONLINE" : "OFFLINE"}</Text>
              </View>
            </View>
            <View style={styles.header}>
              <LinearGradient
                colors={['rgba(255,184,0,0.1)', 'rgba(255,184,0,0.05)', 'transparent']}
                style={styles.headerGlow}
              />
              <Text style={styles.title}>DUNE</Text>
              <Text style={styles.subtitle}>AWAKENING TRACKER</Text>
              <View style={styles.headerDivider} />
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => {
                  if (activeTab === "resources") {
                    toggleResourceNotifications();
                  } else {
                    toggleTimerNotifications();
                  }
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                {(activeTab === "resources" ? resourceNotifications : timerNotifications) ? (
                  <Bell size={24} color="#FFB800" />
                ) : (
                  <BellOff size={24} color="#666" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab]}
                onPress={() => setActiveTab("timers")}
              >
                {activeTab === "timers" && (
                  <LinearGradient
                    colors={['#FFB800', '#FF8C00']}
                    style={styles.activeTabBg}
                  />
                )}
                <View style={styles.tabContent}>
                  <TimerIcon size={18} color={activeTab === "timers" ? "#000" : "#666"} />
                  <Text style={[styles.tabText, activeTab === "timers" && styles.activeTabText]}>
                    TIMERS
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab]}
                onPress={() => setActiveTab("resources")}
              >
                {activeTab === "resources" && (
                  <LinearGradient
                    colors={['#00D4FF', '#0099CC']}
                    style={styles.activeTabBg}
                  />
                )}
                <View style={styles.tabContent}>
                  <Package size={18} color={activeTab === "resources" ? "#000" : "#666"} />
                  <Text style={[styles.tabText, activeTab === "resources" && styles.activeTabText]}>
                    RESOURCES
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab]}
                onPress={() => setActiveTab("updates")}
              >
                {activeTab === "updates" && (
                  <LinearGradient
                    colors={['#34C759', '#28A745']}
                    style={styles.activeTabBg}
                  />
                )}
                <View style={[styles.tabContent, { position: 'relative' }]}>
                  <Bell size={18} color={activeTab === "updates" ? "#000" : "#666"} />
                  <Text style={[styles.tabText, activeTab === "updates" && styles.activeTabText]}>
                    UPDATES
                  </Text>
                  {hasNewUpdates && (
                    <View style={styles.updateBadge} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {activeTab === "updates" ? (
              <UpdatesPanel />
            ) : (
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {activeTab === "timers" ? (
                <>
                  {activeTimers.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Activity size={16} color="#FFB800" />
                        <Text style={styles.sectionTitle}>ACTIVE TIMERS</Text>
                      </View>
                      {activeTimers.map((timer) => {
                        const remaining = Math.max(0, timer.endTime - currentTime);
                        const isLow = remaining > 0 && remaining <= timer.threshold;
                        const isExpired = remaining <= 0;
                        const percentage = timer.duration > 0 ? (remaining / timer.duration) * 100 : 0;
                        
                        return (
                          <TouchableOpacity
                            key={timer.id}
                            style={styles.card}
                            onPress={() => openEditTimerModal(timer.id)}
                          >
                            <LinearGradient
                              colors={
                                isExpired 
                                  ? ['rgba(102,102,102,0.1)', 'rgba(102,102,102,0.05)']
                                  : isLow 
                                    ? ['rgba(255,107,107,0.2)', 'rgba(255,107,107,0.1)']
                                    : ['rgba(255,184,0,0.1)', 'rgba(255,184,0,0.05)']
                              }
                              style={styles.cardGradient}
                            >
                              <View style={styles.cardHeader}>
                                <View style={styles.cardIcon}>
                                  {getCategoryIcon(timer.category, 24)}
                                </View>
                                <View style={styles.cardInfo}>
                                  <Text style={styles.cardTitle}>{timer.name}</Text>
                                  <View style={styles.progressBar}>
                                    <View 
                                      style={[
                                        styles.progressFill,
                                        { width: `${Math.max(0, Math.min(percentage, 100))}%` },
                                        isLow && styles.progressFillLow,
                                        isExpired && styles.progressFillExpired,
                                      ]} 
                                    />
                                  </View>
                                </View>
                              </View>
                              {timer.reminder?.enabled && (
                                <View style={styles.reminderIndicator}>
                                  <BellRing size={14} color="#FFB800" />
                                  <Text style={styles.reminderIndicatorText}>
                                    Reminders ON
                                  </Text>
                                </View>
                              )}
                              <View style={styles.cardBody}>
                                <Text style={[
                                  styles.countdown,
                                  isLow && styles.countdownLow,
                                  isExpired && styles.countdownExpired,
                                ]}>
                                  {formatCountdown(remaining)}
                                </Text>
                                {isLow && !isExpired && (
                                  <View style={styles.warningBadge}>
                                    <AlertTriangle size={14} color="#FFF" />
                                    <Text style={styles.warningText}>CRITICAL</Text>
                                  </View>
                                )}
                              </View>
                              <View style={styles.cardActions}>
                                <TouchableOpacity
                                  style={styles.actionButton}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    if (isFunctionPaused('resetTimer')) {
                                      Alert.alert('Function Paused', getPausedMessage('resetTimer'));
                                      return;
                                    }
                                    resetTimer(timer.id);
                                    addLog('timer', 'Timer Reset', `${timer.name} reset`);
                                    if (Platform.OS !== "web") {
                                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                  }}
                                >
                                  <RefreshCw size={18} color="#FFB800" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.actionButton}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTimer(timer.id);
                                  }}
                                >
                                  <Trash2 size={18} color="#FF6B6B" />
                                </TouchableOpacity>
                              </View>
                            </LinearGradient>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  
                  {expiredTimers.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Clock size={16} color="#666" />
                        <Text style={styles.sectionTitle}>EXPIRED TIMERS</Text>
                      </View>
                      {expiredTimers.map((timer) => (
                        <TouchableOpacity
                          key={timer.id}
                          style={styles.card}
                          onPress={() => openEditTimerModal(timer.id)}
                        >
                          <LinearGradient
                            colors={['rgba(102,102,102,0.1)', 'rgba(102,102,102,0.05)']}
                            style={styles.cardGradient}
                          >
                            <View style={styles.cardHeader}>
                              <View style={styles.cardIcon}>
                                {getCategoryIcon(timer.category, 24)}
                              </View>
                              <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>{timer.name}</Text>
                              </View>
                            </View>
                            <Text style={styles.countdownExpired}>EXPIRED</Text>
                            <View style={styles.cardActions}>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  if (isFunctionPaused('resetTimer')) {
                                    Alert.alert('Function Paused', getPausedMessage('resetTimer'));
                                    return;
                                  }
                                  resetTimer(timer.id);
                                  addLog('timer', 'Timer Reset', `${timer.name} reset`);
                                  if (Platform.OS !== "web") {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  }
                                }}
                              >
                                <RefreshCw size={18} color="#FFB800" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTimer(timer.id);
                                }}
                              >
                                <Trash2 size={18} color="#FF6B6B" />
                              </TouchableOpacity>
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  {timers.length === 0 && (
                    <View style={styles.emptyState}>
                      <TimerIcon size={64} color="#333" />
                      <Text style={styles.emptyText}>No timers active</Text>
                      <Text style={styles.emptySubtext}>Tap + to create your first timer</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  {(["resources", "other"] as ResourceCategory[]).map((category) => {
                    const categoryResources = resourcesByCategory[category];
                    if (!categoryResources || categoryResources.length === 0) return null;
                    
                    return (
                      <View key={category} style={styles.section}>
                        <View style={styles.sectionHeader}>
                          {category === "resources" ? (
                            <Gauge size={16} color="#00D4FF" />
                          ) : (
                            <MoreHorizontal size={16} color="#FF6B6B" />
                          )}
                          <Text style={styles.sectionTitle}>
                            {category === "resources" ? "RESOURCES" : "OTHER ITEMS"}
                          </Text>
                        </View>
                        {categoryResources.map((resource) => {
                          const isLow = resource.value < resource.needed;
                          const percentage = Math.min((resource.value / resource.needed) * 100, 100);
                          
                          return (
                            <TouchableOpacity
                              key={resource.id}
                              style={styles.card}
                              onPress={() => openEditResourceModal(resource)}
                            >
                              <LinearGradient
                                colors={
                                  isLow 
                                    ? ['rgba(255,107,107,0.2)', 'rgba(255,107,107,0.1)']
                                    : ['rgba(0,212,255,0.1)', 'rgba(0,212,255,0.05)']
                                }
                                style={styles.cardGradient}
                              >
                                <View style={styles.cardHeader}>
                                  <View style={styles.cardIcon}>
                                    {getResourceIcon(resource.name)}
                                  </View>
                                  <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>{resource.name}</Text>
                                    <View style={styles.progressBar}>
                                      <View 
                                        style={[
                                          styles.progressFill,
                                          { width: `${percentage}%` },
                                          isLow && styles.progressFillLow,
                                        ]} 
                                      />
                                    </View>
                                  </View>
                                </View>
                                <View style={styles.resourceStats}>
                                  <Text style={[styles.resourceValue, isLow && styles.valueLow]}>
                                    {resource.value}
                                  </Text>
                                  <Text style={styles.resourceDivider}>/</Text>
                                  <Text style={styles.resourceThreshold}>{resource.needed}</Text>
                                  {isLow && (
                                    <View style={styles.warningBadge}>
                                      <AlertTriangle size={14} color="#FFF" />
                                      <Text style={styles.warningText}>LOW</Text>
                                    </View>
                                  )}
                                </View>
                                <View style={styles.cardActions}>
                                  <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleDeleteResource(resource.id);
                                    }}
                                  >
                                    <Trash2 size={18} color="#FF6B6B" />
                                  </TouchableOpacity>
                                </View>
                              </LinearGradient>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                  
                  {resources.length === 0 && (
                    <View style={styles.emptyState}>
                      <Package size={64} color="#333" />
                      <Text style={styles.emptyText}>No resources tracked</Text>
                      <Text style={styles.emptySubtext}>Tap + to add your first resource</Text>
                    </View>
                  )}
                  </>
                )}
              </ScrollView>
            )}

            {activeTab !== "updates" && (
              <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                  if (activeTab === "timers") {
                    setTimerModalVisible(true);
                  } else {
                    setModalVisible(true);
                  }
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                }}
              >
                <LinearGradient
                  colors={activeTab === "timers" ? ["#FFB800", "#FF8C00"] : ["#00D4FF", "#0099CC"]}
                  style={styles.fabGradient}
                >
                  <Plus size={32} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Resource Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(false);
              resetResourceForm();
            }}
          >
            <View style={styles.modalOverlay}>
              <BlurView intensity={80} style={styles.blurView}>
                <View style={styles.modalContent}>
                  <LinearGradient
                    colors={['rgba(0,212,255,0.1)', 'rgba(0,212,255,0.05)']}
                    style={styles.modalHeader}
                  >
                    <Text style={styles.modalTitle}>
                      {editingResource ? "EDIT RESOURCE" : "ADD RESOURCE"}
                    </Text>
                  </LinearGradient>

                  <View style={styles.modalBody}>
                    <View style={styles.categoryPicker}>
                      {(["resources", "other"] as ResourceCategory[]).map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryOption,
                            resourceCategory === cat && styles.categoryOptionActive,
                          ]}
                          onPress={() => setResourceCategory(cat)}
                        >
                          <LinearGradient
                            colors={resourceCategory === cat ? ['#00D4FF', '#0099CC'] : ['transparent', 'transparent']}
                            style={styles.categoryOptionGradient}
                          >
                            {getCategoryIcon(cat)}
                            <Text
                              style={[
                                styles.categoryOptionText,
                                resourceCategory === cat && styles.categoryOptionTextActive,
                              ]}
                            >
                              {cat === "resources" ? "Resource" : "Other"}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Resource Name"
                      placeholderTextColor="#666"
                      value={resourceName}
                      onChangeText={setResourceName}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Current Value"
                      placeholderTextColor="#666"
                      value={resourceValue}
                      onChangeText={setResourceValue}
                      keyboardType="numeric"
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Resources Needed"
                      placeholderTextColor="#666"
                      value={resourceNeeded}
                      onChangeText={setResourceNeeded}
                      keyboardType="numeric"
                    />

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          setModalVisible(false);
                          resetResourceForm();
                        }}
                      >
                        <Text style={styles.cancelButtonText}>CANCEL</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleAddResource}>
                        <LinearGradient
                          colors={["#00D4FF", "#0099CC"]}
                          style={styles.saveButton}
                        >
                          <Text style={styles.saveButtonText}>
                            {editingResource ? "UPDATE" : "ADD"}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>
          </Modal>

          {/* Timer Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={timerModalVisible}
            onRequestClose={() => {
              setTimerModalVisible(false);
              resetTimerForm();
            }}
          >
            <View style={styles.modalOverlay}>
              <BlurView intensity={80} style={styles.blurView}>
                <View style={styles.modalContent}>
                  <LinearGradient
                    colors={['rgba(255,184,0,0.1)', 'rgba(255,184,0,0.05)']}
                    style={styles.modalHeader}
                  >
                    <Text style={styles.modalTitle}>
                      {editingTimerId ? "EDIT TIMER" : "ADD TIMER"}
                    </Text>
                  </LinearGradient>

                  <View style={styles.modalBody}>
                    <TextInput
                      style={styles.input}
                      placeholder="Timer Name (e.g., Generator, Spice Harvester)"
                      placeholderTextColor="#666"
                      value={timerName}
                      onChangeText={setTimerName}
                    />

                    <View style={styles.categoryPicker}>
                      {(["generator", "equipment", "cooldown", "other"] as TimerCategory[]).map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryOption,
                            timerCategory === cat && styles.categoryOptionActive,
                          ]}
                          onPress={() => setTimerCategory(cat)}
                        >
                          <LinearGradient
                            colors={timerCategory === cat ? ['#FFB800', '#FF8C00'] : ['transparent', 'transparent']}
                            style={styles.categoryOptionGradient}
                          >
                            {getCategoryIcon(cat)}
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>TIMER DURATION</Text>
                    <View style={styles.timerInputRow}>
                      <View style={styles.timerInputGroup}>
                        <TextInput
                          style={styles.timerInput}
                          placeholder="0"
                          placeholderTextColor="#666"
                          value={timerDays}
                          onChangeText={setTimerDays}
                          keyboardType="numeric"
                          maxLength={3}
                        />
                        <Text style={styles.timerLabel}>DAYS</Text>
                      </View>
                      <View style={styles.timerInputGroup}>
                        <TextInput
                          style={styles.timerInput}
                          placeholder="0"
                          placeholderTextColor="#666"
                          value={timerHours}
                          onChangeText={setTimerHours}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                        <Text style={styles.timerLabel}>HOURS</Text>
                      </View>
                      <View style={styles.timerInputGroup}>
                        <TextInput
                          style={styles.timerInput}
                          placeholder="0"
                          placeholderTextColor="#666"
                          value={timerMinutes}
                          onChangeText={setTimerMinutes}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                        <Text style={styles.timerLabel}>MIN</Text>
                      </View>
                      <View style={styles.timerInputGroup}>
                        <TextInput
                          style={styles.timerInput}
                          placeholder="0"
                          placeholderTextColor="#666"
                          value={timerSeconds}
                          onChangeText={setTimerSeconds}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                        <Text style={styles.timerLabel}>SEC</Text>
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>LOW WARNING THRESHOLD (MINUTES)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="5"
                      placeholderTextColor="#666"
                      value={timerThresholdMinutes}
                      onChangeText={setTimerThresholdMinutes}
                      keyboardType="numeric"
                    />

                    <View style={styles.reminderSection}>
                      <TouchableOpacity
                        style={styles.reminderToggle}
                        onPress={() => setReminderEnabled(!reminderEnabled)}
                      >
                        <View style={[styles.checkbox, reminderEnabled && styles.checkboxActive]}>
                          {reminderEnabled && <Bell size={16} color="#000" />}
                        </View>
                        <Text style={styles.reminderToggleText}>ENABLE REMINDERS</Text>
                      </TouchableOpacity>

                      {reminderEnabled && (
                        <>
                          <Text style={styles.inputLabel}>REMINDER INTERVAL</Text>
                          <View style={styles.reminderIntervalRow}>
                            <TextInput
                              style={[styles.input, styles.reminderIntervalInput]}
                              placeholder="5"
                              placeholderTextColor="#666"
                              value={reminderInterval}
                              onChangeText={setReminderInterval}
                              keyboardType="numeric"
                            />
                            <View style={styles.reminderUnitPicker}>
                              {(["minutes", "hours", "days"] as const).map((unit) => (
                                <TouchableOpacity
                                  key={unit}
                                  style={[
                                    styles.reminderUnitOption,
                                    reminderIntervalUnit === unit && styles.reminderUnitOptionActive,
                                  ]}
                                  onPress={() => setReminderIntervalUnit(unit)}
                                >
                                  <Text
                                    style={[
                                      styles.reminderUnitText,
                                      reminderIntervalUnit === unit && styles.reminderUnitTextActive,
                                    ]}
                                  >
                                    {unit.toUpperCase()}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          <Text style={styles.inputLabel}>REMINDER MESSAGE (OPTIONAL)</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Custom reminder message..."
                            placeholderTextColor="#666"
                            value={reminderMessage}
                            onChangeText={setReminderMessage}
                            multiline
                            numberOfLines={2}
                          />
                        </>
                      )}
                    </View>

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          setTimerModalVisible(false);
                          resetTimerForm();
                        }}
                      >
                        <Text style={styles.cancelButtonText}>CANCEL</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleAddTimer}>
                        <LinearGradient
                          colors={["#FFB800", "#FF8C00"]}
                          style={styles.saveButton}
                        >
                          <Text style={styles.saveButtonText}>
                            {editingTimerId ? "UPDATE" : "START"}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>
          </Modal>
        </SafeAreaView>
      </LinearGradient>
      <InAppNotifications />
      <DebugPanel />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusBar: {
    position: "absolute",
    top: 10,
    left: 20,
    zIndex: 100,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(30,30,46,0.8)",
    borderWidth: 1,
  },
  statusOnline: {
    borderColor: "rgba(52,199,89,0.3)",
  },
  statusOffline: {
    borderColor: "rgba(255,59,48,0.3)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: "#34C759",
  },
  dotOffline: {
    backgroundColor: "#FF3B30",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#888",
    letterSpacing: 1,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
    position: 'relative',
  },
  headerGlow: {
    position: 'absolute',
    top: -50,
    left: -100,
    right: -100,
    height: 200,
    opacity: 0.5,
  },
  title: {
    fontSize: 42,
    fontWeight: "900" as const,
    color: "#FFB800",
    letterSpacing: 8,
    textShadowColor: 'rgba(255, 184, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    letterSpacing: 4,
    textTransform: 'uppercase' as const,
  },
  headerDivider: {
    width: 100,
    height: 2,
    backgroundColor: '#FFB800',
    marginTop: 12,
    opacity: 0.3,
  },
  notificationButton: {
    position: "absolute",
    right: -10,
    top: 0,
    padding: 10,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 24,
    backgroundColor: "rgba(30,30,46,0.5)",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeTabBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  tabText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  updateBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  activeTabText: {
    color: "#000",
  },
  scrollView: {
    flex: 1,
    marginBottom: 80,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#888",
    letterSpacing: 2,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#FFF",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFB800',
    borderRadius: 3,
  },
  progressFillLow: {
    backgroundColor: '#FF6B6B',
  },
  progressFillExpired: {
    backgroundColor: '#666',
  },
  cardBody: {
    marginBottom: 12,
  },
  countdown: {
    fontSize: 32,
    fontWeight: "900" as const,
    color: "#FFB800",
    letterSpacing: 1,
  },
  countdownLow: {
    color: "#FF6B6B",
  },
  countdownExpired: {
    color: "#666",
  },
  resourceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  resourceValue: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: "#00D4FF",
  },
  valueLow: {
    color: "#FF6B6B",
  },
  resourceDivider: {
    fontSize: 20,
    color: "#666",
  },
  resourceThreshold: {
    fontSize: 20,
    color: "#888",
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginLeft: 'auto',
  },
  warningText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    color: "#666",
    marginTop: 20,
    fontWeight: '600' as const,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#444",
    marginTop: 8,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#FFB800",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  blurView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: "#1E1E2E",
    borderRadius: 24,
    width: width - 40,
    maxWidth: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900" as const,
    color: "#FFF",
    letterSpacing: 2,
  },
  modalBody: {
    padding: 24,
    paddingTop: 0,
  },
  categoryPicker: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 12,
  },
  categoryOption: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryOptionGradient: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  categoryOptionActive: {
    borderColor: 'transparent',
  },
  categoryOptionText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  categoryOptionTextActive: {
    color: "#000",
  },
  input: {
    backgroundColor: "rgba(42,42,62,0.5)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    color: "#FFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputLabel: {
    color: "#888",
    fontSize: 11,
    marginBottom: 12,
    letterSpacing: 2,
    fontWeight: '700' as const,
  },
  timerInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 8,
  },
  timerInputGroup: {
    flex: 1,
    alignItems: "center",
  },
  timerInput: {
    backgroundColor: "rgba(42,42,62,0.5)",
    borderRadius: 8,
    padding: 12,
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold" as const,
    textAlign: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timerLabel: {
    color: "#666",
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 1,
    fontWeight: '700' as const,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(42,42,62,0.5)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelButtonText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  reminderSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  reminderToggleText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  reminderIntervalRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  reminderIntervalInput: {
    flex: 0.3,
    marginBottom: 0,
  },
  reminderUnitPicker: {
    flex: 0.7,
    flexDirection: 'row',
    gap: 8,
  },
  reminderUnitOption: {
    flex: 1,
    backgroundColor: 'rgba(42,42,62,0.5)',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  reminderUnitOptionActive: {
    backgroundColor: 'rgba(255,184,0,0.2)',
    borderColor: '#FFB800',
  },
  reminderUnitText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  reminderUnitTextActive: {
    color: '#FFB800',
  },
  reminderIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,184,0,0.1)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  reminderIndicatorText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#FFB800',
    fontWeight: '600' as const,
    letterSpacing: 2,
  },
});