"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const queries_1 = require("@/lib/db/queries");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const nodes = await (0, queries_1.getAllServerNodes)();
        const clockStates = nodes.map((node) => ({
            nodeId: node.id,
            lamportClock: node.lamportClock,
            vectorClock: Object.fromEntries(node.vectorClock || new Map()),
            physicalTime: node.lastHeartbeat,
        }));
        res.json({ nodes: clockStates, timestamp: Date.now() });
    }
    catch (e) {
        console.error('GET /sync error:', e);
        res.status(500).json({ error: 'Failed to get sync status' });
    }
});
exports.default = router;
