const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isSSL = !/localhost|127\.0\.0\.1/.test(connectionString || '');

const pool = new Pool({
  connectionString,
  ssl: isSSL ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { query, pool };
