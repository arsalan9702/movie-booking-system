const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'movie_booking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Initializing database...');

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration INTEGER NOT NULL,
        genre JSONB,
        rating DECIMAL(3,1),
        poster_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Movies table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS showtimes (
        id VARCHAR(50) PRIMARY KEY,
        movie_id VARCHAR(50) REFERENCES movies(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        screen VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        available_seats INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Showtimes table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        movie_id VARCHAR(50) REFERENCES movies(id),
        showtime_id VARCHAR(50) REFERENCES showtimes(id),
        seats JSONB NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL,
        timestamp BIGINT NOT NULL,
        logical_clock BIGINT NOT NULL,
        processed_by VARCHAR(50) NOT NULL,
        vector_clock JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Bookings table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS data_replicas (
        id VARCHAR(50) PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        record_id VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        version INTEGER NOT NULL,
        timestamp BIGINT NOT NULL,
        vector_clock JSONB,
        node_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Data replicas table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS server_nodes (
        id VARCHAR(50) PRIMARY KEY,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL,
        is_leader BOOLEAN DEFAULT false,
        is_alive BOOLEAN DEFAULT true,
        load_factor DECIMAL(5,2) DEFAULT 0,
        last_heartbeat BIGINT NOT NULL,
        lamport_clock BIGINT DEFAULT 0,
        vector_clock JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Server nodes table created');

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_showtimes_movie ON showtimes(movie_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_showtime ON bookings(showtime_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_replicas_record ON data_replicas(table_name, record_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_nodes_leader ON server_nodes(is_leader)');
    console.log('✅ Indexes created');

    // Insert sample data
    console.log('🎬 Inserting sample movies...');

    const movies = [
      {
        id: 'movie-1',
        title: 'The Distributed Adventure',
        description: 'An epic journey through microservices and distributed systems, where data replicates across multiple nodes.',
        duration: 142,
        genre: JSON.stringify(['Action', 'Sci-Fi', 'Thriller']),
        rating: 8.5,
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
      },
      {
        id: 'movie-2',
        title: 'Clock Synchronization',
        description: 'A thrilling tale of time, causality, and the quest for perfect clock synchronization across the cosmos.',
        duration: 128,
        genre: JSON.stringify(['Sci-Fi', 'Drama']),
        rating: 9.0,
        poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400',
      },
      {
        id: 'movie-3',
        title: 'Leader Election',
        description: 'When the coordinator fails, nodes must battle to become the new leader in this intense distributed saga.',
        duration: 115,
        genre: JSON.stringify(['Action', 'Drama']),
        rating: 8.2,
        poster_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400',
      },
      {
        id: 'movie-4',
        title: 'Replication Wars',
        description: 'Master-slave, multi-master, peer-to-peer - which replication strategy will prevail?',
        duration: 135,
        genre: JSON.stringify(['Action', 'Adventure']),
        rating: 8.7,
        poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400',
      },
    ];

    for (const movie of movies) {
      await client.query(
        `INSERT INTO movies (id, title, description, duration, genre, rating, poster_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [movie.id, movie.title, movie.description, movie.duration, movie.genre, movie.rating, movie.poster_url]
      );
    }
    console.log('✅ Sample movies inserted');

    // Insert sample showtimes
    console.log('🎫 Inserting sample showtimes...');
    const now = new Date();
    
    for (let i = 0; i < movies.length; i++) {
      for (let j = 0; j < 3; j++) {
        const startTime = new Date(now.getTime() + (j * 4 + i) * 3600000);
        const movie = movies[i];
        const showtimeId = `showtime-${movie.id}-${j}`;
        
        await client.query(
          `INSERT INTO showtimes (id, movie_id, start_time, end_time, screen, price, available_seats)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            showtimeId,
            movie.id,
            startTime,
            new Date(startTime.getTime() + movie.duration * 60000),
            `Screen ${(j % 4) + 1}`,
            12.50 + (j * 2.50),
            96 - Math.floor(Math.random() * 30),
          ]
        );
      }
    }
    console.log('✅ Sample showtimes inserted');

    // Insert initial server nodes
    console.log('🖥️  Inserting server nodes...');
    const nodes = [
      { id: 'node-1', host: 'localhost', port: 3000, is_leader: true },
      { id: 'node-2', host: 'localhost', port: 3001, is_leader: false },
      { id: 'node-3', host: 'localhost', port: 3002, is_leader: false },
    ];

    for (const node of nodes) {
      await client.query(
        `INSERT INTO server_nodes (id, host, port, is_leader, last_heartbeat, vector_clock)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           is_leader = $4, last_heartbeat = $5, updated_at = CURRENT_TIMESTAMP`,
        [node.id, node.host, node.port, node.is_leader, Date.now(), JSON.stringify({})]
      );
    }
    console.log('✅ Server nodes inserted');

    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase().catch(console.error);