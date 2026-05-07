const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/notifications' });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// DB setup
const db = new sqlite3.Database('docmanager.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT,
    size INTEGER,
    mimetype TEXT,
    url TEXT,
    created_at TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    message TEXT,
    type TEXT,
    timestamp TEXT,
    is_read INTEGER DEFAULT 0
  )`);
});

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Broadcast to all WS clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify(data));
  });
}

// Save notification to DB and broadcast
function createNotification(message, type = 'success') {
  const notif = {
    id: uuidv4(),
    message,
    type,
    timestamp: new Date().toISOString(),
    is_read: 0
  };
  db.run(
    `INSERT INTO notifications (id, message, type, timestamp, is_read) VALUES (?, ?, ?, ?, ?)`,
    [notif.id, notif.message, notif.type, notif.timestamp, notif.is_read]
  );
  broadcast({ type: 'notification', data: notif });
  return notif;
}

// POST /api/upload
app.post('/api/upload', upload.array('files'), (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) return res.status(400).json({ error: 'No files' });

  const docs = files.map(file => ({
    id: uuidv4(),
    name: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    url: `/uploads/${file.filename}`,
    created_at: new Date().toISOString()
  }));

  docs.forEach(doc => {
    db.run(
      `INSERT INTO documents (id, name, size, mimetype, url, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [doc.id, doc.name, doc.size, doc.mimetype, doc.url, doc.created_at]
    );
  });

  if (files.length > 3) {
    createNotification(`${files.length} files uploaded successfully`, 'success');
  } else {
    docs.forEach(doc => createNotification(`${doc.name} uploaded successfully`, 'success'));
  }

  res.json({ success: true, documents: docs });
});

// GET /api/documents
app.get('/api/documents', (req, res) => {
  db.all('SELECT * FROM documents ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// DELETE /api/documents/:id
app.delete('/api/documents/:id', (req, res) => {
  db.get('SELECT * FROM documents WHERE id = ?', [req.params.id], (err, doc) => {
    if (!doc) return res.status(404).json({ error: 'Not found' });
    try { fs.unlinkSync(path.join('uploads', path.basename(doc.url))); } catch (e) {}
    db.run('DELETE FROM documents WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });
});

// GET /api/notifications
app.get('/api/notifications', (req, res) => {
  db.all('SELECT * FROM notifications ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/notifications/unread-count
app.get('/api/notifications/unread-count', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0', [], (err, row) => {
    res.json({ count: row?.count || 0 });
  });
});

// PATCH /api/notifications/read-all  ← must be BEFORE /:id/read
app.patch('/api/notifications/read-all', (req, res) => {
  db.run('UPDATE notifications SET is_read = 1');
  res.json({ success: true });
});

// PATCH /api/notifications/:id/read
app.patch('/api/notifications/:id/read', (req, res) => {
  db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// WebSocket
wss.on('connection', (ws) => {
  console.log('WS client connected');
  ws.on('close', () => console.log('WS client disconnected'));
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});