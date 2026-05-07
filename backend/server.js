const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const Database = require('better-sqlite3');
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

const db = new Database('docmanager.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT,
    size INTEGER,
    mimetype TEXT,
    url TEXT,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    message TEXT,
    type TEXT,
    timestamp TEXT,
    is_read INTEGER DEFAULT 0
  );
`);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify(data));
  });
}

function createNotification(message, type = 'success') {
  const notif = {
    id: uuidv4(),
    message,
    type,
    timestamp: new Date().toISOString(),
    is_read: 0
  };
  db.prepare(`INSERT INTO notifications (id, message, type, timestamp, is_read) VALUES (?, ?, ?, ?, ?)`)
    .run(notif.id, notif.message, notif.type, notif.timestamp, notif.is_read);
  broadcast({ type: 'notification', data: notif });
  return notif;
}

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
    db.prepare(`INSERT INTO documents (id, name, size, mimetype, url, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(doc.id, doc.name, doc.size, doc.mimetype, doc.url, doc.created_at);
  });

  if (files.length > 3) {
    createNotification(`${files.length} files uploaded successfully`, 'success');
  } else {
    docs.forEach(doc => {
      createNotification(`${doc.name} uploaded successfully`, 'success');
    });
  }

  res.json({ success: true, documents: docs });
});

app.get('/api/documents', (req, res) => {
  const docs = db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all();
  res.json(docs);
});

app.delete('/api/documents/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  try { fs.unlinkSync(path.join('uploads', path.basename(doc.url))); } catch (e) {}
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/notifications', (req, res) => {
  const notifs = db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC').all();
  res.json(notifs);
});

app.get('/api/notifications/unread-count', (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get();
  res.json({ count: row.count });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.patch('/api/notifications/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1').run();
  res.json({ success: true });
});

wss.on('connection', (ws) => {
  console.log('WS client connected');
  ws.on('close', () => console.log('WS client disconnected'));
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
