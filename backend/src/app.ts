import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes';
import transactionRoutes from './routes/transactionRoutes';
import cardRoutes from './routes/cardRoutes';
import budgetRoutes from './routes/budgetRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import newsRoutes from './routes/newsRoutes';
import dataRoutes from './routes/dataRoutes';
import goalRoutes from './routes/goalRoutes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/cards', cardRoutes);
app.use('/budgets', budgetRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/data', dataRoutes);
app.use('/goals', goalRoutes);

export default app;
