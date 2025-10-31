import { NextRequest, NextResponse } from 'next/server';
import { getAllServerNodes } from '@/lib/db/queries';
import { ClockSyncManager } from '@/lib/distributed/clock-sync';

// GET /api/sync - Get clock synchronization status
export async function GET(request: NextRequest) {
  try {
    const nodes = await getAllServerNodes();
    
    const clockStates = nodes.map(node => ({
      nodeId: node.id,
      lamportClock: node.lamportClock,
      vectorClock: Object.fromEntries(node.vectorClock),
      physicalTime: node.lastHeartbeat,
    }));

    return NextResponse.json({
      nodes: clockStates,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('GET /api/sync error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

// POST /api/sync - Sync clocks with message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderId, lamportClock, vectorClock } = body;

    if (!senderId || lamportClock === undefined || !vectorClock) {
      return NextResponse.json(
        { error: 'senderId, lamportClock, and vectorClock are required' },
        { status: 400 }
      );
    }

    const nodes = await getAllServerNodes();
    const nodeIds = nodes.map(n => n.id);
    
    // Create clock sync manager for the receiving node
    const receiverNode = nodes.find(n => n.id !== senderId);
    if (!receiverNode) {
      return NextResponse.json(
        { error: 'No receiver node available' },
        { status: 400 }
      );
    }

    const clockSync = new ClockSyncManager(
      receiverNode.id,
      nodeIds,
      nodes.find(n => n.isLeader)?.id || receiverNode.id
    );

    // Process the message
    const response = clockSync.processMessage({
      type: 'sync',
      senderId,
      timestamp: Date.now(),
      lamportClock,
      vectorClock,
    });

    return NextResponse.json({
      receiver: receiverNode.id,
      response,
      clockState: clockSync.getClockState(),
    });
  } catch (error) {
    console.error('POST /api/sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync clocks' },
      { status: 500 }
    );
  }
}