const express = require('express');
const { Eta } = require('eta');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = '/data';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure eta
const eta = new Eta({ views: path.join(__dirname, 'views') });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// List files in /data
function getFiles() {
  try {
    return fs.readdirSync(UPLOAD_DIR).map(name => {
      const filePath = path.join(UPLOAD_DIR, name);
      const stats = fs.statSync(filePath);
      return {
        name,
        size: (stats.size / 1024).toFixed(2) + ' KB',
        date: stats.mtime.toISOString().split('T')[0]
      };
    });
  } catch {
    return [];
  }
}

// Routes
app.get('/', (req, res) => {
  const files = getFiles();
  res.send(eta.render('index', { files }));
});

app.post('/upload', upload.single('file'), (req, res) => {
  res.redirect('/');
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } else {
    res.status(404).send('File not found');
  }
});

// API endpoint to list files as JSON
app.get('/api/files', (req, res) => {
  res.json(getFiles());
});

app.post('/delete/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Volume app running on port ${PORT}`);
});
