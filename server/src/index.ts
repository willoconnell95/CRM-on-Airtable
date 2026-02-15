import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { errorHandler } from './middleware/error-handler';
import authRoutes from './routes/auth';
import contactsRoutes from './routes/contacts';
import companiesRoutes from './routes/companies';
import interactionsRoutes from './routes/interactions';
import dealsRoutes from './routes/deals';
import listsRoutes from './routes/lists';
import relationshipsRoutes from './routes/relationships';
import activitiesRoutes from './routes/activities';
import searchRoutes from './routes/search';
import dashboardRoutes from './routes/dashboard';
import emailRoutes from './routes/email';
import settingsRoutes from './routes/settings';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting - 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/lists', listsRoutes);
app.use('/api/relationships', relationshipsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/settings', settingsRoutes);

// Serve static client build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
