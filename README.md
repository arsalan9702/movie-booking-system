# 🎬 MovieBook - Distributed Movie Ticket Booking System

An industry-grade distributed system implementation featuring clock synchronization, leader election algorithms, data replication, and load balancing.

## 🌟 Features

### Distributed Systems Implementations

1. **Client-Server Communication**
   - RESTful API architecture
   - Asynchronous request handling
   - Connection pooling with PostgreSQL

2. **Multithreading in Distributed System**
   - Node.js event loop for concurrent request handling
   - Database connection pooling (20 connections)
   - Async/await patterns for non-blocking operations

3. **Clock Synchronization**
   - **Lamport Logical Clocks**: Ensures causal ordering of events
   - **Vector Clocks**: Detects concurrent events and maintains causality
   - **Berkeley Algorithm**: Physical clock synchronization simulation

4. **Leader Election Algorithms**
   - **Bully Algorithm**: Higher ID nodes become leaders
   - **Ring Algorithm**: Token-based election in logical ring

5. **Data Consistency & Replication**
   - Master-Slave replication
   - Multi-Master replication
   - Peer-to-Peer gossip protocol
   - Consistency models:
     - Strong Consistency (quorum-based)
     - Eventual Consistency
     - Causal Consistency (vector clock based)
   - Conflict resolution (Last-Write-Wins)

6. **Load Balancing Algorithms**
   - Round Robin
   - Least Connections
   - Weighted Round Robin (load-based)

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Node 1     │────▶│   Node 2     │────▶│   Node 3     │
│  (Leader)    │◀────│              │◀────│              │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       └────────────────────┴─────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   PostgreSQL   │
                    │   Database     │
                    └────────────────┘
```

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd movie-booking-system

# Install dependencies
npm install
```

### Step 2: Database Setup

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE DATABASE movie_booking;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE movie_booking TO postgres;
\q
```

### Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your database credentials
nano .env
```

### Step 4: Initialize Database

```bash
# Run database initialization script
npm run db:init
```

This will:
- Create all necessary tables
- Set up indexes
- Insert sample movies and showtimes
- Configure initial server nodes

### Step 5: Run the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## 🚀 Running Multiple Nodes

To simulate a distributed system, run multiple instances:

### Terminal 1 (Node 1 - Leader)
```bash
NODE_ID=node-1 NODE_PORT=3000 npm run dev
```

### Terminal 2 (Node 2)
```bash
NODE_ID=node-2 NODE_PORT=3001 npm run dev
```

### Terminal 3 (Node 3)
```bash
NODE_ID=node-3 NODE_PORT=3002 npm run dev
```

## 📁 Project Structure

```
movie-booking-system/
├── app/
│   ├── api/
│   │   ├── movies/route.ts          # Movie CRUD operations
│   │   ├── bookings/route.ts        # Booking with distributed handling
│   │   ├── health/route.ts          # Health check endpoint
│   │   ├── sync/route.ts            # Clock synchronization
│   │   ├── election/route.ts        # Leader election triggers
│   │   └── replicas/route.ts        # Replication status
│   ├── movies/[id]/page.tsx         # Movie details & booking
│   ├── bookings/page.tsx            # User bookings
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Home page
│   └── globals.css                  # Global styles
├── lib/
│   ├── distributed/
│   │   ├── node-manager.ts          # Coordinates all components
│   │   ├── clock-sync.ts            # Clock synchronization
│   │   ├── replication.ts           # Data replication
│   │   └── load-balancer.ts         # Load balancing
│   ├── algorithms/
│   │   ├── bully-election.ts        # Bully algorithm
│   │   └── ring-election.ts         # Ring algorithm
│   ├── db/
│   │   ├── config.ts                # PostgreSQL configuration
│   │   └── queries.ts               # Database queries
│   └── store/
│       └── booking-store.ts         # Client state management
├── components/
│   ├── ui/
│   │   ├── movie-card.tsx           # Movie card component
│   │   ├── seat-selector.tsx        # Seat selection UI
│   │   └── system-monitor.tsx       # Real-time system monitor
│   └── booking/
│       └── booking-flow.tsx         # Booking workflow
├── types/
│   └── index.ts                     # TypeScript types
├── scripts/
│   └── init-db.js                   # Database initialization
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 🎯 Key Features Explained

### 1. Clock Synchronization

**Lamport Clocks** maintain causality:
```typescript
// On local event
clock.tick(); // counter++

// On receiving message
clock.update(receivedTimestamp); // max(local, received) + 1
```

**Vector Clocks** detect concurrency:
```typescript
// Each node maintains clock for all nodes
vectorClock = { node1: 5, node2: 3, node3: 7 }

// Can determine if events are concurrent or causally related
```

### 2. Leader Election

**Bully Algorithm**:
1. Node detects leader failure
2. Sends ELECTION to higher ID nodes
3. If no response, declares itself leader
4. Announces to lower ID nodes

**Ring Algorithm**:
1. Token circulates in logical ring
2. Each node adds its ID
3. Highest ID becomes leader

### 3. Data Replication

**Master-Slave**:
- Master handles all writes
- Slaves replicate asynchronously
- Read from any node

**Multi-Master**:
- Multiple nodes accept writes
- Quorum-based consistency
- Conflict resolution needed

### 4. Load Balancing

**Round Robin**: Distribute evenly across nodes
**Least Connections**: Route to least busy node
**Weighted**: Consider node load factor

## 🔧 API Endpoints

### Movies
- `GET /api/movies` - Get all movies
- `GET /api/movies?id={id}` - Get movie by ID
- `POST /api/movies` - Create movie

### Bookings
- `GET /api/bookings?userId={id}` - Get user bookings
- `POST /api/bookings` - Create booking (distributed)

### System Monitoring
- `GET /api/health` - Health check all nodes
- `GET /api/sync` - Clock synchronization status
- `GET /api/election` - Leader election status
- `POST /api/election` - Trigger election
- `GET /api/replicas` - Replication status

## 🎨 User Interface

### System Monitor
Access real-time distributed system metrics:
- **Health Check**: Node status, load, heartbeats
- **Clock Sync**: Lamport & vector clocks across nodes
- **Leader Election**: Current leader, trigger elections
- **Replication**: Data replica counts and distribution

### Booking Flow
1. Browse movies
2. Select showtime
3. Choose seats (visual seat map)
4. Confirm booking
5. See distributed system info (node processed, logical clock)

## 🧪 Testing Distributed Features

### Test Clock Synchronization
1. Open System Monitor
2. Navigate to Clock Sync tab
3. Observe Lamport and Vector clocks
4. Create bookings and watch clocks increment

### Test Leader Election
1. Open System Monitor
2. Go to Leader Election tab
3. Click "Trigger Bully Election" or "Trigger Ring Election"
4. Watch leader change

### Test Data Replication
1. Create multiple bookings
2. Check Replication tab in System Monitor
3. Query `/api/replicas` to see replica distribution

### Test Load Balancing
1. Run multiple nodes
2. Create bookings rapidly
3. Check which nodes process requests
4. Observe load distribution in Health Check

## 📊 Database Schema

### Core Tables
- `movies`: Movie information
- `showtimes`: Available showtimes
- `bookings`: Booking records with distributed metadata
- `server_nodes`: Cluster node information
- `data_replicas`: Replicated data across nodes

### Distributed Metadata
Each booking includes:
- `logical_clock`: Lamport clock value
- `vector_clock`: Vector clock snapshot
- `processed_by`: Node that handled request
- `timestamp`: Physical timestamp

## 🔐 Security Considerations

- Use environment variables for sensitive data
- Implement authentication (not included in this demo)
- Add rate limiting for API endpoints
- Use HTTPS in production
- Sanitize user inputs
- Implement proper authorization

## 🚀 Production Deployment

1. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
2. **Application**: Deploy on Kubernetes for auto-scaling
3. **Load Balancer**: Use external load balancer (NGINX, AWS ALB)
4. **Monitoring**: Add Prometheus + Grafana
5. **Logging**: Centralized logging (ELK stack)
6. **CI/CD**: GitHub Actions or GitLab CI

## 📝 License

MIT License

## 👨‍💻 Author

Built with ❤️ for learning distributed systems

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 📚 Further Reading

- Distributed Systems by Tanenbaum
- Designing Data-Intensive Applications by Martin Kleppmann
- Time, Clocks, and the Ordering of Events in a Distributed System by Leslie Lamport

---

**Happy Distributed Computing!** 🚀