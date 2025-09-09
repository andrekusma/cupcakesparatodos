import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const useSSL = (process.env.DATABASE_SSL || 'false').toLowerCase() === 'true';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized:false } : false
});

export async function query(text, params){
  const client = await pool.connect();
  try{
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
