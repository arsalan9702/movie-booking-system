'use client';

import { useEffect, useState } from 'react';
import { Booking } from '@/types';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function BookingsPage() {
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchBookings();
	}, []);

	const fetchBookings = async () => {
		try {
			const url = API_BASE && API_BASE.length > 0 ? `${API_BASE}/bookings?userId=user-1` : '/api/bookings?userId=user-1';
			const response = await fetch(url);
			const data = await response.json();
			setBookings(data.bookings || []);
		} catch (error) {
			console.error('Failed to fetch bookings:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#121826]">
			<div className="container mx-auto px-4 py-6">
				<div className="flex items-center justify-between">
					<Link href="/" className="text-white/70 hover:text-white">← Home</Link>
					<h1 className="text-white text-xl font-semibold">My Bookings</h1>
				</div>
			</div>

			<div className="container mx-auto px-4 pb-10">
				{loading ? (
					<div className="flex items-center justify-center py-20 text-white/80 text-lg">Loading bookings...</div>
				) : bookings.length === 0 ? (
					<div className="text-center py-20">
						<div className="text-5xl mb-4">🎫</div>
						<h2 className="text-white text-2xl font-semibold mb-2">No Bookings Yet</h2>
						<p className="text-white/60 mb-6">Start booking your favorite movies!</p>
						<Link href="/" className="inline-block px-6 py-3 bg-[#F84464] hover:bg-[#e53a5a] text-white font-semibold rounded-md transition-colors">Browse Movies</Link>
					</div>
				) : (
					<div className="space-y-4">
						{bookings.map((booking) => (
							<div key={booking.id} className="bg-[#1F2533] rounded-xl p-6 border border-white/5">
								<div className="flex flex-col md:flex-row justify-between gap-4">
									<div className="flex-1">
										<div className="flex items-center space-x-3 mb-3">
											<h3 className="text-white font-semibold">Booking #{booking.id.slice(-8)}</h3>
											<span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
												booking.status === 'confirmed'
													? 'bg-green-500/20 text-green-300'
													: booking.status === 'pending'
													? 'bg-yellow-500/20 text-yellow-300'
													: 'bg-red-500/20 text-red-300'
											}`}>{booking.status.toUpperCase()}</span>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
											<div>
												<div className="text-white/60">Seats</div>
												<div className="text-white font-semibold">{booking.seats.join(', ')}</div>
											</div>

											<div>
												<div className="text-white/60">Total Price</div>
												<div className="text-white font-semibold text-lg">${booking.totalPrice.toFixed(2)}</div>
											</div>

											<div>
												<div className="text-white/60">Booking Time</div>
												<div className="text-white">{new Date(booking.timestamp).toLocaleString()}</div>
											</div>

											<div>
												<div className="text-white/60">Processed By</div>
												<div className="text-white/80 font-mono text-xs">{booking.processedBy}</div>
											</div>
										</div>

										<div className="mt-4 p-3 bg-[#121826] rounded-lg border border-white/10">
											<div className="text-xs text-white/60 mb-2">Distributed System Info</div>
											<div className="grid grid-cols-2 gap-2 text-xs">
												<div>
													<span className="text-white/60">Logical Clock:</span>
													<span className="text-white ml-2 font-mono">{booking.logicalClock}</span>
												</div>
												<div>
													<span className="text-white/60">Node:</span>
													<span className="text-white ml-2 font-mono">{booking.processedBy}</span>
												</div>
											</div>
										</div>
									</div>

									<div className="flex flex-col justify-between items-end">
										<div className="text-5xl mb-4">🎬</div>
										<button className="px-4 py-2 bg-[#2B3148] hover:bg-[#3b4463] text-white rounded-md transition-colors text-sm">View Details</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

