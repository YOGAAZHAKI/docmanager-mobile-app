# DocManager — Mobile Document Management App

## Tech Stack
- **Mobile**: React Native (Expo)
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Real-time**: WebSocket (ws)
- **File Storage**: Local disk (multer)

## Features
- Upload single or multiple PDFs with per-file progress bars
- Bulk upload (4+ files) triggers background banner
- Real-time WebSocket notifications on upload complete
- Notification center with unread badge count
- Mark notifications as read / mark all read
- Delete documents
- Persists across app restarts

## Setup Instructions

### Step 1 — Backend
```bash
cd backend
npm install
node server.js
```
Backend runs on `http://0.0.0.0:3001`

### Step 2 — Find your local IP
- **Windows**: Run `ipconfig` → look for **IPv4 Address**
- **Mac/Linux**: Run `ifconfig` → look for **inet**

Example: `192.168.1.105`

### Step 3 — Update config
Open `mobile/config.js` and change:
```js
const LOCAL_IP = '192.168.1.100'; // Replace with your actual IP
```

### Step 4 — Mobile App
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with **Expo Go** app (download from App Store / Play Store)

## Environment Variables
No `.env` needed. All config lives in `mobile/config.js`.

| Variable | File | Description |
|----------|------|-------------|
| `LOCAL_IP` | `mobile/config.js` | Your machine's local network IP |
| `PORT` | `backend/server.js` | Backend port (default: 3001) |

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload | Upload one or more PDF files |
| GET | /api/documents | List all uploaded documents |
| DELETE | /api/documents/:id | Delete a document |
| GET | /api/notifications | Get all notifications |
| GET | /api/notifications/unread-count | Get unread count |
| PATCH | /api/notifications/:id/read | Mark one as read |
| PATCH | /api/notifications/read-all | Mark all as read |
| WS | /ws/notifications | WebSocket for real-time events |
