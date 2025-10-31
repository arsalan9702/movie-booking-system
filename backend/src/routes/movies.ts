import { Router } from 'express';
import { getAllMovies, getMovieById, createMovie } from '@/lib/db/queries';
import { Movie } from '@/types';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const id = req.query.id as string | undefined;
    if (id) {
      const movie = await getMovieById(id);
      if (!movie) return res.status(404).json({ error: 'Movie not found' });
      return res.json({ movie });
    }
    const movies = await getAllMovies();
    res.json({ movies });
  } catch (e) {
    console.error('GET /movies error:', e);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
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
    const created = await createMovie(movie);
    res.status(201).json({ movie: created });
  } catch (e) {
    console.error('POST /movies error:', e);
    res.status(500).json({ error: 'Failed to create movie' });
  }
});

export default router;
