const mysql = require('mysql2/promise');

async function main() {
	const pool = await mysql.createPool({
		host: process.env.MYSQL_HOST || 'localhost',
		port: parseInt(process.env.MYSQL_PORT || '3306'),
		database: process.env.MYSQL_DB || 'movie_booking',
		user: process.env.MYSQL_USER || 'root',
		password: process.env.MYSQL_PASSWORD || 'password',
		waitForConnections: true,
		connectionLimit: 10,
	});
	const conn = await pool.getConnection();
	try {
		console.log('🚀 Initializing MySQL database...');
		await conn.query(`CREATE TABLE IF NOT EXISTS movies (
			id VARCHAR(50) PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			description TEXT,
			duration INT NOT NULL,
			genre JSON,
			rating DECIMAL(3,1),
			poster_url TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`);

		await conn.query(`CREATE TABLE IF NOT EXISTS showtimes (
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
		)`);

		await conn.query(`CREATE TABLE IF NOT EXISTS bookings (
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
		)`);

		await conn.query(`CREATE TABLE IF NOT EXISTS data_replicas (
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
		)`);

		await conn.query(`CREATE TABLE IF NOT EXISTS server_nodes (
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
		)`);

		console.log('🎬 Inserting sample movies...');
		const movies = [
			{ id: 'movie-1', title: 'The Distributed Adventure', description: 'Epic journey through distributed systems.', duration: 142, genre: ['Action','Sci-Fi','Thriller'], rating: 8.5, poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400' },
			{ id: 'movie-2', title: 'Clock Synchronization', description: 'Time and causality across the cosmos.', duration: 128, genre: ['Sci-Fi','Drama'], rating: 9.0, poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400' },
			{ id: 'movie-3', title: 'Leader Election', description: 'Battle to become coordinator.', duration: 115, genre: ['Action','Drama'], rating: 8.2, poster_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400' },
			{ id: 'movie-4', title: 'Replication Wars', description: 'Which replication strategy prevails?', duration: 135, genre: ['Action','Adventure'], rating: 8.7, poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400' },
			{ id: 'movie-5', title: 'Eventual Consistency', description: 'Converge… eventually.', duration: 102, genre: ['Drama'], rating: 7.8, poster_url: 'https://images.unsplash.com/photo-1497032205916-ac775f0649ae?w=400' },
			{ id: 'movie-6', title: 'Causal Clocks', description: 'Happens-before, happens-after.', duration: 119, genre: ['Mystery','Sci-Fi'], rating: 8.1, poster_url: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400' },
			{ id: 'movie-7', title: 'Sharded', description: 'Split and conquer.', duration: 111, genre: ['Action'], rating: 7.9, poster_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400' },
			{ id: 'movie-8', title: 'Failover', description: 'When leaders fall.', duration: 123, genre: ['Thriller'], rating: 8.3, poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400' },
		];
		for (const m of movies) {
			await conn.query(
				`INSERT INTO movies (id, title, description, duration, genre, rating, poster_url)
				 VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?)
				 ON DUPLICATE KEY UPDATE title=VALUES(title)`,
				[m.id, m.title, m.description, m.duration, JSON.stringify(m.genre), m.rating, m.poster_url]
			);
		}

		console.log('🎫 Inserting sample showtimes...');
		const now = new Date();
		for (const m of movies) {
			for (let j = 0; j < 3; j++) {
				const start = new Date(now.getTime() + (j * 3 + Math.random() * 2) * 3600000);
				const end = new Date(start.getTime() + m.duration * 60000);
				await conn.query(
					`INSERT INTO showtimes (id, movie_id, start_time, end_time, screen, price, available_seats)
					 VALUES (?, ?, ?, ?, ?, ?, ?)
					 ON DUPLICATE KEY UPDATE price=VALUES(price)`,
					[`showtime-${m.id}-${j}`, m.id, start, end, `Screen ${(j % 4) + 1}`, 11 + j * 1.5, 60 - Math.floor(Math.random() * 20)]
				);
			}
		}

		console.log('✅ MySQL initialization complete');
	} catch (e) {
		console.error('❌ Error initializing MySQL:', e);
		process.exit(1);
	} finally {
		conn.release();
		await (await mysql.createPool({})).end().catch(() => {});
	}
}

main().catch(console.error);

