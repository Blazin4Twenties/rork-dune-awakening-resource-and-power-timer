import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Clock,
  Bell,
  BarChart3,
  Shield,
  Zap,
  Users,
  ChevronRight,
} from "lucide-react-native";
import { useAppStatus } from "@/hooks/app-status-context";



interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIconContainer}>{icon}</View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

export default function OnboardingScreen() {
  const { acceptTerms } = useAppStatus();

  const handleAccept = async () => {
    await acceptTerms();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.title}>Dune Resource Manager</Text>
            <Text style={styles.subtitle}>Master Your Time, Control Your Resources</Text>
          </View>

          <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Core Features</Text>
              
              <FeatureCard
                icon={<Clock size={24} color="#4A90E2" />}
                title="Smart Timer Management"
                description="Set custom timers with intelligent reminders that adapt to your schedule"
              />
              <FeatureCard
                icon={<Bell size={24} color="#E94B3C" />}
                title="Intelligent Notifications"
                description="Get timely alerts with customizable intervals and priority levels"
              />
              <FeatureCard
                icon={<BarChart3 size={24} color="#00C853" />}
                title="Resource Tracking"
                description="Monitor and optimize your resource usage with detailed analytics"
              />
              <FeatureCard
                icon={<Zap size={24} color="#FFB300" />}
                title="Real-time Updates"
                description="Stay informed with instant updates and live synchronization"
              />
              <FeatureCard
                icon={<Shield size={24} color="#7B68EE" />}
                title="Privacy First"
                description="Your data stays on your device with optional cloud backup"
              />
              <FeatureCard
                icon={<Users size={24} color="#FF6B6B" />}
                title="Collaboration Tools"
                description="Share timers and coordinate with team members seamlessly"
              />
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4a9eff', '#3a7fd5']}
                style={styles.acceptButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.acceptButtonText}>Agree & Continue</Text>
                <ChevronRight size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: "bold" as const,
    color: "#FFF",
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: "#B0BEC5",
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600" as const,
    color: "#FFF",
    marginBottom: 20,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(74, 158, 255, 0.2)",
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFF",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: "#B0BEC5",
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  acceptButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  acceptButtonText: {
    fontSize: 18,
    color: "#FFF",
    fontWeight: "600" as const,
    marginRight: 8,
  },
});