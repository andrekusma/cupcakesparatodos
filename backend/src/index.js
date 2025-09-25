const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const cupcakeRoutes = require('./routes/cupcakeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes'); // se você já tem

const app = express();

app.use(cors());
app.use(express.json());

// Arquivos estáticos (imagens)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Montagem das rotas
app.use('/api', authRoutes);
app.use('/api', cupcakeRoutes);
app.use('/api', adminRoutes);
if (orderRoutes) app.use('/api', orderRoutes);

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API on port', PORT));
