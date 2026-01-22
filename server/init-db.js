const { Pool } = require('pg');

// PostgreSQL connection
const dbUrl = process.env.DB2_URL;
console.log('DB2_URL:', dbUrl);
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
