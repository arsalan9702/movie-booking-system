"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RingElection = void 0;
/**
 * Ring Election Algorithm Implementation
 * Nodes are arranged in a logical ring, token passes around
 */
class RingElection {
    constructor(nodeId) {
        this.currentLeader = null;
        this.electionInProgress = false;
        this.participants = [];
        this.nodeId = nodeId;
        this.nodes = new Map();
    }
    addNode(node) {
        this.nodes.set(node.id, node);
        if (node.isLeader) {
            this.currentLeader = node.id;
        }
    }
    /**
     * Get next node in ring (sorted by ID)
     */
    getNextNode() {
        const sortedNodes = Array.from(this.nodes.values())
            .filter(node => node.isAlive)
            .sort((a, b) => a.id.localeCompare(b.id));
        const currentIndex = sortedNodes.findIndex(node => node.id === this.nodeId);
        if (currentIndex === -1)
            return null;
        const nextIndex = (currentIndex + 1) % sortedNodes.length;
        return sortedNodes[nextIndex].id;
    }
    /**
     * Start election by sending token with participant list
     */
    startElection() {
        if (this.electionInProgress)
            return null;
        console.log(`[Ring] Node ${this.nodeId} starting election`);
        this.electionInProgress = true;
        this.participants = [this.nodeId];
        const nextNode = this.getNextNode();
        if (!nextNode)
            return null;
        return {
            type: 'election',
            senderId: this.nodeId,
            tokenHolder: nextNode,
            participants: this.participants,
        };
    }
    /**
     * Handle election message (token)
     */
    handleElectionMessage(message) {
        if (message.type === 'election') {
            // Check if token came back to initiator
            if (message.participants && message.participants[0] === this.nodeId) {
                // Election complete, find highest ID
                return this.completeElection(message.participants);
            }
            // Add self to participants and forward
            const updatedParticipants = [...(message.participants || []), this.nodeId];
            const nextNode = this.getNextNode();
            if (!nextNode)
                return null;
            console.log(`[Ring] Node ${this.nodeId} forwarding election to ${nextNode}`);
            return {
                type: 'election',
                senderId: this.nodeId,
                tokenHolder: nextNode,
                participants: updatedParticipants,
            };
        }
        if (message.type === 'coordinator') {
            // Acknowledge new coordinator
            console.log(`[Ring] Node ${this.nodeId} acknowledges ${message.senderId} as coordinator`);
            this.currentLeader = message.senderId;
            this.electionInProgress = false;
            this.updateLeaderStatus(message.senderId);
            // Forward coordinator message
            const nextNode = this.getNextNode();
            if (nextNode && nextNode !== message.senderId) {
                return {
                    type: 'coordinator',
                    senderId: message.senderId,
                    tokenHolder: nextNode,
                };
            }
        }
        return null;
    }
    /**
     * Complete election and announce coordinator
     */
    completeElection(participants) {
        // Find node with highest ID
        const newLeader = participants.reduce((max, id) => id > max ? id : max);
        console.log(`[Ring] Election complete. New leader: ${newLeader}`);
        this.currentLeader = newLeader;
        this.electionInProgress = false;
        this.updateLeaderStatus(newLeader);
        // Send coordinator message
        const nextNode = this.getNextNode();
        if (!nextNode)
            return null;
        return {
            type: 'coordinator',
            senderId: newLeader,
            tokenHolder: nextNode,
        };
    }
    updateLeaderStatus(leaderId) {
        this.nodes.forEach(node => {
            node.isLeader = node.id === leaderId;
        });
    }
    getLeader() {
        return this.currentLeader;
    }
    isLeader() {
        return this.currentLeader === this.nodeId;
    }
    updateNodeStatus(nodeId, isAlive) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.isAlive = isAlive;
            if (!isAlive && node.isLeader) {
                this.currentLeader = null;
                this.startElection();
            }
        }
    }
}
exports.RingElection = RingElection;
