const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const cupcakeRoutes = require('./routes/cupcakeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// arquivos estáticos de upload (imagens)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// MONTA TODAS AS ROTAS EM /api
app.use('/api', authRoutes);
app.use('/api', cupcakeRoutes);
app.use('/api', adminRoutes);
app.use('/api', orderRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('API on port', PORT);
});
