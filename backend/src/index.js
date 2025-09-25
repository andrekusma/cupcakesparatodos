require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const { UPLOAD_DIR } = require('./middleware/upload');

const authRoutes = require('./routes/authRoutes');
const cupcakeRoutes = require('./routes/cupcakeRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/healthz', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api', authRoutes);
app.use('/api', cupcakeRoutes);
app.use('/api', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API on ${PORT}`);
});
