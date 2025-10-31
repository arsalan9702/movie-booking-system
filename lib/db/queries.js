"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllMovies = getAllMovies;
exports.getMovieById = getMovieById;
exports.createMovie = createMovie;
exports.getShowtimesByMovie = getShowtimesByMovie;
exports.getShowtimeById = getShowtimeById;
exports.createShowtime = createShowtime;
exports.updateAvailableSeats = updateAvailableSeats;
exports.createBooking = createBooking;
exports.getBookingsByUser = getBookingsByUser;
exports.getBookingById = getBookingById;
exports.upsertServerNode = upsertServerNode;
exports.getAllServerNodes = getAllServerNodes;
exports.getServerNodeById = getServerNodeById;
exports.createReplica = createReplica;
exports.getReplicasByRecord = getReplicasByRecord;
const config_1 = require("./config");
const mem = __importStar(require("./memory"));
const USE_IN_MEMORY = process.env.USE_IN_MEMORY === 'true';
/**
 * Movie Queries
 */
async function getAllMovies() {
    if (USE_IN_MEMORY)
        return mem.getAllMovies();
    const result = await (0, config_1.query)('SELECT * FROM movies ORDER BY created_at DESC');
    return result.rows.map(mapRowToMovie);
}
async function getMovieById(id) {
    if (USE_IN_MEMORY)
        return mem.getMovieById(id);
    const result = await (0, config_1.query)('SELECT * FROM movies WHERE id = $1', [id]);
    if (result.rows.length === 0)
        return null;
    const movie = mapRowToMovie(result.rows[0]);
    const showtimesResult = await (0, config_1.query)('SELECT * FROM showtimes WHERE movie_id = $1 ORDER BY start_time', [id]);
    movie.showtimes = showtimesResult.rows.map(mapRowToShowtime);
    return movie;
}
async function createMovie(movie) {
    if (USE_IN_MEMORY)
        return mem.createMovie(movie);
    if ((0, config_1.isMySQL)()) {
        await (0, config_1.query)(`INSERT INTO movies (id, title, description, duration, genre, rating, poster_url)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`, [movie.id, movie.title, movie.description, movie.duration,
            JSON.stringify(movie.genre), movie.rating, movie.posterUrl]);
        const fetched = await (0, config_1.query)('SELECT * FROM movies WHERE id = $1', [movie.id]);
        return mapRowToMovie(fetched.rows[0]);
    }
    const result = await (0, config_1.query)(`INSERT INTO movies (id, title, description, duration, genre, rating, poster_url)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [movie.id, movie.title, movie.description, movie.duration,
        JSON.stringify(movie.genre), movie.rating, movie.posterUrl]);
    return mapRowToMovie(result.rows[0]);
}
/**
 * Showtime Queries
 */
async function getShowtimesByMovie(movieId) {
    if (USE_IN_MEMORY)
        return mem.getShowtimesByMovie(movieId);
    const result = await (0, config_1.query)('SELECT * FROM showtimes WHERE movie_id = $1 ORDER BY start_time', [movieId]);
    return result.rows.map(mapRowToShowtime);
}
async function getShowtimeById(id) {
    if (USE_IN_MEMORY)
        return mem.getShowtimeById(id);
    const result = await (0, config_1.query)('SELECT * FROM showtimes WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapRowToShowtime(result.rows[0]) : null;
}
async function createShowtime(showtime) {
    if (USE_IN_MEMORY)
        return mem.createShowtime(showtime);
    if ((0, config_1.isMySQL)()) {
        await (0, config_1.query)(`INSERT INTO showtimes (id, movie_id, start_time, end_time, screen, price, available_seats)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`, [showtime.id, showtime.movieId, showtime.startTime, showtime.endTime,
            showtime.screen, showtime.price, showtime.availableSeats]);
        const fetched = await (0, config_1.query)('SELECT * FROM showtimes WHERE id = $1', [showtime.id]);
        return mapRowToShowtime(fetched.rows[0]);
    }
    const result = await (0, config_1.query)(`INSERT INTO showtimes (id, movie_id, start_time, end_time, screen, price, available_seats)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [showtime.id, showtime.movieId, showtime.startTime, showtime.endTime,
        showtime.screen, showtime.price, showtime.availableSeats]);
    return mapRowToShowtime(result.rows[0]);
}
async function updateAvailableSeats(showtimeId, seatsToReduce) {
    if (USE_IN_MEMORY)
        return mem.updateAvailableSeats(showtimeId, seatsToReduce);
    return await (0, config_1.transaction)(async (client) => {
        const lockResult = await client.query('SELECT available_seats FROM showtimes WHERE id = $1 FOR UPDATE', [showtimeId]);
        if (lockResult.rows.length === 0)
            throw new Error('Showtime not found');
        const currentSeats = lockResult.rows[0].available_seats;
        if (currentSeats < seatsToReduce)
            throw new Error('Not enough seats available');
        await client.query('UPDATE showtimes SET available_seats = available_seats - $1 WHERE id = $2', [seatsToReduce, showtimeId]);
        return true;
    });
}
/**
 * Booking Queries
 */
async function createBooking(booking) {
    if (USE_IN_MEMORY)
        return mem.createBooking(booking);
    if ((0, config_1.isMySQL)()) {
        // MySQL: manual two-step insert + select
        return await (0, config_1.transaction)(async (client) => {
            const showtimeResult = await client.query('SELECT available_seats FROM showtimes WHERE id = $1 FOR UPDATE', [booking.showtimeId]);
            if (showtimeResult.rows.length === 0)
                throw new Error('Showtime not found');
            const availableSeats = showtimeResult.rows[0].available_seats;
            if (availableSeats < booking.seats.length)
                throw new Error('Not enough seats available');
            await client.query(`INSERT INTO bookings 
				 (id, user_id, movie_id, showtime_id, seats, total_price, status, 
				  timestamp, logical_clock, processed_by, vector_clock)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [booking.id, booking.userId, booking.movieId, booking.showtimeId,
                JSON.stringify(booking.seats), booking.totalPrice, booking.status,
                booking.timestamp, booking.logicalClock, booking.processedBy,
                JSON.stringify({})]);
            await client.query('UPDATE showtimes SET available_seats = available_seats - $1 WHERE id = $2', [booking.seats.length, booking.showtimeId]);
            const fetched = await client.query('SELECT * FROM bookings WHERE id = $1', [booking.id]);
            return mapRowToBooking(fetched.rows[0]);
        });
    }
    // Postgres path
    return await (0, config_1.transaction)(async (client) => {
        const showtimeResult = await client.query('SELECT available_seats FROM showtimes WHERE id = $1 FOR UPDATE', [booking.showtimeId]);
        if (showtimeResult.rows.length === 0)
            throw new Error('Showtime not found');
        const availableSeats = showtimeResult.rows[0].available_seats;
        if (availableSeats < booking.seats.length)
            throw new Error('Not enough seats available');
        const bookingResult = await client.query(`INSERT INTO bookings 
			 (id, user_id, movie_id, showtime_id, seats, total_price, status, 
			  timestamp, logical_clock, processed_by, vector_clock)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`, [booking.id, booking.userId, booking.movieId, booking.showtimeId,
            JSON.stringify(booking.seats), booking.totalPrice, booking.status,
            booking.timestamp, booking.logicalClock, booking.processedBy,
            JSON.stringify({})]);
        await client.query('UPDATE showtimes SET available_seats = available_seats - $1 WHERE id = $2', [booking.seats.length, booking.showtimeId]);
        return mapRowToBooking(bookingResult.rows[0]);
    });
}
async function getBookingsByUser(userId) {
    if (USE_IN_MEMORY)
        return mem.getBookingsByUser(userId);
    const result = await (0, config_1.query)('SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows.map(mapRowToBooking);
}
async function getBookingById(id) {
    if (USE_IN_MEMORY)
        return mem.getBookingById(id);
    const result = await (0, config_1.query)('SELECT * FROM bookings WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapRowToBooking(result.rows[0]) : null;
}
/**
 * Server Node Queries
 */
async function upsertServerNode(node) {
    if (USE_IN_MEMORY)
        return mem.upsertServerNode(node);
    if ((0, config_1.isMySQL)()) {
        await (0, config_1.query)(`INSERT INTO server_nodes 
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
			   updated_at = CURRENT_TIMESTAMP`, [node.id, node.host, node.port, node.isLeader, node.isAlive,
            node.load, node.lastHeartbeat, node.lamportClock,
            JSON.stringify(Object.fromEntries(node.vectorClock))]);
        return;
    }
    await (0, config_1.query)(`INSERT INTO server_nodes 
		 (id, host, port, is_leader, is_alive, load_factor, last_heartbeat, 
		  lamport_clock, vector_clock)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (id) DO UPDATE SET
		   is_leader = $4, is_alive = $5, load_factor = $6, 
		   last_heartbeat = $7, lamport_clock = $8, vector_clock = $9,
		   updated_at = CURRENT_TIMESTAMP`, [node.id, node.host, node.port, node.isLeader, node.isAlive,
        node.load, node.lastHeartbeat, node.lamportClock,
        JSON.stringify(Object.fromEntries(node.vectorClock))]);
}
async function getAllServerNodes() {
    if (USE_IN_MEMORY)
        return mem.getAllServerNodes();
    const result = await (0, config_1.query)('SELECT * FROM server_nodes');
    return result.rows.map(mapRowToServerNode);
}
async function getServerNodeById(id) {
    if (USE_IN_MEMORY)
        return mem.getServerNodeById(id);
    const result = await (0, config_1.query)('SELECT * FROM server_nodes WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapRowToServerNode(result.rows[0]) : null;
}
/**
 * Replica Queries
 */
async function createReplica(replica, nodeId) {
    if (USE_IN_MEMORY)
        return mem.createReplica(replica, nodeId);
    await (0, config_1.query)(`INSERT INTO data_replicas 
		 (id, table_name, record_id, data, version, timestamp, vector_clock, node_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [replica.id, 'bookings', replica.id, JSON.stringify(replica.data),
        replica.version, replica.timestamp, JSON.stringify(replica.vectorClock), nodeId]);
}
async function getReplicasByRecord(tableName, recordId) {
    if (USE_IN_MEMORY)
        return mem.getReplicasByRecord(tableName, recordId);
    const result = await (0, config_1.query)('SELECT * FROM data_replicas WHERE table_name = $1 AND record_id = $2', [tableName, recordId]);
    return result.rows.map((row) => ({
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
function mapRowToMovie(row) {
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
function mapRowToShowtime(row) {
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
function mapRowToBooking(row) {
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
function mapRowToServerNode(row) {
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
