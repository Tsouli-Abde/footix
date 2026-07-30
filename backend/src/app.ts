import cors from 'cors';
import express from 'express';
import { errorHandler } from './http.js';
import { activityRouter } from './routes/activity.js';
import { answersRouter } from './routes/answers.js';
import { eventsRouter } from './routes/events.js';
import { manageRouter } from './routes/manage.js';
import { pushRouter } from './routes/push.js';

export function createApp() {
  const app = express();

  // En dev, l'origine n'est pas configurée : on laisse passer le Vite local.
  const origins = process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim());
  app.use(cors({ origin: origins?.length ? origins : true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api', eventsRouter, answersRouter, manageRouter, pushRouter, activityRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Route inconnue' }));
  app.use(errorHandler);

  return app;
}
