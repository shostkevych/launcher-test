const express = require('express');
const os = require('os');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Generate unique container identifier on startup
const CONTAINER_ID = crypto.randomBytes(8).toString('hex');

// Get container IP address
function getContainerIP() {
  const interfaces = os.networkInterfaces();
  
  // Try to find a non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  
  // Fallback to first available IP
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  
  return '127.0.0.1';
}

app.get('/', (req, res) => {
  const containerIP = getContainerIP();
  const hostname = os.hostname();
  
  res.json({
    message: 'Hello from Docker Swarm',
    containerIP: containerIP,
    hostname: hostname,
    containerId: CONTAINER_ID,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    containerId: CONTAINER_ID,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Container IP: ${getContainerIP()}`);
  console.log(`Hostname: ${os.hostname()}`);
  console.log(`Container ID: ${CONTAINER_ID}`);
});
