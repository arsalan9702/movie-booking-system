import { ServerNode, LoadBalancerState } from '@/types';

/**
 * Load Balancer Implementation
 * Supports multiple load balancing algorithms
 */
export class LoadBalancer {
  private state: LoadBalancerState;
  private connections: Map<string, number>; // Track connections per node

  constructor(algorithm: 'round-robin' | 'least-connections' | 'weighted') {
    this.state = {
      algorithm,
      nodes: [],
      currentIndex: 0,
    };
    this.connections = new Map();
  }

  /**
   * Add node to load balancer
   */
  addNode(node: ServerNode): void {
    this.state.nodes.push(node);
    this.connections.set(node.id, 0);
  }

  /**
   * Remove node from load balancer
   */
  removeNode(nodeId: string): void {
    this.state.nodes = this.state.nodes.filter(node => node.id !== nodeId);
    this.connections.delete(nodeId);
  }

  /**
   * Update node status
   */
  updateNode(nodeId: string, updates: Partial<ServerNode>): void {
    const node = this.state.nodes.find(n => n.id === nodeId);
    if (node) {
      Object.assign(node, updates);
    }
  }

  /**
   * Get next server node based on algorithm
   */
  getNextNode(): ServerNode | null {
    const aliveNodes = this.state.nodes.filter(node => node.isAlive);
    
    if (aliveNodes.length === 0) {
      console.error('No alive nodes available');
      return null;
    }

    switch (this.state.algorithm) {
      case 'round-robin':
        return this.roundRobin(aliveNodes);
      case 'least-connections':
        return this.leastConnections(aliveNodes);
      case 'weighted':
        return this.weightedRoundRobin(aliveNodes);
      default:
        return this.roundRobin(aliveNodes);
    }
  }

  /**
   * Round Robin Algorithm
   * Distributes requests evenly across all nodes
   */
  private roundRobin(nodes: ServerNode[]): ServerNode {
    const node = nodes[this.state.currentIndex % nodes.length];
    this.state.currentIndex = (this.state.currentIndex + 1) % nodes.length;
    return node;
  }

  /**
   * Least Connections Algorithm
   * Routes to node with fewest active connections
   */
  private leastConnections(nodes: ServerNode[]): ServerNode {
    let minConnections = Infinity;
    let selectedNode = nodes[0];

    for (const node of nodes) {
      const connections = this.connections.get(node.id) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedNode = node;
      }
    }

    return selectedNode;
  }

  /**
   * Weighted Round Robin Algorithm
   * Considers node load factor
   */
  private weightedRoundRobin(nodes: ServerNode[]): ServerNode {
    // Calculate weights based on inverse of load
    const weights = nodes.map(node => ({
      node,
      weight: node.load > 0 ? 1 / node.load : 100,
    }));

    // Normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    const normalizedWeights = weights.map(w => ({
      ...w,
      normalizedWeight: w.weight / totalWeight,
    }));

    // Select based on weighted probability
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const { node, normalizedWeight } of normalizedWeights) {
      cumulativeWeight += normalizedWeight;
      if (random <= cumulativeWeight) {
        return node;
      }
    }

    return nodes[0]; // Fallback
  }

  /**
   * Increment connection count for a node
   */
  incrementConnections(nodeId: string): void {
    const current = this.connections.get(nodeId) || 0;
    this.connections.set(nodeId, current + 1);
  }

  /**
   * Decrement connection count for a node
   */
  decrementConnections(nodeId: string): void {
    const current = this.connections.get(nodeId) || 0;
    this.connections.set(nodeId, Math.max(0, current - 1));
  }

  /**
   * Get connection count for a node
   */
  getConnections(nodeId: string): number {
    return this.connections.get(nodeId) || 0;
  }

  /**
   * Get all alive nodes
   */
  getAliveNodes(): ServerNode[] {
    return this.state.nodes.filter(node => node.isAlive);
  }

  /**
   * Get load balancer statistics
   */
  getStats(): {
    algorithm: string;
    totalNodes: number;
    aliveNodes: number;
    connections: Record<string, number>;
    averageLoad: number;
  } {
    const aliveNodes = this.getAliveNodes();
    const averageLoad = aliveNodes.length > 0
      ? aliveNodes.reduce((sum, node) => sum + node.load, 0) / aliveNodes.length
      : 0;

    return {
      algorithm: this.state.algorithm,
      totalNodes: this.state.nodes.length,
      aliveNodes: aliveNodes.length,
      connections: Object.fromEntries(this.connections),
      averageLoad,
    };
  }

  /**
   * Health check - mark unhealthy nodes as dead
   */
  async performHealthCheck(): Promise<void> {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    for (const node of this.state.nodes) {
      const timeSinceHeartbeat = now - node.lastHeartbeat;
      
      if (timeSinceHeartbeat > timeout) {
        console.warn(`Node ${node.id} failed health check`);
        node.isAlive = false;
      }
    }
  }

  /**
   * Update node heartbeat
   */
  updateHeartbeat(nodeId: string): void {
    const node = this.state.nodes.find(n => n.id === nodeId);
    if (node) {
      node.lastHeartbeat = Date.now();
      node.isAlive = true;
    }
  }

  /**
   * Calculate and update node load
   */
  updateNodeLoad(nodeId: string): void {
    const connections = this.connections.get(nodeId) || 0;
    const node = this.state.nodes.find(n => n.id === nodeId);
    
    if (node) {
      // Simple load calculation: connections / max_capacity
      const maxCapacity = 100;
      node.load = (connections / maxCapacity) * 100;
    }
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): ServerNode | undefined {
    return this.state.nodes.find(n => n.id === nodeId);
  }

  /**
   * Set algorithm
   */
  setAlgorithm(algorithm: 'round-robin' | 'least-connections' | 'weighted'): void {
    this.state.algorithm = algorithm;
    this.state.currentIndex = 0;
  }
}