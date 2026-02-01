import express from 'express';
import cors from 'cors';
import path from 'path';
import configRoutes from './routes/config';
import knowledgeRoutes from './routes/knowledge-base';
import dialogRoutes from './routes/dialogs';
import statusRoutes from './routes/status';

const app = express();
const PORT = parseInt(process.env.ADMIN_PORT || '4000', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/config', configRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/dialogs', dialogRoutes);
app.use('/api/status', statusRoutes);

// Serve built frontend in production
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Admin panel server running on http://localhost:${PORT}`);
});
