import { ServerNode, ElectionMessage } from '@/types';

/**
 * Bully Election Algorithm Implementation
 * Higher ID nodes "bully" lower ID nodes to become coordinator
 */
export class BullyElection {
  private nodeId: string;
  private nodes: Map<string, ServerNode>;
  private currentLeader: string | null = null;
  private electionInProgress: boolean = false;
  private timeout: number = 3000;
  private answerReceived: boolean = false;
  private electionTimeoutId?: NodeJS.Timeout;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.nodes = new Map();
  }

  addNode(node: ServerNode): void {
    this.nodes.set(node.id, node);
    if (node.isLeader) {
      this.currentLeader = node.id;
    }
  }

  startElection(): ElectionMessage[] {
    if (this.electionInProgress) return [];
    
    console.log(`[Bully] Node ${this.nodeId} starting election`);
    this.electionInProgress = true;
    this.answerReceived = false;

    const messages: ElectionMessage[] = [];
    const higherNodes = Array.from(this.nodes.values()).filter(
      node => node.isAlive && node.id > this.nodeId
    );

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

  handleElectionMessage(message: ElectionMessage): ElectionMessage[] {
    const responses: ElectionMessage[] = [];

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

  private declareCoordinator(): ElectionMessage[] {
    console.log(`[Bully] Node ${this.nodeId} declares itself as coordinator`);
    this.currentLeader = this.nodeId;
    this.electionInProgress = false;
    this.updateLeaderStatus(this.nodeId);

    const messages: ElectionMessage[] = [];
    const lowerNodes = Array.from(this.nodes.values()).filter(
      node => node.isAlive && node.id < this.nodeId
    );

    lowerNodes.forEach(node => {
      messages.push({
        type: 'coordinator',
        senderId: this.nodeId,
      });
    });

    return messages;
  }

  private updateLeaderStatus(leaderId: string): void {
    this.nodes.forEach(node => {
      node.isLeader = node.id === leaderId;
    });
  }

  getLeader(): string | null {
    return this.currentLeader;
  }

  isLeader(): boolean {
    return this.currentLeader === this.nodeId;
  }

  updateNodeStatus(nodeId: string, isAlive: boolean): void {
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