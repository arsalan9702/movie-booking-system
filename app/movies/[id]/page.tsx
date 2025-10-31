'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Movie, Showtime, Seat } from '@/types';
import SeatSelector from '@/components/ui/seat-selector';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function MovieDetailPage() {
	const params = useParams();
	const router = useRouter();
	const [movie, setMovie] = useState<Movie | null>(null);
	const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
	const [seats, setSeats] = useState<Seat[]>([]);
	const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [booking, setBooking] = useState(false);

	useEffect(() => {
		fetchMovie();
	}, [params.id]);

	useEffect(() => {
		if (selectedShowtime) {
			generateSeats();
		}
	}, [selectedShowtime]);

	const fetchMovie = async () => {
		try {
			const url = API_BASE && API_BASE.length > 0 ? `${API_BASE}/movies?id=${params.id}` : `/api/movies?id=${params.id}`;
			const response = await fetch(url);
			const data = await response.json();
			setMovie(data.movie);
		} catch (error) {
			console.error('Failed to fetch movie:', error);
		} finally {
			setLoading(false);
		}
	};

	const generateSeats = () => {
		const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
		const seatsPerRow = 12;
		const allSeats: Seat[] = [];
		rows.forEach((row) => {
			for (let i = 1; i <= seatsPerRow; i++) {
				const isBooked = Math.random() < 0.2;
				allSeats.push({ id: `${row}${i}`, row, number: i, status: isBooked ? 'booked' : 'available', price: selectedShowtime?.price || 10 });
			}
		});
		setSeats(allSeats);
	};

	const handleSeatSelect = (seatId: string) => {
		setSelectedSeats((prev) => (prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]));
	};

	const handleBooking = async () => {
		if (!movie || !selectedShowtime || selectedSeats.length === 0) return;
		setBooking(true);
		try {
			const url = API_BASE && API_BASE.length > 0 ? `${API_BASE}/bookings` : '/api/bookings';
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: 'user-1',
					movieId: movie.id,
					showtimeId: selectedShowtime.id,
					seats: selectedSeats,
					totalPrice: selectedSeats.length * selectedShowtime.price,
				}),
			});
			const data = await response.json();
			if (response.ok) {
				alert(`Booking successful!\n\nProcessed by: ${data.distributedInfo.processedBy}\nLogical Clock: ${data.distributedInfo.logicalClock}`);
				router.push('/bookings');
			} else {
				alert(`Booking failed: ${data.error}`);
			}
		} catch (error) {
			console.error('Booking failed:', error);
			alert('Booking failed. Please try again.');
		} finally {
			setBooking(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#121826] flex items-center justify-center">
				<div className="text-white/80 text-lg">Loading...</div>
			</div>
		);
	}

	if (!movie) {
		return (
			<div className="min-h-screen bg-[#121826] flex items-center justify-center">
				<div className="text-white/80 text-lg">Movie not found</div>
			</div>
		);
	}

	const totalPrice = selectedSeats.length * (selectedShowtime?.price || 0);

	return (
		<div className="min-h-screen bg-[#121826]">
			<div className="container mx-auto px-4 py-6">
				<Link href="/" className="text-white/70 hover:text-white">← Home</Link>
			</div>
			<div className="container mx-auto px-4 pb-10">
				{/* Movie Info */}
				<div className="bg-[#1F2533] rounded-xl p-6 mb-8 border border-white/5">
					<div className="flex flex-col md:flex-row gap-6">
						<div className="w-full md:w-64 h-96 bg-[#2B3148] rounded-lg overflow-hidden flex-shrink-0">
							{movie.posterUrl ? (
								<img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
							) : (
								<div className="w-full h-full flex items-center justify-center text-6xl">🎬</div>
							)}
						</div>
						
						<div className="flex-1">
							<h1 className="text-3xl font-semibold text-white mb-2">{movie.title}</h1>
							<div className="text-white/60 text-sm mb-4">{movie.genre.join(' • ')} • {movie.duration}m</div>
							<p className="text-white/70 mb-6">{movie.description}</p>

							{/* Showtime Selection */}
							{!selectedShowtime && movie.showtimes && movie.showtimes.length > 0 && (
								<div>
									<h3 className="text-white font-semibold mb-3">Select Showtime</h3>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
										{movie.showtimes.map((showtime) => (
											<button
												key={showtime.id}
												onClick={() => setSelectedShowtime(showtime)}
												className="bg-[#2B3148] hover:bg-[#3b4463] text-white p-3 rounded-lg transition-colors"
											>
												<div className="font-semibold">
													{new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
												</div>
												<div className="text-xs text-white/70">{showtime.screen}</div>
												<div className="text-xs text-white/60">{showtime.availableSeats} seats</div>
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Seat Selection */}
				{selectedShowtime && (
					<div className="bg-[#1F2533] rounded-xl p-6 border border-white/5">
						<div className="flex justify-between items-center mb-6">
							<div>
								<h2 className="text-xl font-semibold text-white">Select Seats</h2>
								<p className="text-white/60">{new Date(selectedShowtime.startTime).toLocaleTimeString()} • {selectedShowtime.screen}</p>
							</div>
							<button onClick={() => { setSelectedShowtime(null); setSelectedSeats([]); }} className="text-white/70 hover:text-white">Change Showtime</button>
						</div>

						<SeatSelector seats={seats} selectedSeats={selectedSeats} onSeatSelect={handleSeatSelect} />

						{selectedSeats.length > 0 && (
							<div className="mt-8 bg-[#121826] rounded-lg p-6">
								<div className="flex justify-between items-center mb-4">
									<div>
										<div className="text-white/60 text-sm">Selected Seats</div>
										<div className="text-white font-semibold">{selectedSeats.join(', ')}</div>
									</div>
									<div className="text-right">
										<div className="text-white/60 text-sm">Total</div>
										<div className="text-3xl font-bold text-white">${totalPrice.toFixed(2)}</div>
									</div>
								</div>

								<button onClick={handleBooking} disabled={booking} className="w-full bg-[#F84464] hover:bg-[#e53a5a] disabled:opacity-50 text-white font-semibold py-4 rounded-lg transition-colors">
									{booking ? 'Processing...' : `Confirm Booking - $${totalPrice.toFixed(2)}`}
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

