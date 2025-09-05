import React, { useState } from "react";
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
  CheckCircle,
  ChevronRight,
  Info,
  Lock,
  Globe,
  Sparkles,
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
  const [isAgreed, setIsAgreed] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  const handleAccept = async () => {
    if (isAgreed) {
      await acceptTerms();
    }
  };

  const sections = [
    {
      title: "Welcome to Dune Resource Manager",
      subtitle: "Your Ultimate Productivity Companion",
      content: (
        <View style={styles.sectionContent}>
          <View style={styles.heroContainer}>
            <View style={styles.heroIconBg}>
              <Sparkles size={60} color="#FFD700" />
            </View>
            <Text style={styles.heroText}>
              Experience the power of intelligent resource management with cutting-edge features designed to boost your productivity.
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>10K+</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>4.8★</Text>
              <Text style={styles.statLabel}>User Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>99.9%</Text>
              <Text style={styles.statLabel}>Uptime</Text>
            </View>
          </View>
        </View>
      ),
    },
    {
      title: "Core Features",
      subtitle: "Everything You Need",
      content: (
        <ScrollView style={styles.featuresScroll} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
      ),
    },
    {
      title: "Privacy & Terms",
      subtitle: "Your Trust Matters",
      content: (
        <ScrollView style={styles.termsScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.privacySection}>
            <View style={styles.privacyHeader}>
              <Lock size={20} color="#4A90E2" />
              <Text style={styles.privacyTitle}>Data Protection</Text>
            </View>
            <Text style={styles.privacyText}>
              • All personal data is encrypted using industry-standard AES-256 encryption
              {"\n"}• We never sell or share your personal information
              {"\n"}• You have full control over your data and can delete it anytime
              {"\n"}• Optional cloud sync uses secure OAuth 2.0 authentication
            </Text>
          </View>

          <View style={styles.privacySection}>
            <View style={styles.privacyHeader}>
              <Globe size={20} color="#00C853" />
              <Text style={styles.privacyTitle}>Terms of Service</Text>
            </View>
            <Text style={styles.privacyText}>
              • This app is provided &quot;as is&quot; for personal and commercial use
              {"\n"}• Users must be 13 years or older to use this application
              {"\n"}• You agree not to use the app for any illegal purposes
              {"\n"}• We reserve the right to update features and terms with notice
              {"\n"}• Service availability is subject to maintenance windows
            </Text>
          </View>

          <View style={styles.privacySection}>
            <View style={styles.privacyHeader}>
              <Info size={20} color="#FFB300" />
              <Text style={styles.privacyTitle}>Legal Information</Text>
            </View>
            <Text style={styles.privacyText}>
              © 2024 Dune Resource Manager. All rights reserved.
              {"\n"}Version 1.0.0 (Build 2024.12)
              {"\n"}Developed with ❤️ by the Dune Team
              {"\n"}Licensed under MIT License
              {"\n"}Third-party libraries used under respective licenses
            </Text>
          </View>

          <View style={styles.agreementContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsAgreed(!isAgreed)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isAgreed && styles.checkboxChecked]}>
                {isAgreed && <CheckCircle size={20} color="#FFF" />}
              </View>
              <Text style={styles.agreementText}>
                I have read and agree to the Terms of Service and Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ),
    },
  ];

  const currentSectionData = sections[currentSection];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.title}>{currentSectionData.title}</Text>
            <Text style={styles.subtitle}>{currentSectionData.subtitle}</Text>
          </View>

          <View style={styles.contentContainer}>{currentSectionData.content}</View>

          <View style={styles.navigation}>
            <View style={styles.dots}>
              {sections.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentSection && styles.dotActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.buttons}>
              {currentSection > 0 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setCurrentSection(currentSection - 1)}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {currentSection < sections.length - 1 ? (
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => setCurrentSection(currentSection + 1)}
                >
                  <Text style={styles.nextButtonText}>Next</Text>
                  <ChevronRight size={20} color="#FFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.acceptButton,
                    !isAgreed && styles.acceptButtonDisabled,
                  ]}
                  onPress={handleAccept}
                  disabled={!isAgreed}
                >
                  <Text style={styles.acceptButtonText}>Accept & Continue</Text>
                  <CheckCircle size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
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
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold" as const,
    color: "#FFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#B0BEC5",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionContent: {
    flex: 1,
    justifyContent: "center",
  },
  heroContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  heroIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  heroText: {
    fontSize: 16,
    color: "#E0E0E0",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: "#FFD700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#B0BEC5",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  featuresScroll: {
    flex: 1,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  termsScroll: {
    flex: 1,
  },
  privacySection: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#FFF",
    marginLeft: 8,
  },
  privacyText: {
    fontSize: 14,
    color: "#E0E0E0",
    lineHeight: 22,
  },
  agreementContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#4A90E2",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  agreementText: {
    flex: 1,
    fontSize: 14,
    color: "#E0E0E0",
    lineHeight: 20,
  },
  navigation: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: "#FFD700",
    width: 24,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  backButtonText: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "600" as const,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginLeft: "auto",
  },
  nextButtonText: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "600" as const,
    marginRight: 8,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00C853",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginLeft: "auto",
  },
  acceptButtonDisabled: {
    backgroundColor: "rgba(0, 200, 83, 0.3)",
  },
  acceptButtonText: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "600" as const,
    marginRight: 8,
  },
});