import 'dotenv/config';
import { query } from '../src/config/db.js';
import { hashPassword } from '../src/utils/hash.js';

const email = process.env.ADMIN_EMAIL;
const pass  = process.env.ADMIN_PASSWORD;

if(!email || !pass){
  console.error('Defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente.');
  process.exit(1);
}

(async () => {
  try{
    const h = await hashPassword(pass);
    await query('INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING', [email, h, 'admin']);
    console.log('Admin pronto:', email);
    process.exit(0);
  }catch(e){
    console.error('Falha ao criar admin:', e.message);
    process.exit(1);
  }
})();
