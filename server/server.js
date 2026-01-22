const express = require('express');
const { Pool } = require('pg');
const { Eta } = require('eta');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse and escape DB1_URL password
function escapeConnectionUrl(url) {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      // URL-encode the password
      const encodedPassword = encodeURIComponent(urlObj.password);
      urlObj.password = encodedPassword;
      return urlObj.toString();
    }
    return url;
  } catch (error) {
    // If URL parsing fails, return original
    return url;
  }
}

// PostgreSQL connection
const originalDbUrl = process.env.DB1_URL;
const dbUrl = escapeConnectionUrl(originalDbUrl);
console.log('DB1_URL (original):', originalDbUrl);
console.log('DB1_URL (escaped):', dbUrl);
const pool = new Pool({
  connectionString: dbUrl,
});

// ETA templating setup
const viewsPath = path.join(__dirname, 'views');
console.log('Views path:', viewsPath);
const eta = new Eta({ views: viewsPath });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize database on startup
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database ready');
  } catch (error) {
    console.error('Database error:', error);
  }
}

// Routes
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    const todos = result.rows;
    const templatePath = path.join(viewsPath, 'index.eta');
    res.send(await eta.renderFile(templatePath, { todos }));
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).send('Error loading todos');
  }
});

app.post('/todos', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.redirect('/');
    }
    await pool.query('INSERT INTO todos (text) VALUES ($1)', [text.trim()]);
    res.redirect('/');
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).send('Error creating todo');
  }
});

app.post('/todos/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE todos SET completed = NOT completed WHERE id = $1', [id]);
    res.redirect('/');
  } catch (error) {
    console.error('Error toggling todo:', error);
    res.status(500).send('Error updating todo');
  }
});

app.post('/todos/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).send('Error deleting todo');
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
