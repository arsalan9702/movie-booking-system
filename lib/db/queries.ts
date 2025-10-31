import { query, transaction, isMySQL } from './config';
import * as mem from './memory';
import { Movie, Showtime, Booking, ServerNode, ReplicaData } from '@/types';

const USE_IN_MEMORY = process.env.USE_IN_MEMORY === 'true';

/**
 * Movie Queries
 */
export async function getAllMovies(): Promise<Movie[]> {
	if (USE_IN_MEMORY) return mem.getAllMovies();
	const result = await query('SELECT * FROM movies ORDER BY created_at DESC');
	return (result.rows as any[]).map(mapRowToMovie);
}

export async function getMovieById(id: string): Promise<Movie | null> {
	if (USE_IN_MEMORY) return mem.getMovieById(id);
	const result = await query('SELECT * FROM movies WHERE id = $1', [id]);
	if ((result.rows as any[]).length === 0) return null;
	const movie = mapRowToMovie((result.rows as any[])[0]);
	const showtimesResult = await query(
		'SELECT * FROM showtimes WHERE movie_id = $1 ORDER BY start_time',
		[id]
	);
	movie.showtimes = (showtimesResult.rows as any[]).map(mapRowToShowtime);
	return movie;
}

export async function createMovie(movie: Movie): Promise<Movie> {
	if (USE_IN_MEMORY) return mem.createMovie(movie);
	if (isMySQL()) {
		await query(
			`INSERT INTO movies (id, title, description, duration, genre, rating, poster_url)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[movie.id, movie.title, movie.description, movie.duration,
			 JSON.stringify(movie.genre), movie.rating, movie.posterUrl]
		);
		const fetched = await query('SELECT * FROM movies WHERE id = $1', [movie.id]);
		return mapRowToMovie((fetched.rows as any[])[0]);
	}
	const result = await query(
		`INSERT INTO movies (id, title, description, duration, genre, rating, poster_url)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
		[movie.id, movie.title, movie.description, movie.duration,
		 JSON.stringify(movie.genre), movie.rating, movie.posterUrl]
	);
	return mapRowToMovie((result.rows as any[])[0]);
}

/**
 * Showtime Queries
 */
export async function getShowtimesByMovie(movieId: string): Promise<Showtime[]> {
	if (USE_IN_MEMORY) return mem.getShowtimesByMovie(movieId);
	const result = await query(
		'SELECT * FROM showtimes WHERE movie_id = $1 ORDER BY start_time',
		[movieId]
	);
	return (result.rows as any[]).map(mapRowToShowtime);
}

export async function getShowtimeById(id: string): Promise<Showtime | null> {
	if (USE_IN_MEMORY) return mem.getShowtimeById(id);
	const result = await query('SELECT * FROM showtimes WHERE id = $1', [id]);
	return (result.rows as any[]).length > 0 ? mapRowToShowtime((result.rows as any[])[0]) : null;
}

export async function createShowtime(showtime: Showtime): Promise<Showtime> {
	if (USE_IN_MEMORY) return mem.createShowtime(showtime);
	if (isMySQL()) {
		await query(
			`INSERT INTO showtimes (id, movie_id, start_time, end_time, screen, price, available_seats)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[showtime.id, showtime.movieId, showtime.startTime, showtime.endTime,
			 showtime.screen, showtime.price, showtime.availableSeats]
		);
		const fetched = await query('SELECT * FROM showtimes WHERE id = $1', [showtime.id]);
		return mapRowToShowtime((fetched.rows as any[])[0]);
	}
	const result = await query(
		`INSERT INTO showtimes (id, movie_id, start_time, end_time, screen, price, available_seats)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
		[showtime.id, showtime.movieId, showtime.startTime, showtime.endTime,
		 showtime.screen, showtime.price, showtime.availableSeats]
	);
	return mapRowToShowtime((result.rows as any[])[0]);
}

export async function updateAvailableSeats(
	showtimeId: string,
	seatsToReduce: number
): Promise<boolean> {
	if (USE_IN_MEMORY) return mem.updateAvailableSeats(showtimeId, seatsToReduce);
	return await transaction(async (client: any) => {
		const lockResult = await client.query(
			'SELECT available_seats FROM showtimes WHERE id = $1 FOR UPDATE',
			[showtimeId]
		);
		if ((lockResult.rows as any[]).length === 0) throw new Error('Showtime not found');
		const currentSeats = (lockResult.rows as any[])[0].available_seats;
		if (currentSeats < seatsToReduce) throw new Error('Not enough seats available');
		await client.query(
			'UPDATE showtimes SET available_seats = available_seats - $1 WHERE id = $2',
			[seatsToReduce, showtimeId]
		);
		return true;
	});
}

/**
 * Booking Queries
 */
export async function createBooking(booking: Booking): Promise<Booking> {
	if (USE_IN_MEMORY) return mem.createBooking(booking);
	if (isMySQL()) {
		// MySQL: manual two-step insert + select
		return await transaction(async (client: any) => {
			const showtimeResult = await client.query(
				'SELECT available_seats FROM showtimes WHERE id = $1 FOR UPDATE',
				[booking.showtimeId]
			);
			if ((showtimeResult.rows as any[]).length === 0) throw new Error('Showtime not found');
			const availableSeats = (showtimeResult.rows as any[])[0].available_seats;
			if (availableSeats < booking.seats.length) throw new Error('Not enough seats available');

			await client.query(
				`INSERT INTO bookings 
				 (id, user_id, movie_id, showtime_id, seats, total_price, status, 
				  timestamp, logical_clock, processed_by, vector_clock)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
				[booking.id, booking.userId, booking.movieId, booking.showtimeId,
				 JSON.stringify(booking.seats), booking.totalPrice, booking.status,
				 booking.timestamp, booking.logicalClock, booking.processedBy,
				 JSON.stringify({})]
			);

			await client.query(
				'UPDATE showtimes SET available_seats = available_seats - $1 WHERE id = $2',
				[booking.seats.length, booking.showtimeId]
			);

			const fetched = await client.query('SELECT * FROM bookings WHERE id = $1', [booking.id]);
			return mapRowToBooking((fetched.rows as any[])[0]);
		});
	}
	// Postgres path
	return await transaction(async (client: any) => {
		const showtimeResult = await client.query(
			'SELECT available_seats FROM showtimes WHERE id = $1 FOR UPDATE',
			[booking.showtimeId]
		);
		if ((showtimeResult.rows as any[]).length === 0) throw new Error('Showtime not found');
		const availableSeats = (showtimeResult.rows as any[])[0].available_seats;
		if (availableSeats < booking.seats.length) throw new Error('Not enough seats available');
		const bookingResult = await client.query(
			`INSERT INTO bookings 
			 (id, user_id, movie_id, showtime_id, seats, total_price, status, 
			  timestamp, logical_clock, processed_by, vector_clock)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
			[booking.id, booking.userId, booking.movieId, booking.showtimeId,
			 JSON.stringify(booking.seats), booking.totalPrice, booking.status,
			 booking.timestamp, booking.logicalClock, booking.processedBy,
			 JSON.stringify({})]
		);
		await client.query(
			'UPDATE showtimes SET available_seats = available_seats - $1 WHERE id = $2',
			[booking.seats.length, booking.showtimeId]
		);
		return mapRowToBooking((bookingResult.rows as any[])[0]);
	});
}

export async function getBookingsByUser(userId: string): Promise<Booking[]> {
	if (USE_IN_MEMORY) return mem.getBookingsByUser(userId);
	const result = await query(
		'SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
		[userId]
	);
	return (result.rows as any[]).map(mapRowToBooking);
}

export async function getBookingById(id: string): Promise<Booking | null> {
	if (USE_IN_MEMORY) return mem.getBookingById(id);
	const result = await query('SELECT * FROM bookings WHERE id = $1', [id]);
	return (result.rows as any[]).length > 0 ? mapRowToBooking((result.rows as any[])[0]) : null;
}

/**
 * Server Node Queries
 */
export async function upsertServerNode(node: ServerNode): Promise<void> {
	if (USE_IN_MEMORY) return mem.upsertServerNode(node);
	if (isMySQL()) {
		await query(
			`INSERT INTO server_nodes 
			 (id, host, port, is_leader, is_alive, load_factor, last_heartbeat, 
			  lamport_clock, vector_clock)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 ON DUPLICATE KEY UPDATE
			   is_leader = VALUES(is_leader),
			   is_alive = VALUES(is_alive),
			   load_factor = VALUES(load_factor),
			   last_heartbeat = VALUES(last_heartbeat),
			   lamport_clock = VALUES(lamport_clock),
			   vector_clock = VALUES(vector_clock),
			   updated_at = CURRENT_TIMESTAMP`,
			[node.id, node.host, node.port, node.isLeader, node.isAlive,
			 node.load, node.lastHeartbeat, node.lamportClock,
			 JSON.stringify(Object.fromEntries(node.vectorClock))]
		);
		return;
	}
	await query(
		`INSERT INTO server_nodes 
		 (id, host, port, is_leader, is_alive, load_factor, last_heartbeat, 
		  lamport_clock, vector_clock)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (id) DO UPDATE SET
		   is_leader = $4, is_alive = $5, load_factor = $6, 
		   last_heartbeat = $7, lamport_clock = $8, vector_clock = $9,
		   updated_at = CURRENT_TIMESTAMP`,
		[node.id, node.host, node.port, node.isLeader, node.isAlive,
		 node.load, node.lastHeartbeat, node.lamportClock,
		 JSON.stringify(Object.fromEntries(node.vectorClock))]
	);
}

export async function getAllServerNodes(): Promise<ServerNode[]> {
	if (USE_IN_MEMORY) return mem.getAllServerNodes();
	const result = await query('SELECT * FROM server_nodes');
	return (result.rows as any[]).map(mapRowToServerNode);
}

export async function getServerNodeById(id: string): Promise<ServerNode | null> {
	if (USE_IN_MEMORY) return mem.getServerNodeById(id);
	const result = await query('SELECT * FROM server_nodes WHERE id = $1', [id]);
	return (result.rows as any[]).length > 0 ? mapRowToServerNode((result.rows as any[])[0]) : null;
}

/**
 * Replica Queries
 */
export async function createReplica(replica: ReplicaData, nodeId: string): Promise<void> {
	if (USE_IN_MEMORY) return mem.createReplica(replica, nodeId);
	await query(
		`INSERT INTO data_replicas 
		 (id, table_name, record_id, data, version, timestamp, vector_clock, node_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		[replica.id, 'bookings', replica.id, JSON.stringify(replica.data),
		 replica.version, replica.timestamp, JSON.stringify(replica.vectorClock), nodeId]
	);
}

export async function getReplicasByRecord(
	tableName: string,
	recordId: string
): Promise<ReplicaData[]> {
	if (USE_IN_MEMORY) return mem.getReplicasByRecord(tableName, recordId);
	const result = await query(
		'SELECT * FROM data_replicas WHERE table_name = $1 AND record_id = $2',
		[tableName, recordId]
	);
	return (result.rows as any[]).map((row: Record<string, any>) => ({
		id: row.id,
		data: row.data,
		version: row.version,
		timestamp: row.timestamp,
		vectorClock: row.vector_clock,
	}));
}

/**
 * Helper mapping functions
 */
function mapRowToMovie(row: any): Movie {
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		duration: row.duration,
		genre: row.genre,
		rating: parseFloat(row.rating),
		posterUrl: row.poster_url,
		showtimes: [],
	};
}

function mapRowToShowtime(row: any): Showtime {
	return {
		id: row.id,
		movieId: row.movie_id,
		startTime: row.start_time,
		endTime: row.end_time,
		screen: row.screen,
		price: parseFloat(row.price),
		availableSeats: row.available_seats,
	};
}

function mapRowToBooking(row: any): Booking {
	return {
		id: row.id,
		userId: row.user_id,
		movieId: row.movie_id,
		showtimeId: row.showtime_id,
		seats: Array.isArray(row.seats) ? row.seats : (typeof row.seats === 'string' ? JSON.parse(row.seats) : row.seats),
		totalPrice: parseFloat(row.total_price),
		status: row.status,
		timestamp: parseInt(row.timestamp),
		logicalClock: parseInt(row.logical_clock),
		processedBy: row.processed_by,
	};
}

function mapRowToServerNode(row: any): ServerNode {
	return {
		id: row.id,
		host: row.host,
		port: row.port,
		isLeader: !!row.is_leader,
		isAlive: !!row.is_alive,
		load: parseFloat(row.load_factor),
		lastHeartbeat: parseInt(row.last_heartbeat),
		lamportClock: parseInt(row.lamport_clock),
		vectorClock: new Map(Object.entries(row.vector_clock || {})),
	};
}