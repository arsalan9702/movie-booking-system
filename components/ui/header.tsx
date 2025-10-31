import Link from 'next/link';

export default function Header() {
	return (
		<header className="sticky top-0 z-40">
			<div className="bg-[#2B3148]">
				<div className="container mx-auto px-4 py-3 flex items-center gap-4">
					<Link href="/" className="text-white text-2xl font-semibold tracking-tight">BookMyShow</Link>
					<div className="hidden md:flex items-center bg-white/10 rounded-md px-3 py-2 flex-1">
						<span className="text-white/70 mr-2">🔎</span>
						<input
							type="text"
							placeholder="Search for Movies, Events, Plays, Sports"
							className="bg-transparent outline-none text-sm text-white placeholder:text-white/60 w-full"
						/>
					</div>
					<div className="ml-auto flex items-center gap-3">
						<button className="text-white/80 text-sm">Mumbai ▼</button>
						<Link href="/bookings" className="bg-[#F84464] hover:bg-[#e53a5a] text-white text-sm px-4 py-2 rounded">My Bookings</Link>
					</div>
				</div>
			</div>
			<div className="bg-[#1F2533]">
				<div className="container mx-auto px-4 py-2 text-white/80 text-sm flex gap-4 overflow-x-auto">
					<span className="whitespace-nowrap">Movies</span>
					<span className="whitespace-nowrap">Stream</span>
					<span className="whitespace-nowrap">Events</span>
					<span className="whitespace-nowrap">Plays</span>
					<span className="whitespace-nowrap">Sports</span>
					<span className="whitespace-nowrap">Activities</span>
				</div>
			</div>
		</header>
	);
}
