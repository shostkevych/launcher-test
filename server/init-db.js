const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB1_HOST,
  port: process.env.DB1_PORT,
  database: process.env.DB1_DATABASE,
  user: process.env.DB1_USER,
  password: process.env.DB1_PASSWORD,
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
