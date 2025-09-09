import fetch from 'node-fetch';
import 'dotenv/config';

const API = `http://localhost:${process.env.PORT || 3000}`;

async function testLogin() {
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cupcakes.com',
        password: 'admin123'
      })
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Resposta:', data);
  } catch (err) {
    console.error('Falha ao conectar ao backend:', err);
  }
}

testLogin();