import { NextRequest, NextResponse } from 'next/server';
import { createBooking, getBookingsByUser, getBookingById } from '@/lib/db/queries';
import { Booking } from '@/types';
import { NodeManager } from '@/lib/distributed/node-manager';

// Initialize node manager (in production, this would be a singleton)
const nodeManager = new NodeManager(
  process.env.NODE_ID || 'node-1',
  process.env.NODE_HOST || 'localhost',
  parseInt(process.env.NODE_PORT || '3000')
);

// GET /api/bookings - Get bookings by user ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const bookingId = searchParams.get('id');

    if (bookingId) {
      const booking = await getBookingById(bookingId);
      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ booking });
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const bookings = await getBookingsByUser(userId);
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create new booking with distributed system handling
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get clock state from node manager
    const clockState = nodeManager.getClockSync().getClockState();
    
    const booking: Booking = {
      id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: body.userId,
      movieId: body.movieId,
      showtimeId: body.showtimeId,
      seats: body.seats,
      totalPrice: body.totalPrice,
      status: 'pending',
      timestamp: Date.now(),
      logicalClock: clockState.lamport,
      processedBy: nodeManager.getNodeInfo().id,
    };

    // Process through node manager for load balancing and replication
    const processedBooking = await nodeManager.routeRequest({
      type: 'booking',
      data: booking,
      requiresReplication: true,
    });

    // Create booking in database
    const createdBooking = await createBooking(booking);

    // Replicate to other nodes
    await nodeManager.getReplicationManager().replicateData(
      createdBooking,
      'create'
    );

    return NextResponse.json(
      { 
        booking: createdBooking,
        distributedInfo: {
          processedBy: processedBooking.processedBy,
          logicalClock: processedBooking.logicalClock,
          timestamp: processedBooking.timestamp,
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/bookings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create booking' },
      { status: 500 }
    );
  }
}

// Initialize node manager on startup
if (typeof window === 'undefined') {
  nodeManager.initialize().catch(console.error);
}