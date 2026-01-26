const { Pool } = require('pg');

// PostgreSQL connection
const dbUrl = process.env.SOMEDB_RESTORED_URL;
console.log('SOMEDB_RESTORED_URL:', dbUrl);
const pool = new Pool(
  dbUrl
    ? { connectionString: dbUrl }
    : {
        host: process.env.SOMEDB_RESTORED_HOST,
        port: process.env.SOMEDB_RESTORED_PORT,
        database: process.env.SOMEDB_RESTORED_DATABASE,
        user: process.env.SOMEDB_RESTORED_USER,
        password: process.env.SOMEDB_RESTORED_PASSWORD,
      }
);

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
