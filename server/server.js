const express = require('express');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Generate static random ID on startup
const STATIC_ID = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Function to get container IP
function getContainerIP() {
  const interfaces = os.networkInterfaces();
  
  // Try to find a non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  // Fallback to localhost if no external IP found
  return '127.0.0.1';
}

const containerIP = getContainerIP();

// Log TEST env variable every 5 seconds
setInterval(() => {
  console.log(`TEST env variable: ${process.env.TEST || 'not set'}`);
}, 5000);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    id: STATIC_ID,
    containerIP: containerIP,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    id: STATIC_ID,
    containerIP: containerIP,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Static ID: ${STATIC_ID}`);
  console.log(`Container IP: ${containerIP}`);
  console.log(`TEST env variable: ${process.env.TEST || 'not set'}`);
});
