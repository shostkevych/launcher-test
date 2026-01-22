const { Pool } = require('pg');

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

const originalDbUrl = process.env.DB1_URL;
const dbUrl = escapeConnectionUrl(originalDbUrl);
console.log('DB1_URL (original):', originalDbUrl);
console.log('DB1_URL (escaped):', dbUrl);
const pool = new Pool({
  connectionString: dbUrl,
});

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
    console.log('Database initialized successfully');
    await pool.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDB();
