'use client';

import { useEffect, useState } from 'react';
import { Movie } from '@/types';
import MovieCard from '@/components/ui/movie-card';
import SystemMonitor from '@/components/ui/system-monitor';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMonitor, setShowMonitor] = useState(false);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const url = API_BASE && API_BASE.length > 0 ? `${API_BASE}/movies` : '/api/movies';
      const response = await fetch(url);
      const data = await response.json();
      setMovies(data.movies || []);
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Quick toolbar */}
      <div className="bg-[#121826] border-b border-white/5">
        <div className="container mx-auto px-4 py-3 flex items-center justify-end">
          <button onClick={() => setShowMonitor(true)} className="text-white/80 text-sm">📊 System Monitor</button>
        </div>
      </div>

      {/* System Monitor Overlay */}
      {showMonitor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1F2533] rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">System Monitor</h2>
              <button onClick={() => setShowMonitor(false)} className="text-white/70 hover:text-white text-2xl">×</button>
            </div>
            <SystemMonitor />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-white text-2xl font-semibold">Recommended Movies</h2>
          <div className="text-white/50 text-sm">Movies curated for you</div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-[#2B3148] rounded-lg h-80 animate-pulse" />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20 text-white/70">No Movies Available</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}