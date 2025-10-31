"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_1 = require("@/lib/db/config");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const result = await (0, config_1.query)('SELECT table_name, COUNT(*) as replica_count, COUNT(DISTINCT node_id) as node_count FROM data_replicas GROUP BY table_name');
        res.json({ summary: result.rows });
    }
    catch (e) {
        console.error('GET /replicas error:', e);
        res.status(500).json({ error: 'Failed to fetch replicas' });
    }
});
exports.default = router;
