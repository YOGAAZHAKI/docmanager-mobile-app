// ⚠️ IMPORTANT: Replace with your machine's local IP
// Windows: run `ipconfig` → look for IPv4 Address
// Mac/Linux: run `ifconfig` → look for inet
const LOCAL_IP = '192.168.1.100'; // <-- CHANGE THIS!

export const API_BASE = `http://${LOCAL_IP}:3001`;
export const WS_BASE = `ws://${LOCAL_IP}:3001`;
