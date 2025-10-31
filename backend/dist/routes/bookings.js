"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const queries_1 = require("@/lib/db/queries");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const id = req.query.id;
        const userId = req.query.userId;
        if (id) {
            const booking = await (0, queries_1.getBookingById)(id);
            if (!booking)
                return res.status(404).json({ error: 'Booking not found' });
            return res.json({ booking });
        }
        if (!userId)
            return res.status(400).json({ error: 'userId parameter is required' });
        const bookings = await (0, queries_1.getBookingsByUser)(userId);
        res.json({ bookings });
    }
    catch (e) {
        console.error('GET /bookings error:', e);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
router.post('/', async (req, res) => {
    try {
        const appAny = req.app;
        const nodeManager = appAny.get('nodeManager');
        const body = req.body || {};
        const clockState = nodeManager.getClockSync().getClockState();
        const booking = {
            id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: body.userId,
            movieId: body.movieId,
            showtimeId: body.showtimeId,
            seats: body.seats,
            totalPrice: body.totalPrice,
            status: 'pending',
            timestamp: Date.now(),
            logicalClock: clockState.lamport,
            processedBy: nodeManager.getNodeInfo().id,
        };
        // Route (updates clocks/load)
        const processed = await nodeManager.routeRequest({ type: 'booking', data: booking, requiresReplication: true });
        // Persist
        const created = await (0, queries_1.createBooking)(booking);
        // Write local replica for visibility
        await (0, queries_1.createReplica)({ id: created.id, data: created, version: 1, timestamp: Date.now(), vectorClock: {} }, nodeManager.getNodeInfo().id);
        // Refresh peers and replicate
        const allNodes = await (0, queries_1.getAllServerNodes)();
        const peers = allNodes.filter((n) => n.id !== nodeManager.getNodeInfo().id);
        nodeManager.getReplicationManager().updateReplicas(peers);
        await nodeManager.getReplicationManager().replicateData(created, 'create');
        res.status(201).json({ booking: created, distributedInfo: { processedBy: processed.processedBy, logicalClock: processed.logicalClock, timestamp: processed.timestamp } });
    }
    catch (e) {
        console.error('POST /bookings error:', e);
        res.status(500).json({ error: e.message || 'Failed to create booking' });
    }
});
exports.default = router;
