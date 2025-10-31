import { Router } from 'express';
import { getAllServerNodes } from '@/lib/db/queries';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const nodes = await getAllServerNodes();
    const summary = {
      total: nodes.length,
      healthy: nodes.filter(n => n.isAlive).length,
      unhealthy: nodes.filter(n => !n.isAlive).length,
    };
    const detailed = nodes.map(n => ({
      nodeId: n.id,
      status: n.isAlive ? 'healthy' : 'unhealthy',
      isLeader: n.isLeader,
      load: n.load,
      lastHeartbeat: n.lastHeartbeat,
      timeSinceHeartbeat: Date.now() - n.lastHeartbeat,
    }));
    res.json({ summary, nodes: detailed });
  } catch (e) {
    console.error('GET /health error:', e);
    res.status(500).json({ error: 'Failed to fetch health' });
  }
});

export default router;
