// backend/src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const cupcakeRoutes = require('./routes/cupcakeRoutes');
const adminRoutes = require('./routes/adminRoutes');
let orderRoutes = null;
try { orderRoutes = require('./routes/orderRoutes'); } catch {}

const app = express();

app.use(cors());
app.use(express.json());

// >>> usar o mesmo diretório que o multer usa (UPLOAD_DIR)
const STATIC_UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(STATIC_UPLOAD_DIR));

// rotas
app.use('/api', authRoutes);
app.use('/api', cupcakeRoutes);
app.use('/api', adminRoutes);
if (orderRoutes) app.use('/api', orderRoutes);

// health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API on port', PORT, 'uploads from', STATIC_UPLOAD_DIR));
