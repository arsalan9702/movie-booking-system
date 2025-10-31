"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const queries_1 = require("@/lib/db/queries");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const id = req.query.id;
        if (id) {
            const movie = await (0, queries_1.getMovieById)(id);
            if (!movie)
                return res.status(404).json({ error: 'Movie not found' });
            return res.json({ movie });
        }
        const movies = await (0, queries_1.getAllMovies)();
        res.json({ movies });
    }
    catch (e) {
        console.error('GET /movies error:', e);
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});
router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const movie = {
            id: `movie-${Date.now()}`,
            title: body.title,
            description: body.description,
            duration: body.duration,
            genre: body.genre || [],
            rating: body.rating || 0,
            posterUrl: body.posterUrl || '',
            showtimes: [],
        };
        const created = await (0, queries_1.createMovie)(movie);
        res.status(201).json({ movie: created });
    }
    catch (e) {
        console.error('POST /movies error:', e);
        res.status(500).json({ error: 'Failed to create movie' });
    }
});
exports.default = router;
