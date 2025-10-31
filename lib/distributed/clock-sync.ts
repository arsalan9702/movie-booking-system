import { ClockSyncMessage } from '@/types';

class LamportClock {
	private value: number;

	constructor(initial: number = 0) {
		this.value = initial;
	}

	getValue(): number {
		return this.value;
	}

	tick(): void {
		this.value += 1;
	}

	merge(received: number): void {
		this.value = Math.max(this.value, received) + 1;
	}
}

class VectorClock {
	private clock: Map<string, number>;

	constructor(nodeIds: string[], selfId: string) {
		this.clock = new Map<string, number>();
		nodeIds.forEach((id) => this.clock.set(id, 0));
		if (!this.clock.has(selfId)) this.clock.set(selfId, 0);
	}

	getClock(): Map<string, number> {
		return new Map(this.clock);
	}

	increment(nodeId: string): void {
		this.clock.set(nodeId, (this.clock.get(nodeId) || 0) + 1);
	}

	merge(remote: Record<string, number>): void {
		Object.entries(remote).forEach(([id, val]) => {
			const cur = this.clock.get(id) || 0;
			this.clock.set(id, Math.max(cur, val));
		});
	}
}

export class ClockSyncManager {
	private nodeId: string;
	private leaderId: string;
	private nodeIds: string[];
	private lamport: LamportClock;
	private vector: VectorClock;
	private syncInterval?: NodeJS.Timeout;

	constructor(nodeId: string, nodeIds: string[], leaderId: string) {
		this.nodeId = nodeId;
		this.nodeIds = nodeIds;
		this.leaderId = leaderId;
		this.lamport = new LamportClock(0);
		this.vector = new VectorClock(nodeIds, nodeId);
	}

	startSync(): void {
		// Simulate periodic clock ticks
		this.syncInterval = setInterval(() => {
			this.lamport.tick();
			this.vector.increment(this.nodeId);
		}, 3000);
	}

	stopSync(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
		}
	}

	getLamportClock(): LamportClock {
		return this.lamport;
	}

	getVectorClock(): VectorClock {
		return this.vector;
	}

	getClockState(): { nodeId: string; lamport: number; vector: Record<string, number>; leaderId: string } {
		return {
			nodeId: this.nodeId,
			lamport: this.lamport.getValue(),
			vector: Object.fromEntries(this.vector.getClock()),
			leaderId: this.leaderId,
		};
	}

	processMessage(message: ClockSyncMessage): { lamport: number; vector: Record<string, number> } {
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

