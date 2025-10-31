"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicationManager = void 0;
const queries_1 = require("../db/queries");
/**
 * Data Replication Manager
 * Implements various consistency models and replication strategies
 */
class ReplicationManager {
    constructor(nodeId, replicas, strategy, consistencyModel) {
        this.nodeId = nodeId;
        this.replicas = replicas;
        this.strategy = strategy;
        this.consistencyModel = consistencyModel;
        this.vectorClock = new Map();
        // Initialize vector clock
        replicas.forEach(node => this.vectorClock.set(node.id, 0));
    }
    /**
     * Replicate data to other nodes
     */
    async replicateData(data, operation) {
        // Increment vector clock for this node
        const currentClock = this.vectorClock.get(this.nodeId) || 0;
        this.vectorClock.set(this.nodeId, currentClock + 1);
        const replica = {
            id: data.id || this.generateId(),
            data: data,
            version: currentClock + 1,
            timestamp: Date.now(),
            vectorClock: Object.fromEntries(this.vectorClock),
        };
        // Choose replication strategy
        switch (this.strategy.type) {
            case 'master-slave':
                return await this.masterSlaveReplication(replica);
            case 'multi-master':
                return await this.multiMasterReplication(replica);
            case 'peer-to-peer':
                return await this.peerToPeerReplication(replica);
            default:
                throw new Error(`Unknown replication strategy: ${this.strategy.type}`);
        }
    }
    /**
     * Master-Slave Replication
     * Master handles all writes, slaves replicate from master
     */
    async masterSlaveReplication(replica) {
        const master = this.replicas.find(node => node.isLeader);
        // If no master is known (e.g., during bootstrap), assume self as master
        if (!master) {
            const slaves = this.replicas.filter(node => node.isAlive);
            if (this.strategy.syncMode === 'sync') {
                const results = await Promise.all(slaves.map(slave => this.sendReplicaToNode(slave, replica)));
                return results.every(r => r);
            }
            else {
                slaves.forEach(slave => this.sendReplicaToNode(slave, replica));
                return true;
            }
        }
        // If this is the master, replicate to slaves
        if (master.id === this.nodeId) {
            const slaves = this.replicas.filter(node => !node.isLeader && node.isAlive);
            if (this.strategy.syncMode === 'sync') {
                // Synchronous replication - wait for all slaves
                const results = await Promise.all(slaves.map(slave => this.sendReplicaToNode(slave, replica)));
                return results.every(r => r);
            }
            else {
                // Asynchronous replication - don't wait
                slaves.forEach(slave => this.sendReplicaToNode(slave, replica));
                return true;
            }
        }
        else {
            // If this is a slave, forward to master
            return await this.sendReplicaToNode(master, replica);
        }
    }
    /**
     * Multi-Master Replication
     * Multiple nodes can accept writes
     */
    async multiMasterReplication(replica) {
        const otherMasters = this.replicas.filter(node => node.isLeader && node.id !== this.nodeId && node.isAlive);
        // Apply quorum-based consistency
        const requiredAcks = this.consistencyModel.quorumWrite;
        let acks = 1; // Count self
        const replicationPromises = otherMasters.map(async (master) => {
            const success = await this.sendReplicaToNode(master, replica);
            if (success)
                acks++;
            return success;
        });
        await Promise.all(replicationPromises);
        return acks >= requiredAcks;
    }
    /**
     * Peer-to-Peer Replication
     * All nodes are equal, gossip protocol
     */
    async peerToPeerReplication(replica) {
        const peers = this.replicas.filter(node => node.id !== this.nodeId && node.isAlive);
        // Select random subset of peers (gossip)
        const gossipFactor = Math.ceil(peers.length * 0.5);
        const selectedPeers = this.selectRandomPeers(peers, gossipFactor);
        const replicationPromises = selectedPeers.map(peer => this.sendReplicaToNode(peer, replica));
        const results = await Promise.all(replicationPromises);
        const successCount = results.filter(r => r).length;
        // Consider successful if replicated to at least half
        return successCount >= Math.ceil(selectedPeers.length / 2);
    }
    /**
     * Send replica to specific node
     */
    async sendReplicaToNode(node, replica) {
        try {
            // In production, this would be an HTTP request to the node
            // For now, store in database
            await (0, queries_1.createReplica)(replica, node.id);
            console.log(`Replicated data to node ${node.id}`);
            return true;
        }
        catch (error) {
            console.error(`Failed to replicate to node ${node.id}:`, error);
            return false;
        }
    }
    /**
     * Read with consistency model
     */
    async readWithConsistency(recordId) {
        switch (this.consistencyModel.type) {
            case 'strong':
                return await this.strongConsistencyRead(recordId);
            case 'eventual':
                return await this.eventualConsistencyRead(recordId);
            case 'causal':
                return await this.causalConsistencyRead(recordId);
            default:
                throw new Error(`Unknown consistency model: ${this.consistencyModel.type}`);
        }
    }
    /**
     * Strong Consistency Read
     * Read from quorum of nodes
     */
    async strongConsistencyRead(recordId) {
        const requiredReads = this.consistencyModel.quorumRead;
        const aliveNodes = this.replicas.filter(node => node.isAlive);
        const readPromises = aliveNodes.slice(0, requiredReads).map(async (node) => {
            const replicas = await (0, queries_1.getReplicasByRecord)('bookings', recordId);
            return replicas.length > 0 ? replicas[0] : null;
        });
        const results = await Promise.all(readPromises);
        const validResults = results.filter((r) => r !== null);
        if (validResults.length < requiredReads) {
            throw new Error('Could not achieve read quorum');
        }
        // Return most recent version
        return validResults.reduce((latest, current) => current.version > latest.version ? current : latest);
    }
    /**
     * Eventual Consistency Read
     * Read from any available node
     */
    async eventualConsistencyRead(recordId) {
        const replicas = await (0, queries_1.getReplicasByRecord)('bookings', recordId);
        if (replicas.length === 0) {
            throw new Error('No replicas found');
        }
        // Return most recent version available
        return replicas.reduce((latest, current) => current.version > latest.version ? current : latest);
    }
    /**
     * Causal Consistency Read
     * Respect causality using vector clocks
     */
    async causalConsistencyRead(recordId) {
        const replicas = await (0, queries_1.getReplicasByRecord)('bookings', recordId);
        if (replicas.length === 0) {
            throw new Error('No replicas found');
        }
        // Filter replicas that respect causality
        const causalReplicas = replicas.filter(replica => this.respectsCausality(replica.vectorClock));
        if (causalReplicas.length === 0) {
            // Fall back to eventual consistency
            return this.eventualConsistencyRead(recordId);
        }
        // Return most recent causal version
        return causalReplicas.reduce((latest, current) => current.version > latest.version ? current : latest);
    }
    /**
     * Check if vector clock respects causality
     */
    respectsCausality(replicaClock) {
        for (const [nodeId, timestamp] of this.vectorClock.entries()) {
            const replicaTimestamp = replicaClock[nodeId] || 0;
            if (replicaTimestamp < timestamp) {
                return false;
            }
        }
        return true;
    }
    /**
     * Conflict resolution for concurrent updates
     */
    resolveConflict(replicas) {
        // Last-write-wins strategy based on timestamp
        return replicas.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest);
    }
    /**
     * Select random peers for gossip protocol
     */
    selectRandomPeers(peers, count) {
        const shuffled = [...peers].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `${this.nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Update vector clock from received message
     */
    updateVectorClock(receivedClock) {
        Object.entries(receivedClock).forEach(([nodeId, value]) => {
            const current = this.vectorClock.get(nodeId) || 0;
            this.vectorClock.set(nodeId, Math.max(current, value));
        });
        // Increment own clock
        const ownClock = this.vectorClock.get(this.nodeId) || 0;
        this.vectorClock.set(this.nodeId, ownClock + 1);
    }
}
exports.ReplicationManager = ReplicationManager;
