import { NextRequest, NextResponse } from 'next/server';
import { getAllMovies, getMovieById, createMovie } from '@/lib/db/queries';
import { Movie } from '@/types';

// GET /api/movies - Get all movies or specific movie by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const movie = await getMovieById(id);
      if (!movie) {
        return NextResponse.json(
          { error: 'Movie not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ movie });
    }

    const movies = await getAllMovies();
    return NextResponse.json({ movies });
  } catch (error) {
    console.error('GET /api/movies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 }
    );
  }
}

// POST /api/movies - Create new movie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const movie: Movie = {
      id: `movie-${Date.now()}`,
      title: body.title,
      description: body.description,
      duration: body.duration,
      genre: body.genre || [],
      rating: body.rating || 0,
      posterUrl: body.posterUrl || '',
      showtimes: [],
    };

    const createdMovie = await createMovie(movie);
    return NextResponse.json({ movie: createdMovie }, { status: 201 });
  } catch (error) {
    console.error('POST /api/movies error:', error);
    return NextResponse.json(
      { error: 'Failed to create movie' },
      { status: 500 }
    );
  }
}