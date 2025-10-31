"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const appAny = req.app;
        const nodeManager = appAny.get('nodeManager');
        const status = await nodeManager.getClusterStatus();
        const nodesInfo = status.loadBalancerStats?.nodes || [];
        res.json({ leader: status.leader ? { id: status.leader } : null, nodes: nodesInfo });
    }
    catch (e) {
        console.error('GET /election error:', e);
        res.status(500).json({ error: 'Failed to fetch election status' });
    }
});
router.post('/', async (req, res) => {
    try {
        const appAny = req.app;
        const nodeManager = appAny.get('nodeManager');
        const { algorithm } = req.body || {};
        if (algorithm === 'bully')
            nodeManager.startBullyElection();
        else if (algorithm === 'ring')
            nodeManager.startRingElection();
        else
            return res.status(400).json({ error: 'algorithm must be bully or ring' });
        const status = await nodeManager.getClusterStatus();
        res.json({ ok: true, status });
    }
    catch (e) {
        console.error('POST /election error:', e);
        res.status(500).json({ error: 'Failed to trigger election' });
    }
});
exports.default = router;
