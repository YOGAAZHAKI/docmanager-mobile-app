import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, SafeAreaView, ScrollView
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../config';
import UploadItem from '../components/UploadItem';
import DocumentItem from '../components/DocumentItem';

export default function HomeScreen() {
  const [documents, setDocuments] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkCount, setBulkCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDocuments(); }, []);

  async function fetchDocuments() {
    try {
      const res = await fetch(`${API_BASE}/api/documents`);
      const data = await res.json();
      setDocuments(data);
    } catch (e) {
      Alert.alert('Error', 'Could not load documents. Check your IP in config.js');
    } finally {
      setLoading(false);
    }
  }

  async function pickFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const files = result.assets;
      if (files.length > 3) {
        setBulkUploading(true);
        setBulkCount(files.length);
        uploadBulk(files);
      } else {
        const queue = files.map(f => ({
          id: Math.random().toString(),
          name: f.name,
          size: f.size,
          uri: f.uri,
          progress: 0,
          status: 'queued',
        }));
        setUploadQueue(queue);
        uploadFilesIndividually(queue);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick files');
    }
  }

  function updateQueueItem(id, updates) {
    setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }

  async function uploadFilesIndividually(queue) {
    for (const file of queue) {
      updateQueueItem(file.id, { status: 'uploading' });
      try {
        const formData = new FormData();
        formData.append('files', { uri: file.uri, name: file.name, type: 'application/pdf' });
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_BASE}/api/upload`);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              updateQueueItem(file.id, { progress: Math.round((e.loaded / e.total) * 100) });
            }
          };
          xhr.onload = () => {
            if (xhr.status === 200) {
              updateQueueItem(file.id, { status: 'complete', progress: 100 });
              resolve();
            } else {
              updateQueueItem(file.id, { status: 'failed' });
              reject();
            }
          };
          xhr.onerror = () => { updateQueueItem(file.id, { status: 'failed' }); reject(); };
          xhr.send(formData);
        });
      } catch (e) {
        updateQueueItem(file.id, { status: 'failed' });
      }
    }
    fetchDocuments();
  }

  async function uploadBulk(files) {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', { uri: file.uri, name: file.name, type: 'application/pdf' });
      });
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await res.json();
      fetchDocuments();
    } catch (e) {
      Alert.alert('Error', 'Bulk upload failed');
    } finally {
      setBulkUploading(false);
    }
  }

  async function deleteDocument(id) {
    Alert.alert('Delete', 'Delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await fetch(`${API_BASE}/api/documents/${id}`, { method: 'DELETE' });
          setDocuments(prev => prev.filter(d => d.id !== id));
        }
      }
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      {bulkUploading && (
        <View style={styles.bulkBanner}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.bulkText}>Uploading {bulkCount} files in background…</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickFiles}>
          <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
          <Text style={styles.uploadBtnText}>Upload PDFs</Text>
        </TouchableOpacity>

        {uploadQueue.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Uploading</Text>
            {uploadQueue.map(item => <UploadItem key={item.id} item={item} />)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents ({documents.length})</Text>
          {loading ? (
            <ActivityIndicator color="#1E6FD9" style={{ marginTop: 20 }} />
          ) : documents.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No documents yet</Text>
              <Text style={styles.emptySubText}>Upload PDFs to get started</Text>
            </View>
          ) : (
            documents.map(item => (
              <DocumentItem key={item.id} item={item} onDelete={() => deleteDocument(item.id)} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  bulkBanner: {
    backgroundColor: '#1E6FD9', flexDirection: 'row',
    alignItems: 'center', padding: 12, gap: 10,
  },
  bulkText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  uploadBtn: {
    margin: 16, backgroundColor: '#1E6FD9', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, gap: 8,
  },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 12 },
  emptySubText: { fontSize: 13, color: '#bbb', marginTop: 4 },
});
