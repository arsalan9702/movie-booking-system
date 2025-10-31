import { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import mysql, { Pool as MySqlPool, PoolConnection as MySqlConnection } from 'mysql2/promise';

const USE_IN_MEMORY = process.env.USE_IN_MEMORY === 'true';
const USE_MYSQL = process.env.USE_MYSQL === 'true';

let pgPool: PgPool | null = null;
let mySqlPool: MySqlPool | null = null;

export function isMySQL(): boolean {
	return USE_MYSQL === true;
}

// Initialize pool based on env
if (!USE_IN_MEMORY) {
	if (USE_MYSQL) {
		mySqlPool = mysql.createPool({
			host: process.env.MYSQL_HOST || 'localhost',
			port: parseInt(process.env.MYSQL_PORT || '3306'),
			database: process.env.MYSQL_DB || 'movie_booking',
			user: process.env.MYSQL_USER || 'root',
			password: process.env.MYSQL_PASSWORD || 'password',
			connectionLimit: 20,
			connectTimeout: 20000,
			waitForConnections: true,
		});
	} else {
		const dbConfig = {
			host: process.env.DB_HOST || 'localhost',
			port: parseInt(process.env.DB_PORT || '5432'),
			database: process.env.DB_NAME || 'movie_booking',
			user: process.env.DB_USER || 'postgres',
			password: process.env.DB_PASSWORD || 'postgres',
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		};
		pgPool = new PgPool(dbConfig);
		pgPool.on('error', (err) => {
			console.error('Unexpected error on idle client', err);
			process.exit(-1);
		});
	}
}

function transformPgLikePlaceholders(sql: string, params?: any[]): { sql: string; params?: any[] } {
	if (!USE_MYSQL) return { sql, params };
	// Replace $1, $2 ... with ? and keep params order
	const transformed = sql.replace(/\$([0-9]+)/g, '?');
	return { sql: transformed, params };
}

export async function query(text: string, params?: any[]): Promise<any> {
	if (USE_IN_MEMORY) {
		throw new Error('query() called in in-memory mode');
	}
	if (USE_MYSQL) {
		if (!mySqlPool) throw new Error('MySQL pool not initialized');
		const { sql, params: p } = transformPgLikePlaceholders(text, params);
		const start = Date.now();
		const [rows] = await mySqlPool.query(sql, p);
		const duration = Date.now() - start;
		console.log('Executed query (mysql)', { sql, duration, rows: Array.isArray(rows) ? rows.length : 0 });
		return { rows };
	}
	if (!pgPool) throw new Error('Postgres pool not initialized');
	const start = Date.now();
	const res = await pgPool.query(text, params);
	const duration = Date.now() - start;
	console.log('Executed query (pg)', { text, duration, rows: res.rowCount });
	return res;
}

export async function getClient(): Promise<PgPoolClient | MySqlConnection> {
	if (USE_IN_MEMORY) throw new Error('getClient() called in in-memory mode');
	if (USE_MYSQL) {
		if (!mySqlPool) throw new Error('MySQL pool not initialized');
		return await mySqlPool.getConnection();
	}
	if (!pgPool) throw new Error('Postgres pool not initialized');
	return await pgPool.connect();
}

export async function transaction<T>(
	callback: (client: any) => Promise<T>
): Promise<T> {
	if (USE_IN_MEMORY) throw new Error('transaction() called in in-memory mode');
	if (USE_MYSQL) {
		if (!mySqlPool) throw new Error('MySQL pool not initialized');
		const conn = await mySqlPool.getConnection();
		try {
			await conn.beginTransaction();
			const result = await callback({
				query: async (sql: string, p?: any[]) => {
					const { sql: s, params } = transformPgLikePlaceholders(sql, p);
					const [rows] = await conn.query(s, params);
					return { rows };
				},
			});
			await conn.commit();
			return result;
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			conn.release();
		}
	}
	const client = await getClient();
	try {
		await (client as PgPoolClient).query('BEGIN');
		const result = await callback(client);
		await (client as PgPoolClient).query('COMMIT');
		return result;
	} catch (error) {
		await (client as PgPoolClient).query('ROLLBACK');
		throw error;
	} finally {
		(client as PgPoolClient).release();
	}
}

export async function initializeDatabase(): Promise<void> {
	if (USE_IN_MEMORY) return;
	if (USE_MYSQL) {
		if (!mySqlPool) throw new Error('MySQL pool not initialized');
		const conn = await mySqlPool.getConnection();
		try {
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
		} finally {
			conn.release();
		}
		return;
	}
	// Postgres fallback
	const client = await getClient();
	try {
		await (client as PgPoolClient).query(`
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
		await (client as PgPoolClient).query(`
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
		await (client as PgPoolClient).query(`
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
		await (client as PgPoolClient).query(`
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
		await (client as PgPoolClient).query(`
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
		await (client as PgPoolClient).query('CREATE INDEX IF NOT EXISTS idx_showtimes_movie ON showtimes(movie_id)');
		await (client as PgPoolClient).query('CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)');
		await (client as PgPoolClient).query('CREATE INDEX IF NOT EXISTS idx_bookings_showtime ON bookings(showtime_id)');
		await (client as PgPoolClient).query('CREATE INDEX IF NOT EXISTS idx_replicas_record ON data_replicas(table_name, record_id)');
		await (client as PgPoolClient).query('CREATE INDEX IF NOT EXISTS idx_nodes_leader ON server_nodes(is_leader)');
	} finally {
		(client as PgPoolClient).release();
	}
}

export async function closePool(): Promise<void> {
	if (pgPool) {
		await pgPool.end();
		pgPool = null;
	}
	if (mySqlPool) {
		await mySqlPool.end();
		mySqlPool = null;
	}
}

export default ((pgPool || mySqlPool) as unknown as PgPool);