// Core Types
export interface Movie {
  id: string;
  title: string;
  description: string;
  duration: number;
  genre: string[];
  rating: number;
  posterUrl: string;
  showtimes: Showtime[];
}

export interface Showtime {
  id: string;
  movieId: string;
  startTime: string;
  endTime: string;
  screen: string;
  price: number;
  availableSeats: number;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  status: 'available' | 'selected' | 'booked';
  price: number;
}

export interface Booking {
  id: string;
  userId: string;
  movieId: string;
  showtimeId: string;
  seats: string[];
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  timestamp: number;
  logicalClock: number;
  processedBy: string;
}

// Distributed System Types
export interface ServerNode {
  id: string;
  host: string;
  port: number;
  isLeader: boolean;
  isAlive: boolean;
  load: number;
  lastHeartbeat: number;
  lamportClock: number;
  vectorClock: Map<string, number>;
}

export interface ClockSyncMessage {
  type: 'sync' | 'request' | 'response';
  senderId: string;
  timestamp: number;
  lamportClock: number;
  vectorClock: Record<string, number>;
}

export interface ElectionMessage {
  type: 'election' | 'answer' | 'coordinator' | 'token';
  senderId: string;
  candidateId?: string;
  tokenHolder?: string;
  participants?: string[];
}

export interface ReplicaData {
  id: string;
  data: any;
  version: number;
  timestamp: number;
  vectorClock: Record<string, number>;
}

export interface LoadBalancerState {
  algorithm: 'round-robin' | 'least-connections' | 'weighted';
  nodes: ServerNode[];
  currentIndex: number;
}

export interface HealthCheck {
  nodeId: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  timestamp: number;
}

export interface ConsistencyModel {
  type: 'strong' | 'eventual' | 'causal';
  quorumRead: number;
  quorumWrite: number;
}

export interface ReplicationStrategy {
  type: 'master-slave' | 'multi-master' | 'peer-to-peer';
  replicas: number;
  syncMode: 'sync' | 'async';
}