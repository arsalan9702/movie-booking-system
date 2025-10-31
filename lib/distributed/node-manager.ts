import { ServerNode } from '@/types';
import { BullyElection } from '../algorithms/bully-election';
import { RingElection } from '../algorithms/ring-election';
import { LoadBalancer } from './load-balancer';
import { ClockSyncManager } from '@/lib/distributed/clock-sync';
import { ReplicationManager } from './replication';
import { upsertServerNode, getAllServerNodes } from '../db/queries';

/**
 * Node Manager - Coordinates all distributed system components
 */
export class NodeManager {
  private nodeId: string;
  private node: ServerNode;
  private bullyElection: BullyElection;
  private ringElection: RingElection;
  private loadBalancer: LoadBalancer;
  private clockSync: ClockSyncManager;
  private replicationManager: ReplicationManager;
  private heartbeatInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(nodeId: string, host: string, port: number) {
    this.nodeId = nodeId;
    
    // Initialize node
    this.node = {
      id: nodeId,
      host,
      port,
      isLeader: false,
      isAlive: true,
      load: 0,
      lastHeartbeat: Date.now(),
      lamportClock: 0,
      vectorClock: new Map(),
    };

    // Initialize components
    this.bullyElection = new BullyElection(nodeId);
    this.ringElection = new RingElection(nodeId);
    this.loadBalancer = new LoadBalancer('round-robin');
    
    // Clock sync will be initialized after discovering other nodes
    this.clockSync = new ClockSyncManager(nodeId, [], nodeId);
    
    // Replication manager will be initialized after setup
    this.replicationManager = new ReplicationManager(
      nodeId,
      [],
      { type: 'master-slave', replicas: 3, syncMode: 'async' },
      { type: 'eventual', quorumRead: 2, quorumWrite: 2 }
    );
  }

  /**
   * Initialize node and join cluster
   */
  async initialize(): Promise<void> {
    try {
      console.log(`[Node ${this.nodeId}] Initializing...`);

      // Register this node in database
      await upsertServerNode(this.node);

      // Discover other nodes
      const allNodes = await getAllServerNodes();
      
      // Add nodes to election algorithms
      allNodes.forEach(node => {
        if (node.id !== this.nodeId) {
          this.bullyElection.addNode(node);
          this.ringElection.addNode(node);
          this.loadBalancer.addNode(node);
        }
      });

      // Initialize clock sync with all node IDs
      const nodeIds = allNodes.map(n => n.id);
      this.clockSync = new ClockSyncManager(
        this.nodeId,
        nodeIds,
        allNodes.find(n => n.isLeader)?.id || this.nodeId
      );

      // Initialize replication manager
      this.replicationManager = new ReplicationManager(
        this.nodeId,
        allNodes.filter(n => n.id !== this.nodeId),
        { type: 'master-slave', replicas: Math.min(3, allNodes.length), syncMode: 'async' },
        { type: 'eventual', quorumRead: 2, quorumWrite: 2 }
      );

      // Start services
      this.startHeartbeat();
      this.startHealthCheck();
      this.clockSync.startSync();

      // If no leader exists, start election
      const hasLeader = allNodes.some(n => n.isLeader && n.isAlive);
      if (!hasLeader) {
        console.log(`[Node ${this.nodeId}] No leader found, starting election`);
        this.startBullyElection();
      }

      console.log(`[Node ${this.nodeId}] Initialized successfully`);
    } catch (error) {
      console.error(`[Node ${this.nodeId}] Initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Start periodic heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      this.node.lastHeartbeat = Date.now();
      this.node.lamportClock = this.clockSync.getLamportClock().getValue();
      this.node.vectorClock = this.clockSync.getVectorClock().getClock();
      
      try {
        await upsertServerNode(this.node);
        this.loadBalancer.updateHeartbeat(this.nodeId);
      } catch (error) {
        console.error(`[Node ${this.nodeId}] Heartbeat failed:`, error);
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Start periodic health check
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.loadBalancer.performHealthCheck();
        
        // Check if leader is dead
        const leader = this.bullyElection.getLeader();
        if (leader) {
          const leaderNode = this.loadBalancer.getNode(leader);
          if (leaderNode && !leaderNode.isAlive) {
            console.log(`[Node ${this.nodeId}] Leader ${leader} is dead, starting election`);
            this.startBullyElection();
          }
        }
      } catch (error) {
        console.error(`[Node ${this.nodeId}] Health check failed:`, error);
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Start Bully election
   */
  startBullyElection(): void {
    const messages = this.bullyElection.startElection();
    console.log(`[Node ${this.nodeId}] Bully election started, sent ${messages.length} messages`);
    
    // In production, send these messages to other nodes via HTTP
    // For now, process locally
    messages.forEach(msg => {
      console.log(`[Node ${this.nodeId}] Election message:`, msg);
    });

    // Update node status if became leader
    if (this.bullyElection.isLeader()) {
      this.node.isLeader = true;
      this.updateNodeInDB();
    }
  }

  /**
   * Start Ring election
   */
  startRingElection(): void {
    const message = this.ringElection.startElection();
    if (message) {
      console.log(`[Node ${this.nodeId}] Ring election started:`, message);
      
      // In production, send message to next node
      // For now, process locally
    }

    // Update node status if became leader
    if (this.ringElection.isLeader()) {
      this.node.isLeader = true;
      this.updateNodeInDB();
    }
  }

  /**
   * Process incoming request
   */
  async processRequest(requestData: any): Promise<any> {
    // Increment Lamport clock
    this.clockSync.getLamportClock().tick();

    // Update load
    this.node.load = Math.min(100, this.node.load + 1);
    this.loadBalancer.updateNodeLoad(this.nodeId);

    try {
      // Process request
      const result = await this.handleRequest(requestData);

      // Replicate if needed
      if (requestData.requiresReplication) {
        await this.replicationManager.replicateData(result, 'create');
      }

      return result;
    } finally {
      // Decrease load
      this.node.load = Math.max(0, this.node.load - 1);
      this.loadBalancer.updateNodeLoad(this.nodeId);
    }
  }

  /**
   * Handle specific request
   */
  private async handleRequest(requestData: any): Promise<any> {
    // Simulate request processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    return {
      ...requestData,
      processedBy: this.nodeId,
      timestamp: Date.now(),
      logicalClock: this.clockSync.getLamportClock().getValue(),
    };
  }

  /**
   * Route request to appropriate node
   */
  async routeRequest(requestData: any): Promise<any> {
    if (this.node.isLeader) {
      // Leader can process directly or delegate
      const targetNode = this.loadBalancer.getNextNode();
      
      if (targetNode && targetNode.id !== this.nodeId) {
        console.log(`[Node ${this.nodeId}] Routing to ${targetNode.id}`);
        // In production, make HTTP call to target node
        // For now, process locally
        return await this.processRequest(requestData);
      }
    }

    return await this.processRequest(requestData);
  }

  /**
   * Update node in database
   */
  private async updateNodeInDB(): Promise<void> {
    try {
      await upsertServerNode(this.node);
    } catch (error) {
      console.error(`[Node ${this.nodeId}] Failed to update node in DB:`, error);
    }
  }

  /**
   * Get node information
   */
  getNodeInfo(): ServerNode {
    return { ...this.node };
  }

  /**
   * Get cluster status
   */
  async getClusterStatus(): Promise<{
    nodeId: string;
    isLeader: boolean;
    leader: string | null;
    loadBalancerStats: any;
    clockState: any;
  }> {
    return {
      nodeId: this.nodeId,
      isLeader: this.node.isLeader,
      leader: this.bullyElection.getLeader(),
      loadBalancerStats: this.loadBalancer.getStats(),
      clockState: this.clockSync.getClockState(),
    };
  }

  /**
   * Shutdown node gracefully
   */
  async shutdown(): Promise<void> {
    console.log(`[Node ${this.nodeId}] Shutting down...`);

    // Stop services
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.clockSync.stopSync();

    // Mark node as dead
    this.node.isAlive = false;
    await upsertServerNode(this.node);

    // Trigger election if this was the leader
    if (this.node.isLeader) {
      console.log(`[Node ${this.nodeId}] Was leader, triggering election`);
    }

    console.log(`[Node ${this.nodeId}] Shutdown complete`);
  }

  // Getters for components
  getBullyElection(): BullyElection {
    return this.bullyElection;
  }

  getRingElection(): RingElection {
    return this.ringElection;
  }

  getLoadBalancer(): LoadBalancer {
    return this.loadBalancer;
  }

  getClockSync(): ClockSyncManager {
    return this.clockSync;
  }

  getReplicationManager(): ReplicationManager {
    return this.replicationManager;
  }
}