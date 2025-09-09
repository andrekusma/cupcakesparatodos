import fs from 'fs';
import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const file = process.argv[2];
if(!file){ console.error('Uso: node scripts/run-sql.js <arquivo.sql>'); process.exit(1); }

const sql = fs.readFileSync(file, 'utf8');

const useSSL = (process.env.DATABASE_SSL || 'false').toLowerCase() === 'true';
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: useSSL ? { rejectUnauthorized:false } : false });

(async () => {
  try{
    await client.connect();
    await client.query(sql);
    console.log('Script SQL executado com sucesso.');
  }catch(err){
    console.error('Erro executando SQL:', err.stack || err.message);
    process.exit(1);
  }finally{
    await client.end();
  }
})();
