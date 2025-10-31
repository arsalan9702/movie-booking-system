require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('=== DEBUG MODE ===');
console.log('Environment variables:');
console.log('MYSQL_HOST:', process.env.MYSQL_HOST);
console.log('MYSQL_PORT:', process.env.MYSQL_PORT);
console.log('MYSQL_USER:', process.env.MYSQL_USER);
console.log('MYSQL_DB:', process.env.MYSQL_DB);
console.log('MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? '***' : 'not set');
console.log('==================');

async function initializeDatabase() {

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'password',
    database: process.env.MYSQL_DB || 'movie_booking'
  });

  console.log('Connected to MySQL');

  try {
    // Drop existing tables
    console.log('Dropping existing tables...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS bookings');
    await connection.query('DROP TABLE IF EXISTS showtimes');
    await connection.query('DROP TABLE IF EXISTS movies');
    await connection.query('DROP TABLE IF EXISTS data_replicas');
    await connection.query('DROP TABLE IF EXISTS server_nodes');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // Create movies table
    console.log('Creating movies table...');
    await connection.query(`
      CREATE TABLE movies (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration INT NOT NULL,
        genre JSON,
        rating DECIMAL(3,1),
        poster_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create showtimes table
    console.log('Creating showtimes table...');
    await connection.query(`
      CREATE TABLE showtimes (
        id VARCHAR(50) PRIMARY KEY,
        movie_id VARCHAR(50),
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        screen VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        available_seats INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_showtimes_movie (movie_id),
        CONSTRAINT fk_showtimes_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
      )
    `);

    // Create bookings table
    console.log('Creating bookings table...');
    await connection.query(`
      CREATE TABLE bookings (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        movie_id VARCHAR(50),
        showtime_id VARCHAR(50),
        seats JSON NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL,
        timestamp BIGINT NOT NULL,
        logical_clock BIGINT NOT NULL,
        processed_by VARCHAR(50) NOT NULL,
        vector_clock JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bookings_user (user_id),
        INDEX idx_bookings_showtime (showtime_id),
        CONSTRAINT fk_bookings_movie FOREIGN KEY (movie_id) REFERENCES movies(id),
        CONSTRAINT fk_bookings_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
      )
    `);

    // Create data_replicas table
    console.log('Creating data_replicas table...');
    await connection.query(`
      CREATE TABLE data_replicas (
        id VARCHAR(50) PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        record_id VARCHAR(50) NOT NULL,
        data JSON NOT NULL,
        version INT NOT NULL,
        timestamp BIGINT NOT NULL,
        vector_clock JSON,
        node_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_replicas_record (table_name, record_id)
      )
    `);

    // Create server_nodes table
    console.log('Creating server_nodes table...');
    await connection.query(`
      CREATE TABLE server_nodes (
        id VARCHAR(50) PRIMARY KEY,
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL,
        is_leader BOOLEAN DEFAULT FALSE,
        is_alive BOOLEAN DEFAULT TRUE,
        load_factor DECIMAL(5,2) DEFAULT 0,
        last_heartbeat BIGINT NOT NULL,
        lamport_clock BIGINT DEFAULT 0,
        vector_clock JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nodes_leader (is_leader)
      )
    `);

    // Insert sample movies
    console.log('Inserting sample movies...');
    await connection.query(`
      INSERT INTO movies (id, title, description, duration, genre, rating, poster_url) VALUES
      ('movie-1', 'The Distributed Saga', 'A journey through consensus, clocks, and consistency.', 132, 
       JSON_ARRAY('Sci-Fi', 'Tech'), 8.7, 
       'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?q=80&w=1200&auto=format&fit=crop'),
      ('movie-2', 'Leader Election', 'Who will lead when nodes fail?', 109, 
       JSON_ARRAY('Thriller'), 7.9,
       'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop'),
      ('movie-3', 'Consensus Protocol', 'Agreement in the face of adversity', 145,
       JSON_ARRAY('Drama', 'Tech'), 8.5,
       'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop'),
      ('movie-4', 'Vector Clocks', 'Time is relative in distributed systems', 118,
       JSON_ARRAY('Sci-Fi'), 8.2,
       'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop')
    `);

    // Insert sample showtimes
    console.log('Inserting sample showtimes...');
    const now = new Date();
    const showtimes = [
      { id: 'showtime-1', movieId: 'movie-1', screen: 'Screen 1', price: 12.50, seats: 60, hours: 2 },
      { id: 'showtime-2', movieId: 'movie-1', screen: 'Screen 2', price: 14.00, seats: 45, hours: 5 },
      { id: 'showtime-3', movieId: 'movie-2', screen: 'Screen 1', price: 11.00, seats: 50, hours: 3 },
      { id: 'showtime-4', movieId: 'movie-3', screen: 'Screen 3', price: 13.50, seats: 55, hours: 4 },
      { id: 'showtime-5', movieId: 'movie-4', screen: 'Screen 2', price: 12.00, seats: 48, hours: 6 }
    ];

    for (const st of showtimes) {
      const startTime = new Date(now.getTime() + st.hours * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 132 * 60 * 1000);
      
      await connection.query(
        `INSERT INTO showtimes (id, movie_id, start_time, end_time, screen, price, available_seats) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [st.id, st.movieId, startTime, endTime, st.screen, st.price, st.seats]
      );
    }

    // Insert initial server nodes
    console.log('Inserting initial server nodes...');
    const nodes = [
      { id: 'node-1', port: 4000, isLeader: true },
      { id: 'node-2', port: 4001, isLeader: false },
      { id: 'node-3', port: 4002, isLeader: false }
    ];

    for (const node of nodes) {
      await connection.query(
        `INSERT INTO server_nodes (id, host, port, is_leader, is_alive, load_factor, last_heartbeat, lamport_clock, vector_clock)
         VALUES (?, 'localhost', ?, ?, TRUE, 0, ?, 0, JSON_OBJECT())`,
        [node.id, node.port, node.isLeader, Date.now()]
      );
    }

    console.log('Database initialization complete.');
    console.log('\nSummary:');
    console.log('  - 4 movies inserted');
    console.log('  - 5 showtimes inserted');
    console.log('  - 3 server nodes configured');
    console.log('\nReady to start the backend servers.');

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

initializeDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
