export default function Footer() {
	return (
		<footer className="bg-[#2B3148] mt-16">
			<div className="container mx-auto px-4 py-10 text-white/70 text-sm">
				<div className="flex flex-col md:flex-row justify-between gap-6">
					<div>
						<div className="text-white font-semibold mb-2">Movies Now Showing</div>
						<p>Discover movies, events, plays, and more around you.</p>
					</div>
					<div className="text-white/60">© 2025 MovieBook • Inspired UI</div>
				</div>
			</div>
		</footer>
	);
}
