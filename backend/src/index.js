const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cupcakeRoutes = require('./routes/cupcakeRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

/**
 * CORS liberando localhost (5500/5173) e domínios *.onrender.com
 * Se hospedar o frontend (Netlify/Vercel), adicione o domínio abaixo em ALLOWED_ORIGINS.
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // permite curl/postman e requisições sem Origin
    try {
      const okListed = ALLOWED_ORIGINS.includes(origin);
      const hostname = new URL(origin).hostname;
      const okRender = /\.onrender\.com$/.test(hostname);
      if (okListed || okRender) return cb(null, true);
    } catch {}
    return cb(new Error('Not allowed by CORS: ' + origin), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
app.options('*', cors());

app.use(express.json());

// arquivos estáticos (imagens)
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cupcakes', cupcakeRoutes);
app.use('/api/orders', orderRoutes);

// healthcheck simples
app.get('/', (_req, res) => {
  res.send('API Cupcakes para Todos está rodando!');
});

// porta
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
