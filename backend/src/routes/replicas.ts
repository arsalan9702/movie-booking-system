import { Router } from 'express';
import { query } from '@/lib/db/config';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const result = await query(
      'SELECT table_name, COUNT(*) as replica_count, COUNT(DISTINCT node_id) as node_count FROM data_replicas GROUP BY table_name'
    );
    res.json({ summary: result.rows });
  } catch (e) {
    console.error('GET /replicas error:', e);
    res.status(500).json({ error: 'Failed to fetch replicas' });
  }
});

export default router;
