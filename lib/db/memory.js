"use strict";
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
const movies = [];
const showtimes = [];
const bookings = [];
const serverNodes = [];
const replicas = [];
function seedOnce() {
    if (movies.length > 0)
        return;
    const movie1 = {
        id: 'movie-1',
        title: 'The Distributed Saga',
        description: 'A journey through consensus, clocks, and consistency.',
        duration: 132,
        genre: ['Sci-Fi', 'Tech'],
        rating: 8.7,
        posterUrl: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?q=80&w=1200&auto=format&fit=crop',
        showtimes: [],
    };
    const movie2 = {
        id: 'movie-2',
        title: 'Leader Election',
        description: 'Who will lead when nodes fail?',
        duration: 109,
        genre: ['Thriller'],
        rating: 7.9,
        posterUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop',
        showtimes: [],
    };
    movies.push(movie1, movie2);
    const now = Date.now();
    const st1 = {
        id: 'showtime-1', movieId: movie1.id,
        startTime: new Date(now + 60 * 60 * 1000).toISOString(),
        endTime: new Date(now + 60 * 60 * 1000 + movie1.duration * 60 * 1000).toISOString(),
        screen: 'Screen 1', price: 12.5, availableSeats: 60,
    };
    const st2 = {
        id: 'showtime-2', movieId: movie1.id,
        startTime: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(now + 4 * 60 * 60 * 1000 + movie1.duration * 60 * 1000).toISOString(),
        screen: 'Screen 2', price: 14, availableSeats: 45,
    };
    const st3 = {
        id: 'showtime-3', movieId: movie2.id,
        startTime: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(now + 2 * 60 * 60 * 1000 + movie2.duration * 60 * 1000).toISOString(),
        screen: 'Screen 1', price: 11, availableSeats: 50,
    };
    showtimes.push(st1, st2, st3);
    movie1.showtimes = [st1, st2];
    movie2.showtimes = [st3];
}
seedOnce();
async function getAllMovies() {
    return movies.map((m) => ({ ...m, showtimes: getShowtimesSync(m.id) }));
}
async function getMovieById(id) {
    const movie = movies.find((m) => m.id === id);
    if (!movie)
        return null;
    return { ...movie, showtimes: getShowtimesSync(id) };
}
async function createMovie(movie) {
    movies.unshift({ ...movie, showtimes: [] });
    return movie;
}
async function getShowtimesByMovie(movieId) {
    return getShowtimesSync(movieId);
}
function getShowtimesSync(movieId) {
    return showtimes.filter((s) => s.movieId === movieId);
}
async function getShowtimeById(id) {
    return showtimes.find((s) => s.id === id) || null;
}
async function createShowtime(st) {
    showtimes.push(st);
    const movie = movies.find((m) => m.id === st.movieId);
    if (movie)
        movie.showtimes = getShowtimesSync(movie.id);
    return st;
}
async function updateAvailableSeats(showtimeId, seatsToReduce) {
    const st = showtimes.find((s) => s.id === showtimeId);
    if (!st)
        throw new Error('Showtime not found');
    if (st.availableSeats < seatsToReduce)
        throw new Error('Not enough seats available');
    st.availableSeats -= seatsToReduce;
    return true;
}
async function createBooking(b) {
    const st = showtimes.find((s) => s.id === b.showtimeId);
    if (!st)
        throw new Error('Showtime not found');
    if (st.availableSeats < b.seats.length)
        throw new Error('Not enough seats available');
    st.availableSeats -= b.seats.length;
    bookings.unshift({ ...b, status: b.status || 'pending' });
    return b;
}
async function getBookingsByUser(userId) {
    return bookings.filter((b) => b.userId === userId);
}
async function getBookingById(id) {
    return bookings.find((b) => b.id === id) || null;
}
async function upsertServerNode(node) {
    const i = serverNodes.findIndex((n) => n.id === node.id);
    if (i >= 0)
        serverNodes[i] = node;
    else
        serverNodes.push(node);
}
async function getAllServerNodes() {
    return [...serverNodes];
}
async function getServerNodeById(id) {
    return serverNodes.find((n) => n.id === id) || null;
}
async function createReplica(replica, _nodeId) {
    replicas.push(replica);
}
async function getReplicasByRecord(tableName, recordId) {
    return replicas.filter((r) => r.id === recordId && tableName === 'bookings');
}
