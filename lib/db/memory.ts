import { Booking, Movie, ReplicaData, ServerNode, Showtime } from '@/types';

const movies: Movie[] = [];
const showtimes: Showtime[] = [];
const bookings: Booking[] = [];
const serverNodes: ServerNode[] = [];
const replicas: ReplicaData[] = [];

function seedOnce() {
	if (movies.length > 0) return;
	const movie1: Movie = {
		id: 'movie-1',
		title: 'The Distributed Saga',
		description: 'A journey through consensus, clocks, and consistency.',
		duration: 132,
		genre: ['Sci-Fi', 'Tech'],
		rating: 8.7,
		posterUrl: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?q=80&w=1200&auto=format&fit=crop',
		showtimes: [],
	};
	const movie2: Movie = {
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
	const st1: Showtime = {
		id: 'showtime-1', movieId: movie1.id,
		startTime: new Date(now + 60 * 60 * 1000).toISOString(),
		endTime: new Date(now + 60 * 60 * 1000 + movie1.duration * 60 * 1000).toISOString(),
		screen: 'Screen 1', price: 12.5, availableSeats: 60,
	};
	const st2: Showtime = {
		id: 'showtime-2', movieId: movie1.id,
		startTime: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
		endTime: new Date(now + 4 * 60 * 60 * 1000 + movie1.duration * 60 * 1000).toISOString(),
		screen: 'Screen 2', price: 14, availableSeats: 45,
	};
	const st3: Showtime = {
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

export async function getAllMovies(): Promise<Movie[]> {
	return movies.map((m) => ({ ...m, showtimes: getShowtimesSync(m.id) }));
}

export async function getMovieById(id: string): Promise<Movie | null> {
	const movie = movies.find((m) => m.id === id);
	if (!movie) return null;
	return { ...movie, showtimes: getShowtimesSync(id) };
}

export async function createMovie(movie: Movie): Promise<Movie> {
	movies.unshift({ ...movie, showtimes: [] });
	return movie;
}

export async function getShowtimesByMovie(movieId: string): Promise<Showtime[]> {
	return getShowtimesSync(movieId);
}

function getShowtimesSync(movieId: string): Showtime[] {
	return showtimes.filter((s) => s.movieId === movieId);
}

export async function getShowtimeById(id: string): Promise<Showtime | null> {
	return showtimes.find((s) => s.id === id) || null;
}

export async function createShowtime(st: Showtime): Promise<Showtime> {
	showtimes.push(st);
	const movie = movies.find((m) => m.id === st.movieId);
	if (movie) movie.showtimes = getShowtimesSync(movie.id);
	return st;
}

export async function updateAvailableSeats(showtimeId: string, seatsToReduce: number): Promise<boolean> {
	const st = showtimes.find((s) => s.id === showtimeId);
	if (!st) throw new Error('Showtime not found');
	if (st.availableSeats < seatsToReduce) throw new Error('Not enough seats available');
	st.availableSeats -= seatsToReduce;
	return true;
}

export async function createBooking(b: Booking): Promise<Booking> {
	const st = showtimes.find((s) => s.id === b.showtimeId);
	if (!st) throw new Error('Showtime not found');
	if (st.availableSeats < b.seats.length) throw new Error('Not enough seats available');
	st.availableSeats -= b.seats.length;
	bookings.unshift({ ...b, status: b.status || 'pending' });
	return b;
}

export async function getBookingsByUser(userId: string): Promise<Booking[]> {
	return bookings.filter((b) => b.userId === userId);
}

export async function getBookingById(id: string): Promise<Booking | null> {
	return bookings.find((b) => b.id === id) || null;
}

export async function upsertServerNode(node: ServerNode): Promise<void> {
	const i = serverNodes.findIndex((n) => n.id === node.id);
	if (i >= 0) serverNodes[i] = node; else serverNodes.push(node);
}

export async function getAllServerNodes(): Promise<ServerNode[]> {
	return [...serverNodes];
}

export async function getServerNodeById(id: string): Promise<ServerNode | null> {
	return serverNodes.find((n) => n.id === id) || null;
}

export async function createReplica(replica: ReplicaData, _nodeId: string): Promise<void> {
	replicas.push(replica);
}

export async function getReplicasByRecord(tableName: string, recordId: string): Promise<ReplicaData[]> {
	return replicas.filter((r) => r.id === recordId && tableName === 'bookings');
}

