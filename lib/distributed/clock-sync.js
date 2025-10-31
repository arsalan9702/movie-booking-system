"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClockSyncManager = void 0;
class LamportClock {
    constructor(initial = 0) {
        this.value = initial;
    }
    getValue() {
        return this.value;
    }
    tick() {
        this.value += 1;
    }
    merge(received) {
        this.value = Math.max(this.value, received) + 1;
    }
}
class VectorClock {
    constructor(nodeIds, selfId) {
        this.clock = new Map();
        nodeIds.forEach((id) => this.clock.set(id, 0));
        if (!this.clock.has(selfId))
            this.clock.set(selfId, 0);
    }
    getClock() {
        return new Map(this.clock);
    }
    increment(nodeId) {
        this.clock.set(nodeId, (this.clock.get(nodeId) || 0) + 1);
    }
    merge(remote) {
        Object.entries(remote).forEach(([id, val]) => {
            const cur = this.clock.get(id) || 0;
            this.clock.set(id, Math.max(cur, val));
        });
    }
}
class ClockSyncManager {
    constructor(nodeId, nodeIds, leaderId) {
        this.nodeId = nodeId;
        this.nodeIds = nodeIds;
        this.leaderId = leaderId;
        this.lamport = new LamportClock(0);
        this.vector = new VectorClock(nodeIds, nodeId);
    }
    startSync() {
        // Simulate periodic clock ticks
        this.syncInterval = setInterval(() => {
            this.lamport.tick();
            this.vector.increment(this.nodeId);
        }, 3000);
    }
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
    getLamportClock() {
        return this.lamport;
    }
    getVectorClock() {
        return this.vector;
    }
    getClockState() {
        return {
            nodeId: this.nodeId,
            lamport: this.lamport.getValue(),
            vector: Object.fromEntries(this.vector.getClock()),
            leaderId: this.leaderId,
        };
    }
    processMessage(message) {
        // Merge Lamport and vector clocks
        this.lamport.merge(message.lamportClock);
        this.vector.merge(message.vectorClock);
        // Local event after merge
        this.lamport.tick();
        this.vector.increment(this.nodeId);
        return {
            lamport: this.lamport.getValue(),
            vector: Object.fromEntries(this.vector.getClock()),
        };
    }
}
exports.ClockSyncManager = ClockSyncManager;
