import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function UploadItem({ item }) {
  const statusColor = { queued: '#999', uploading: '#1E6FD9', complete: '#22C55E', failed: '#EF4444' };
  const statusIcon = { queued: 'time-outline', uploading: 'cloud-upload-outline', complete: 'checkmark-circle', failed: 'close-circle' };

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <View style={styles.card}>
      <Ionicons name={statusIcon[item.status]} size={20} color={statusColor[item.status]} />
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.size}>{formatSize(item.size)}</Text>
        </View>
        {item.status === 'uploading' && (
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
          </View>
        )}
        <Text style={[styles.status, { color: statusColor[item.status] }]}>
          {item.status === 'uploading' ? `${item.progress}%` : item.status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 8, borderWidth: 0.5, borderColor: '#eee',
  },
  info: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 13, fontWeight: '600', color: '#1a1a2e', flex: 1, marginRight: 8 },
  size: { fontSize: 12, color: '#999' },
  progressBg: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 4 },
  progressFill: { height: 4, backgroundColor: '#1E6FD9', borderRadius: 2 },
  status: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
