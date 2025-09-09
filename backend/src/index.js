import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { authRouter } from './routes/authRoutes.js';
import { cupcakeRouter } from './routes/cupcakeRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';

const app = express();

const allowed = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map(s=>s.trim());

app.use(cors({
  origin: (origin, cb)=>{
    if(allowed.includes('*') || !origin || allowed.includes(origin)) cb(null, true);
    else cb(new Error('Origin not allowed'));
  }
}));
app.use(express.json({ limit:'5mb' }));

app.get('/api/health', (req,res)=>res.json({ ok:true, ts: Date.now() }));

app.use('/api/auth', authRouter);
app.use('/api/cupcakes', cupcakeRouter);
app.use('/api/admin', adminRouter);

// erro handler
app.use((err, req, res, next)=>{
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Erro interno' });
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>{
  console.log('Cupcake API ouvindo na porta ' + port);
});
