import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authRouter } from './routes/auth';
import { goalsRouter } from './routes/goals';
import { reviewsRouter } from './routes/reviews';
import { coachRouter } from './routes/coach';
import { userRouter } from './routes/user';
import { reportsRouter } from './routes/reports';
import { errorHandler } from './middleware/error-handler';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/reviews', coachRouter);
app.use('/api/user', userRouter);
app.use('/api/reports', reportsRouter);

// Health check for Render / load balancer
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

app.use(errorHandler);

const port = process.env.PORT ? parseInt(process.env.PORT) : config.port;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
