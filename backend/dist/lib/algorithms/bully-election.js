"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullyElection = void 0;
/**
 * Bully Election Algorithm Implementation
 * Higher ID nodes "bully" lower ID nodes to become coordinator
 */
class BullyElection {
    constructor(nodeId) {
        this.currentLeader = null;
        this.electionInProgress = false;
        this.timeout = 3000;
        this.answerReceived = false;
        this.nodeId = nodeId;
        this.nodes = new Map();
    }
    addNode(node) {
        this.nodes.set(node.id, node);
        if (node.isLeader) {
            this.currentLeader = node.id;
        }
    }
    startElection() {
        if (this.electionInProgress)
            return [];
        console.log(`[Bully] Node ${this.nodeId} starting election`);
        this.electionInProgress = true;
        this.answerReceived = false;
        const messages = [];
        const higherNodes = Array.from(this.nodes.values()).filter(node => node.isAlive && node.id > this.nodeId);
        if (higherNodes.length === 0) {
            return this.declareCoordinator();
        }
        higherNodes.forEach(node => {
            messages.push({
                type: 'election',
                senderId: this.nodeId,
                candidateId: node.id,
            });
        });
        this.electionTimeoutId = setTimeout(() => {
            if (!this.answerReceived && this.electionInProgress) {
                this.declareCoordinator();
            }
        }, this.timeout);
        return messages;
    }
    handleElectionMessage(message) {
        const responses = [];
        switch (message.type) {
            case 'election':
                if (this.nodeId > message.senderId) {
                    responses.push({
                        type: 'answer',
                        senderId: this.nodeId,
                        candidateId: message.senderId,
                    });
                    if (!this.electionInProgress) {
                        responses.push(...this.startElection());
                    }
                }
                break;
            case 'answer':
                this.answerReceived = true;
                if (this.electionTimeoutId) {
                    clearTimeout(this.electionTimeoutId);
                }
                break;
            case 'coordinator':
                this.currentLeader = message.senderId;
                this.electionInProgress = false;
                this.updateLeaderStatus(message.senderId);
                break;
        }
        return responses;
    }
    declareCoordinator() {
        console.log(`[Bully] Node ${this.nodeId} declares itself as coordinator`);
        this.currentLeader = this.nodeId;
        this.electionInProgress = false;
        this.updateLeaderStatus(this.nodeId);
        const messages = [];
        const lowerNodes = Array.from(this.nodes.values()).filter(node => node.isAlive && node.id < this.nodeId);
        lowerNodes.forEach(node => {
            messages.push({
                type: 'coordinator',
                senderId: this.nodeId,
            });
        });
        return messages;
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
exports.BullyElection = BullyElection;
