import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationsScreen() {
  const { notifications, markAsRead, markAllRead } = useNotifications();

  function formatTime(iso) {
    return new Date(iso).toLocaleString();
  }

  return (
    <SafeAreaView style={styles.container}>
      {notifications.some(n => !n.is_read) && (
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}
      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notifCard, !item.is_read && styles.unread]}
              onPress={() => !item.is_read && markAsRead(item.id)}
            >
              <View style={styles.notifIcon}>
                <Ionicons
                  name={item.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={22}
                  color={item.type === 'success' ? '#22C55E' : '#EF4444'}
                />
              </View>
              <View style={styles.notifBody}>
                <Text style={styles.notifMsg}>{item.message}</Text>
                <Text style={styles.notifTime}>{formatTime(item.timestamp)}</Text>
              </View>
              {!item.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  markAllBtn: {
    alignSelf: 'flex-end', margin: 16, marginBottom: 0,
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: '#EEF4FF', borderRadius: 20,
  },
  markAllText: { color: '#1E6FD9', fontWeight: '600', fontSize: 13 },
  notifCard: {
    backgroundColor: '#fff', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center',
    padding: 14, marginBottom: 10,
    borderWidth: 0.5, borderColor: '#eee',
  },
  unread: { borderColor: '#1E6FD9', borderWidth: 1, backgroundColor: '#F0F6FF' },
  notifIcon: { marginRight: 12 },
  notifBody: { flex: 1 },
  notifMsg: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginBottom: 3 },
  notifTime: { fontSize: 12, color: '#999' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#1E6FD9', marginLeft: 8,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
});
