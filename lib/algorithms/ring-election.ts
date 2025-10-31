import { ServerNode, ElectionMessage } from '@/types';

/**
 * Ring Election Algorithm Implementation
 * Nodes are arranged in a logical ring, token passes around
 */
export class RingElection {
  private nodeId: string;
  private nodes: Map<string, ServerNode>;
  private currentLeader: string | null = null;
  private electionInProgress: boolean = false;
  private participants: string[] = [];

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

  /**
   * Get next node in ring (sorted by ID)
   */
  private getNextNode(): string | null {
    const sortedNodes = Array.from(this.nodes.values())
      .filter(node => node.isAlive)
      .sort((a, b) => a.id.localeCompare(b.id));

    const currentIndex = sortedNodes.findIndex(node => node.id === this.nodeId);
    if (currentIndex === -1) return null;

    const nextIndex = (currentIndex + 1) % sortedNodes.length;
    return sortedNodes[nextIndex].id;
  }

  /**
   * Start election by sending token with participant list
   */
  startElection(): ElectionMessage | null {
    if (this.electionInProgress) return null;

    console.log(`[Ring] Node ${this.nodeId} starting election`);
    this.electionInProgress = true;
    this.participants = [this.nodeId];

    const nextNode = this.getNextNode();
    if (!nextNode) return null;

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
  handleElectionMessage(message: ElectionMessage): ElectionMessage | null {
    if (message.type === 'election') {
      // Check if token came back to initiator
      if (message.participants && message.participants[0] === this.nodeId) {
        // Election complete, find highest ID
        return this.completeElection(message.participants);
      }

      // Add self to participants and forward
      const updatedParticipants = [...(message.participants || []), this.nodeId];
      const nextNode = this.getNextNode();
      
      if (!nextNode) return null;

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
  private completeElection(participants: string[]): ElectionMessage | null {
    // Find node with highest ID
    const newLeader = participants.reduce((max, id) => id > max ? id : max);
    
    console.log(`[Ring] Election complete. New leader: ${newLeader}`);
    this.currentLeader = newLeader;
    this.electionInProgress = false;
    this.updateLeaderStatus(newLeader);

    // Send coordinator message
    const nextNode = this.getNextNode();
    if (!nextNode) return null;

    return {
      type: 'coordinator',
      senderId: newLeader,
      tokenHolder: nextNode,
    };
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