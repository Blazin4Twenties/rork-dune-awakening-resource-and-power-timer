import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useUpdates, Update } from '@/hooks/updates-context';
import { useDebug } from '@/hooks/debug-context';
import { Bell, AlertCircle, Info, AlertTriangle, X, Plus, Trash2, Edit2 } from 'lucide-react-native';

export default function UpdatesPanel() {
  const { updates, addUpdate, removeUpdate, markAsViewed, markAllAsViewed, clearAllUpdates } = useUpdates();
  const { debugEnabled } = useDebug();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    title: '',
    message: '',
    type: 'information' as Update['type'],
    author: 'Developer',
  });

  const getTypeIcon = (type: Update['type']) => {
    switch (type) {
      case 'critical':
        return <AlertCircle size={20} color="#FF3B30" />;
      case 'warning':
        return <AlertTriangle size={20} color="#FF9500" />;
      case 'update':
        return <Bell size={20} color="#007AFF" />;
      default:
        return <Info size={20} color="#34C759" />;
    }
  };

  const getTypeColor = (type: Update['type']) => {
    switch (type) {
      case 'critical':
        return '#FF3B30';
      case 'warning':
        return '#FF9500';
      case 'update':
        return '#007AFF';
      default:
        return '#34C759';
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.title.trim() || !newUpdate.message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    await addUpdate(
      newUpdate.title,
      newUpdate.message,
      newUpdate.type,
      newUpdate.author
    );

    setNewUpdate({
      title: '',
      message: '',
      type: 'information',
      author: 'Developer',
    });
    setShowAddModal(false);
  };

  const handleDeleteUpdate = (id: string) => {
    Alert.alert(
      'Delete Update',
      'Are you sure you want to delete this update?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeUpdate(id) },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Updates & Information</Text>
        <View style={styles.headerButtons}>
          {updates.length > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsViewed}
            >
              <Text style={styles.markAllText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
          {debugEnabled && (
            <>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={20} color="#FFF" />
              </TouchableOpacity>
              {updates.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    Alert.alert(
                      'Clear All Updates',
                      'This will permanently delete all updates. Are you sure?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Clear All', style: 'destructive', onPress: clearAllUpdates },
                      ]
                    );
                  }}
                >
                  <Trash2 size={18} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.updatesList} showsVerticalScrollIndicator={false}>
        {updates.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color="#8E8E93" />
            <Text style={styles.emptyText}>No updates available</Text>
            {debugEnabled && (
              <Text style={styles.emptySubtext}>
                Tap the + button to add an update
              </Text>
            )}
          </View>
        ) : (
          updates.map((update) => (
            <TouchableOpacity
              key={update.id}
              style={[
                styles.updateCard,
                { borderLeftColor: getTypeColor(update.type) }
              ]}
              onPress={() => markAsViewed(update.id)}
              activeOpacity={0.7}
            >
              <View style={styles.updateHeader}>
                <View style={styles.updateTitleRow}>
                  {getTypeIcon(update.type)}
                  <Text style={styles.updateTitle}>{update.title}</Text>
                </View>
                {debugEnabled && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteUpdate(update.id)}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.updateMessage}>{update.message}</Text>
              <View style={styles.updateFooter}>
                <Text style={styles.updateDate}>{formatDate(update.date)}</Text>
                {update.author && (
                  <Text style={styles.updateAuthor}>by {update.author}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Update Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Update</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAddModal(false)}
              >
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor="#8E8E93"
              value={newUpdate.title}
              onChangeText={(text) => setNewUpdate({ ...newUpdate, title: text })}
            />

            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Message"
              placeholderTextColor="#8E8E93"
              value={newUpdate.message}
              onChangeText={(text) => setNewUpdate({ ...newUpdate, message: text })}
              multiline
              numberOfLines={4}
            />

            <TextInput
              style={styles.input}
              placeholder="Author (optional)"
              placeholderTextColor="#8E8E93"
              value={newUpdate.author}
              onChangeText={(text) => setNewUpdate({ ...newUpdate, author: text })}
            />

            <View style={styles.typeSelector}>
              <Text style={styles.typeSelectorLabel}>Type:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(['information', 'update', 'warning', 'critical'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newUpdate.type === type && styles.typeButtonActive,
                      { borderColor: getTypeColor(type) }
                    ]}
                    onPress={() => setNewUpdate({ ...newUpdate, type })}
                  >
                    {getTypeIcon(type)}
                    <Text style={[
                      styles.typeButtonText,
                      newUpdate.type === type && { color: getTypeColor(type) }
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddUpdate}
              >
                <Text style={styles.saveButtonText}>Add Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 15,
  },
  markAllText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updatesList: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
  },
  updateCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  updateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  updateMessage: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    marginBottom: 12,
  },
  updateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  updateAuthor: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  modalCloseButton: {
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    color: '#000',
  },
  messageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    marginBottom: 20,
  },
  typeSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 10,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#F2F2F7',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});