import { NextRequest, NextResponse } from 'next/server';
import { getReplicasByRecord } from '@/lib/db/queries';
import { query } from '@/lib/db/config';

// GET /api/replicas - Get replicas for a record
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    const tableName = searchParams.get('table') || 'bookings';

    if (!recordId) {
      // Get all replicas summary
      const result = await query(`
        SELECT 
          table_name,
          COUNT(*) as replica_count,
          COUNT(DISTINCT node_id) as node_count
        FROM data_replicas
        GROUP BY table_name
      `);

      return NextResponse.json({
        summary: result.rows,
      });
    }

    const replicas = await getReplicasByRecord(tableName, recordId);

    return NextResponse.json({
      recordId,
      tableName,
      replicaCount: replicas.length,
      replicas: replicas.map(r => ({
        version: r.version,
        timestamp: r.timestamp,
        vectorClock: r.vectorClock,
      })),
    });
  } catch (error) {
    console.error('GET /api/replicas error:', error);
    return NextResponse.json(
      { error: 'Failed to get replicas' },
      { status: 500 }
    );
  }
}