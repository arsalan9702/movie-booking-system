"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const queries_1 = require("@/lib/db/queries");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const nodes = await (0, queries_1.getAllServerNodes)();
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
    }
    catch (e) {
        console.error('GET /health error:', e);
        res.status(500).json({ error: 'Failed to fetch health' });
    }
});
exports.default = router;
