import { Router } from 'express';
import { getAllServerNodes } from '@/lib/db/queries';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const nodes = await getAllServerNodes();
    const clockStates = nodes.map((node) => ({
      nodeId: node.id,
      lamportClock: node.lamportClock,
      vectorClock: Object.fromEntries(node.vectorClock || new Map()),
      physicalTime: node.lastHeartbeat,
    }));
    res.json({ nodes: clockStates, timestamp: Date.now() });
  } catch (e) {
    console.error('GET /sync error:', e);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

export default router;
