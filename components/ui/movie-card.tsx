import { Movie } from '@/types';
import Link from 'next/link';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link href={`/movies/${movie.id}`}>
      <div className="group cursor-pointer">
        {/* Poster */}
        <div className="relative rounded-lg overflow-hidden shadow-md">
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-full h-72 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-72 flex items-center justify-center text-6xl bg-[#2B3148]">🎬</div>
          )}
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {movie.rating.toFixed(1)} ★
          </div>
        </div>
        {/* Title */}
        <div className="mt-3">
          <div className="text-white font-semibold truncate">{movie.title}</div>
          <div className="text-white/60 text-sm truncate mt-1">
            {movie.genre.slice(0, 2).join(' • ')} • {movie.duration}m
          </div>
        </div>
      </div>
    </Link>
  );
}