const { Pool } = require('pg');

// PostgreSQL connection
const dbUrl = process.env.TODO_DB_URL;
console.log('TODO_DB_URL:', dbUrl);
const pool = new Pool(
  dbUrl
    ? { connectionString: dbUrl }
    : {
        host: process.env.TODO_DB_HOST,
        port: process.env.TODO_DB_PORT,
        database: process.env.TODO_DB_DATABASE,
        user: process.env.TODO_DB_USER,
        password: process.env.TODO_DB_PASSWORD,
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
