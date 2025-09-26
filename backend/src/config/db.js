const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isRender = /\brender\.com\b/i.test(process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString,
  ssl: isRender ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

module.exports = { query, pool };
