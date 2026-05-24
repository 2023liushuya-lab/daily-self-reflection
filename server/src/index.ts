import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authRouter } from './routes/auth';
import { goalsRouter } from './routes/goals';
import { reviewsRouter } from './routes/reviews';
import { coachRouter } from './routes/coach';
import { userRouter } from './routes/user';
import { errorHandler } from './middleware/error-handler';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/reviews', coachRouter);
app.use('/api/user', userRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
