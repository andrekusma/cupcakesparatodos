import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = process.argv[2];
if (!filePath) {
  console.error('Uso: node scripts/run-sql.js <arquivo.sql>');
  process.exit(1);
}

const sqlPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
const sql = fs.readFileSync(sqlPath, 'utf8');

(async () => {
  try {
    await pool.query(sql);
    console.log('Script SQL executado com sucesso.');
  } catch (err) {
    console.error('Erro executando SQL:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();