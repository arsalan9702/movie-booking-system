import { NextRequest, NextResponse } from 'next/server';
import { getAllServerNodes } from '@/lib/db/queries';
import { BullyElection } from '@/lib/algorithms/bully-election';
import { RingElection } from '@/lib/algorithms/ring-election';

// GET /api/election - Get current election status
export async function GET(request: NextRequest) {
  try {
    const nodes = await getAllServerNodes();
    const leader = nodes.find(node => node.isLeader);

    return NextResponse.json({
      leader: leader ? {
        id: leader.id,
        host: leader.host,
        port: leader.port,
      } : null,
      nodes: nodes.map(node => ({
        id: node.id,
        isLeader: node.isLeader,
        isAlive: node.isAlive,
      })),
    });
  } catch (error) {
    console.error('GET /api/election error:', error);
    return NextResponse.json(
      { error: 'Failed to get election status' },
      { status: 500 }
    );
  }
}

// POST /api/election - Trigger election
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { algorithm, nodeId } = body;

    if (!algorithm || !nodeId) {
      return NextResponse.json(
        { error: 'algorithm and nodeId are required' },
        { status: 400 }
      );
    }

    const nodes = await getAllServerNodes();
    
    if (algorithm === 'bully') {
      const bullyElection = new BullyElection(nodeId);
      nodes.forEach(node => bullyElection.addNode(node));
      
      const messages = bullyElection.startElection();
      
      return NextResponse.json({
        algorithm: 'bully',
        initiator: nodeId,
        messages: messages.length,
        status: 'election-started',
      });
    } else if (algorithm === 'ring') {
      const ringElection = new RingElection(nodeId);
      nodes.forEach(node => ringElection.addNode(node));
      
      const message = ringElection.startElection();
      
      return NextResponse.json({
        algorithm: 'ring',
        initiator: nodeId,
        token: message ? message.tokenHolder : null,
        status: 'election-started',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid algorithm. Use "bully" or "ring"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('POST /api/election error:', error);
    return NextResponse.json(
      { error: 'Failed to start election' },
      { status: 500 }
    );
  }
}