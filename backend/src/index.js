import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { cupcakeRouter } from './routes/cupcakeRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({ origin: (origin, cb) => {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
  return cb(new Error('CORS not allowed'));
}}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use('/api/cupcakes', cupcakeRouter);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Cupcake API ouvindo em http://localhost:${port}`));