import { NextRequest, NextResponse } from 'next/server';
import { getAllServerNodes } from '@/lib/db/queries';

// GET /api/health - Health check endpoint
export async function GET(request: NextRequest) {
  try {
    const nodes = await getAllServerNodes();
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    const health = nodes.map(node => ({
      nodeId: node.id,
      status: node.isAlive && (now - node.lastHeartbeat < timeout) 
        ? 'healthy' 
        : 'unhealthy',
      isLeader: node.isLeader,
      load: node.load,
      lastHeartbeat: node.lastHeartbeat,
      timeSinceHeartbeat: now - node.lastHeartbeat,
    }));

    const healthyCount = health.filter(h => h.status === 'healthy').length;
    const overallStatus = healthyCount > 0 ? 'healthy' : 'degraded';

    return NextResponse.json({
      status: overallStatus,
      timestamp: now,
      nodes: health,
      summary: {
        total: nodes.length,
        healthy: healthyCount,
        unhealthy: nodes.length - healthyCount,
      },
    });
  } catch (error) {
    console.error('GET /api/health error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to check health',
      },
      { status: 500 }
    );
  }
}