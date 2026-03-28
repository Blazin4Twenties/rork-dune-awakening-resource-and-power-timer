import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Alert,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Terminal,
  Lock,
  X,
  CheckCircle,
  XCircle,
  Settings,
  Clock,
  Package,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye,
  EyeOff,
  Bell,
} from 'lucide-react-native';
import { useDebug, LogEntry } from '@/hooks/debug-context';
import { useUpdates } from '@/hooks/updates-context';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function DebugPanel() {
  const {
    debugEnabled,
    logs,
    clearLogs,
    enableDebugMode,
    disableDebugMode,
    pauseFunction,
    resumeFunction,
    isFunctionPaused,
  } = useDebug();
  const { addUpdate } = useUpdates();

  const [tapCount, setTapCount] = useState(0);
  const [passwordModal, setPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pauseModal, setPauseModal] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState('');
  const [pauseMessage, setPauseMessage] = useState('');
  const [logsExpanded, setLogsExpanded] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const FUNCTIONS = [
    { id: 'addTimer', name: 'Add Timer', icon: Clock },
    { id: 'deleteTimer', name: 'Delete Timer', icon: Trash2 },
    { id: 'resetTimer', name: 'Reset Timer', icon: Clock },
    { id: 'addResource', name: 'Add Resource', icon: Package },
    { id: 'deleteResource', name: 'Delete Resource', icon: Trash2 },
    { id: 'updateResource', name: 'Update Resource', icon: Package },
  ];

  const handleSecretTap = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
    }

    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 5) {
      setPasswordModal(true);
      setTapCount(0);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    tapTimer.current = setTimeout(() => {
      setTapCount(0);
    }, 2000);
  };

  const handlePasswordSubmit = () => {
    if (enableDebugMode(password)) {
      setPasswordModal(false);
      setPassword('');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      Alert.alert('Invalid Password', 'The password is incorrect');
      setPassword('');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handlePauseFunction = (functionId: string) => {
    setSelectedFunction(functionId);
    setPauseModal(true);
  };

  const confirmPauseFunction = () => {
    pauseFunction(selectedFunction, pauseMessage || 'Function temporarily unavailable');
    setPauseModal(false);
    setPauseMessage('');
    setSelectedFunction('');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    const iconProps = { size: 14, color: '#FFF' };
    switch (type) {
      case 'timer': return <Clock {...iconProps} color="#FFB800" />;
      case 'resource': return <Package {...iconProps} color="#00D4FF" />;
      case 'system': return <Settings {...iconProps} color="#888" />;
      case 'error': return <XCircle {...iconProps} color="#FF6B6B" />;
      case 'warning': return <AlertTriangle {...iconProps} color="#FFA500" />;
      case 'info': return <Info {...iconProps} color="#3498DB" />;
      default: return <CheckCircle {...iconProps} color="#27AE60" />;
    }
  };

  const renderLogEntry = ({ item }: { item: LogEntry }) => (
    <View style={styles.logEntry}>
      <View style={styles.logIcon}>{getLogIcon(item.type)}</View>
      <View style={styles.logContent}>
        <Text style={styles.logAction}>{item.action}</Text>
        <Text style={styles.logMessage}>{item.message}</Text>
        <Text style={styles.logTime}>
          {item.timestamp.toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  if (!debugEnabled) {
    return (
      <>
        <Pressable
          style={styles.secretTapArea}
          onPress={handleSecretTap}
        />

        <Modal
          visible={passwordModal}
          transparent
          animationType="fade"
          onRequestClose={() => setPasswordModal(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} style={styles.blurView}>
              <View style={styles.modalContent}>
                <LinearGradient
                  colors={['rgba(255,184,0,0.1)', 'rgba(255,184,0,0.05)']}
                  style={styles.modalHeader}
                >
                  <Terminal size={24} color="#FFB800" />
                  <Text style={styles.modalTitle}>ENTER DEBUG PASSWORD</Text>
                </LinearGradient>
                
                <View style={styles.modalBody}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoFocus
                  />
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setPasswordModal(false);
                        setPassword('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePasswordSubmit}>
                      <LinearGradient
                        colors={['#FFB800', '#FF8C00']}
                        style={styles.submitButton}
                      >
                        <Text style={styles.submitButtonText}>UNLOCK</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </BlurView>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <>
      {showDebugPanel && (
        <View style={styles.debugContainer}>
          <LinearGradient
            colors={['rgba(255,0,0,0.15)', 'rgba(255,0,0,0.05)']}
            style={styles.debugHeader}
          >
            <View style={styles.debugHeaderContent}>
              <Terminal size={20} color="#FF6B6B" />
              <Text style={styles.debugTitle}>DEBUG MODE</Text>
              <TouchableOpacity
                onPress={() => setShowDebugPanel(false)}
                style={styles.hideButton}
              >
                <EyeOff size={18} color="#888" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  disableDebugMode();
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={styles.closeButton}
              >
                <X size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.functionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>FUNCTION CONTROLS</Text>
              <TouchableOpacity
                style={styles.addUpdateButton}
                onPress={() => {
                  addUpdate(
                    'Testing Update/Information',
                    'This is a test notification being sent to ensure the UI functions and picks up the broadcast correctly!',
                    'update',
                    'Developer'
                  );
                  Alert.alert('Update Added', 'A sample update has been added to the Updates panel');
                  if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
              >
                <Bell size={16} color="#34C759" />
                <Text style={styles.addUpdateText}>Add Sample Update</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.functionsGrid}>
              {FUNCTIONS.map((func) => {
                const isPaused = isFunctionPaused(func.id);
                const Icon = func.icon;
                return (
                  <TouchableOpacity
                    key={func.id}
                    style={[styles.functionButton, isPaused && styles.functionPaused]}
                    onPress={() => {
                      if (isPaused) {
                        resumeFunction(func.id);
                      } else {
                        handlePauseFunction(func.id);
                      }
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  >
                    <View style={styles.functionIcon}>
                      {isPaused ? <Lock size={16} color="#FF6B6B" /> : <Icon size={16} color="#FFB800" />}
                    </View>
                    <Text style={[styles.functionName, isPaused && styles.functionNamePaused]}>
                      {func.name}
                    </Text>
                    <Text style={styles.functionStatus}>
                      {isPaused ? 'PAUSED' : 'ACTIVE'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.logsSection}>
            <TouchableOpacity
              style={styles.logsHeader}
              onPress={() => setLogsExpanded(!logsExpanded)}
            >
              <View style={styles.logsHeaderLeft}>
                <Terminal size={16} color="#888" />
                <Text style={styles.logsTitle}>ACTIVITY LOG ({logs.length})</Text>
              </View>
              <View style={styles.logsHeaderRight}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    clearLogs();
                  }}
                  style={styles.clearButton}
                >
                  <Trash2 size={14} color="#888" />
                </TouchableOpacity>
                {logsExpanded ? (
                  <ChevronUp size={18} color="#888" />
                ) : (
                  <ChevronDown size={18} color="#888" />
                )}
              </View>
            </TouchableOpacity>
            
            {logsExpanded && (
              <FlatList
                data={logs}
                renderItem={renderLogEntry}
                keyExtractor={(item) => item.id}
                style={styles.logsList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyLogs}>No activity logged yet</Text>
                }
              />
            )}
          </View>
        </View>
      )}

      {!showDebugPanel && (
        <TouchableOpacity
          style={styles.showDebugButton}
          onPress={() => setShowDebugPanel(true)}
        >
          <LinearGradient
            colors={['rgba(255,0,0,0.9)', 'rgba(255,0,0,0.7)']}
            style={styles.showDebugGradient}
          >
            <Eye size={16} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Modal
        visible={pauseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPauseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} style={styles.blurView}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={['rgba(255,107,107,0.1)', 'rgba(255,107,107,0.05)']}
                style={styles.modalHeader}
              >
                <Lock size={24} color="#FF6B6B" />
                <Text style={styles.modalTitle}>PAUSE FUNCTION</Text>
              </LinearGradient>
              
              <View style={styles.modalBody}>
                <Text style={styles.pauseFunctionName}>
                  {FUNCTIONS.find(f => f.id === selectedFunction)?.name}
                </Text>
                <TextInput
                  style={[styles.passwordInput, { height: 100 }]}
                  placeholder="Message to show users (optional)"
                  placeholderTextColor="#666"
                  value={pauseMessage}
                  onChangeText={setPauseMessage}
                  multiline
                  textAlignVertical="top"
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setPauseModal(false);
                      setPauseMessage('');
                      setSelectedFunction('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmPauseFunction}>
                    <LinearGradient
                      colors={['#FF6B6B', '#FF4444']}
                      style={styles.submitButton}
                    >
                      <Text style={styles.submitButtonText}>PAUSE</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  secretTapArea: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 60,
    height: 60,
    zIndex: 1000,
  },
  debugContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
    zIndex: 999,
  },
  debugHeader: {
    padding: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  debugHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900' as const,
    color: '#FF6B6B',
    letterSpacing: 2,
  },
  hideButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  functionsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#888',
    letterSpacing: 1,
  },
  addUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,199,89,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.2)',
  },
  addUpdateText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  functionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  functionButton: {
    backgroundColor: 'rgba(255,184,0,0.05)',
    borderRadius: 8,
    padding: 8,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
  },
  functionPaused: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderColor: 'rgba(255,107,107,0.3)',
  },
  functionIcon: {
    marginBottom: 4,
  },
  functionName: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  functionNamePaused: {
    color: '#FF6B6B',
  },
  functionStatus: {
    fontSize: 8,
    color: '#666',
    letterSpacing: 1,
  },
  logsSection: {
    flex: 1,
  },
  logsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logsTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#888',
    letterSpacing: 1,
  },
  clearButton: {
    padding: 4,
  },
  logsList: {
    maxHeight: 200,
    padding: 16,
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 8,
    borderRadius: 8,
  },
  logIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  logContent: {
    flex: 1,
  },
  logAction: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFF',
    marginBottom: 2,
  },
  logMessage: {
    fontSize: 10,
    color: '#888',
    marginBottom: 2,
  },
  logTime: {
    fontSize: 9,
    color: '#666',
  },
  emptyLogs: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    padding: 20,
  },
  showDebugButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 999,
  },
  showDebugGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E2E',
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#FFF',
    letterSpacing: 2,
  },
  modalBody: {
    padding: 24,
    paddingTop: 0,
  },
  passwordInput: {
    backgroundColor: 'rgba(42,42,62,0.5)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  pauseFunctionName: {
    fontSize: 14,
    color: '#FFB800',
    fontWeight: '600' as const,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(42,42,62,0.5)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
});