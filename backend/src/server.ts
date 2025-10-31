import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Load env from backend/.env then project root .env.local and .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// Prefer MySQL by default if MYSQL_* present
if (!process.env.USE_MYSQL) {
  if (process.env.MYSQL_HOST || process.env.MYSQL_DB || process.env.MYSQL_PORT) {
    process.env.USE_MYSQL = 'true';
  }
}
if (!process.env.USE_IN_MEMORY) {
  process.env.USE_IN_MEMORY = 'false';
}

import { initializeDatabase } from '@/lib/db/config';
import { NodeManager } from '@/lib/distributed/node-manager';
import moviesRouter from './routes/movies';
import bookingsRouter from './routes/bookings';
import healthRouter from './routes/health';
import electionRouter from './routes/election';
import replicasRouter from './routes/replicas';
import syncRouter from './routes/sync';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || process.env.NODE_PORT || '4000', 10);
const NODE_ID = process.env.NODE_ID || `node-${PORT}`;
const NODE_HOST = process.env.NODE_HOST || 'localhost';
const NODE_PORT = PORT;

console.log(`[backend] DB driver: ${process.env.USE_MYSQL === 'true' ? 'mysql' : (process.env.USE_IN_MEMORY === 'true' ? 'memory' : 'postgres')} (USE_MYSQL=${process.env.USE_MYSQL}, USE_IN_MEMORY=${process.env.USE_IN_MEMORY})`);

initializeDatabase().catch(console.error);

const nodeManager = new NodeManager(NODE_ID, NODE_HOST, NODE_PORT);
nodeManager.initialize().catch(console.error);

app.set('nodeManager', nodeManager);

app.use('/movies', moviesRouter);
app.use('/bookings', bookingsRouter);
app.use('/health', healthRouter);
app.use('/election', electionRouter);
app.use('/replicas', replicasRouter);
app.use('/sync', syncRouter);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', nodeId: NODE_ID, port: PORT, useMySQL: process.env.USE_MYSQL });
});

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT} as ${NODE_ID}`);
});
