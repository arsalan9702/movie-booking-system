# Complete Setup Guide - MovieBook Distributed System

## 🎯 Quick Start (5 Minutes)

### Step 1: Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Download from: https://www.postgresql.org/download/windows/

### Step 2: Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# In PostgreSQL shell, run:
CREATE DATABASE movie_booking;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE movie_booking TO postgres;
\q
```

### Step 3: Setup Project

```bash
# Create project directory
mkdir movie-booking-system
cd movie-booking-system

# Initialize Next.js project
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

# Install additional dependencies
npm install pg axios zustand date-fns lucide-react
npm install -D @types/pg
```

### Step 4: Create All Files

Create the following directory structure and files (copy from the artifacts I provided):

```
movie-booking-system/
├── app/
│   ├── api/
│   │   ├── movies/route.ts
│   │   ├── bookings/route.ts
│   │   ├── health/route.ts
│   │   ├── sync/route.ts
│   │   ├── election/route.ts
│   │   └── replicas/route.ts
│   ├── movies/[id]/page.tsx
│   ├── bookings/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── distributed/
│   │   ├── node-manager.ts
│   │   ├── clock-sync.ts
│   │   ├── replication.ts
│   │   └── load-balancer.ts
│   ├── algorithms/
│   │   ├── bully-election.ts
│   │   └── ring-election.ts
│   └── db/
│       ├── config.ts
│       └── queries.ts
├── components/
│   └── ui/
│       ├── movie-card.tsx
│       ├── seat-selector.tsx
│       └── system-monitor.tsx
├── types/
│   └── index.ts
├── scripts/
│   └── init-db.js
├── .env
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

### Step 5: Configure Environment

Create `.env` file:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=movie_booking
DB_USER=postgres
DB_PASSWORD=postgres

NODE_ID=node-1
NODE_HOST=localhost
NODE_PORT=3000
```

### Step 6: Initialize Database

```bash
node scripts/init-db.js
```

You should see:
```
🚀 Initializing database...
✅ Movies table created
✅ Showtimes table created
✅ Bookings table created
✅ Data replicas table created
✅ Server nodes table created
✅ Indexes created
🎬 Inserting sample movies...
✅ Sample movies inserted
🎫 Inserting sample showtimes...
✅ Sample showtimes inserted
🖥️  Inserting server nodes...
✅ Server nodes inserted
🎉 Database initialization complete!
```

### Step 7: Run the Application

```bash
npm run dev
```

Open http://localhost:3000

## 🔧 Detailed Configuration

### PostgreSQL Connection Issues

If you get connection errors:

1. **Check PostgreSQL is running:**
```bash
sudo systemctl status postgresql
```

2. **Check pg_hba.conf:**
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Add this line:
```
local   all             postgres                                trust
```

3. **Restart PostgreSQL:**
```bash
sudo systemctl restart postgresql
```

### Port Already in Use

If port 3000 is busy:
```bash
NODE_PORT=3001 npm run dev
```

## 🌐 Running Multiple Nodes

### Terminal 1 (Node 1 - Leader):
```bash
NODE_ID=node-1 NODE_PORT=3000 npm run dev
```

### Terminal 2 (Node 2):
```bash
NODE_ID=node-2 NODE_PORT=3001 npm run dev
```

### Terminal 3 (Node 3):
```bash
NODE_ID=node-3 NODE_PORT=3002 npm run dev
```

All nodes share the same database but run independently.

## 🎮 Testing the System

### Test 1: Browse Movies
1. Open http://localhost:3000
2. See 4 sample movies loaded
3. Click on any movie

### Test 2: Book Tickets
1. Select a movie
2. Choose a showtime
3. Select seats (click on available seats)
4. Click "Confirm Booking"
5. Note the distributed system info (processed by node, logical clock)

### Test 3: System Monitor
1. Click "📊 System Monitor" button
2. Explore 4 tabs:
   - **Health Check**: See all nodes, their status, load
   - **Clock Sync**: View Lamport & Vector clocks
   - **Leader Election**: See current leader, trigger elections
   - **Replication**: View data replication status

### Test 4: Leader Election
1. Open System Monitor
2. Go to "Leader Election" tab
3. Click "Trigger Bully Election"
4. Watch as a new leader is elected
5. Try "Trigger Ring Election"

### Test 5: Clock Synchronization
1. Create multiple bookings
2. Open System Monitor → Clock Sync
3. Watch Lamport clocks increment
4. Observe Vector clocks update

### Test 6: Data Replication
1. Create several bookings
2. Open System Monitor → Replication tab
3. See replica counts across nodes

## 📊 Database Queries for Testing

Connect to database:
```bash
sudo -u postgres psql movie_booking
```

### View All Movies:
```sql
SELECT id, title, rating FROM movies;
```

### View Recent Bookings:
```sql
SELECT 
  id, 
  user_id, 
  seats, 
  total_price, 
  processed_by, 
  logical_clock 
FROM bookings 
ORDER BY created_at DESC 
LIMIT 10;
```

### View Server Nodes:
```sql
SELECT 
  id, 
  is_leader, 
  is_alive, 
  load_factor, 
  lamport_clock 
FROM server_nodes;
```

### View Replicas:
```sql
SELECT 
  table_name, 
  COUNT(*) as replica_count,
  COUNT(DISTINCT node_id) as node_count
FROM data_replicas
GROUP BY table_name;
```

## 🐛 Troubleshooting

### Issue: "Cannot find module 'pg'"
```bash
npm install pg @types/pg
```

### Issue: Database connection timeout
Check your .env file has correct credentials:
```bash
cat .env
```

### Issue: Port already in use
Kill the process:
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: Tables not created
Drop and recreate database:
```sql
DROP DATABASE movie_booking;
CREATE DATABASE movie_booking;
```
Then run init-db.js again.

### Issue: No sample data showing
Re-run the initialization:
```bash
node scripts/init-db.js
```

## 🎓 Understanding the Architecture

### 1. Client-Server Flow
```
Client (Browser)
    ↓ HTTP Request
Next.js API Route (/api/bookings)
    ↓
Node Manager (Load Balancing)
    ↓
Clock Synchronization (Lamport/Vector)
    ↓
Database (PostgreSQL)
    ↓
Replication Manager
    ↓ Replicate to other nodes
Database Replicas
```

### 2. Leader Election Flow
```
Node Failure Detected
    ↓
Bully/Ring Election Triggered
    ↓
Nodes Exchange Messages
    ↓
New Leader Elected
    ↓
Update Database
```

### 3. Clock Synchronization
```
Event Occurs (Booking Created)
    ↓
Lamport Clock Ticks (counter++)
    ↓
Vector Clock Updates (all nodes)
    ↓
Timestamp Recorded in Database
```

## 🚀 Production Checklist

- [ ] Change database password
- [ ] Add authentication (JWT/OAuth)
- [ ] Implement rate limiting
- [ ] Add HTTPS
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure CI/CD pipeline
- [ ] Add error tracking (Sentry)
- [ ] Implement caching (Redis)
- [ ] Set up backup strategy
- [ ] Load test the system

## 📞 Need Help?

Common issues are usually:
1. PostgreSQL not running
2. Wrong database credentials
3. Port conflicts
4. Missing dependencies

Check logs in terminal for specific errors.

## 🎉 You're Done!

Your distributed movie booking system is now running with:
✅ Clock synchronization (Lamport & Vector)
✅ Leader election (Bully & Ring)
✅ Data replication (Master-Slave)
✅ Load balancing (Round-Robin, Least-Connections, Weighted)
✅ Real-time monitoring dashboard

Enjoy exploring distributed systems! 🚀

## Quickstart (No Database)

1. Create a `.env.local` in the project root:

```
USE_IN_MEMORY=true
NODE_ID=node-1
NODE_HOST=localhost
NODE_PORT=3000
```

2. Install and run:

```
npm install
npm run dev
```

You should see seeded movies on the home page and be able to browse `Bookings`.

---

## PostgreSQL Setup (Optional)

If you want to use a real database instead of in-memory:

1. Create `.env.local`:

```
USE_IN_MEMORY=false
DB_HOST=localhost
DB_PORT=5432
DB_NAME=movie_booking
DB_USER=postgres
DB_PASSWORD=postgres
NODE_ID=node-1
NODE_HOST=localhost
NODE_PORT=3000
```

2. Ensure PostgreSQL is running and accessible with the credentials above.

3. Initialize schema (automatically created on first server start) or run the helper script:

```
node scripts/init-db.js
```

4. Start the app:

```
npm run dev
```

### Notes
- In-memory mode seeds sample movies and showtimes on boot.
- API routes automatically switch between in-memory and Postgres based on `USE_IN_MEMORY`.
- No code changes are required to toggle; just change the env and restart.

## Separate Backend Service (Express)

Backend location: `backend/`

### Install
```bash
cd backend
npm install
```

### Run single instance (dev)
```bash
# in backend/
set PORT=4000 && set NODE_ID=node-1 && npm run dev
```

### Run multiple instances (prod-like)
```bash
# build once
cd backend && npm run build

# terminal 1
set PORT=4000 && set NODE_ID=node-1 && npm start
# terminal 2
set PORT=4001 && set NODE_ID=node-2 && npm start
# terminal 3
set PORT=4002 && set NODE_ID=node-3 && npm start
```

All instances share the same DB (MySQL env at project root). Each process initializes its `NodeManager`, heartbeats, and replication.

### Frontend → Backend
Set in project root `.env.local`:
```bash
NEXT_PUBLIC_API_BASE=http://localhost:4000
```
Restart the Next app so client code picks up the env.

### Test
- Open Next app (any port) and book seats; backend processes booking and writes replicas to `data_replicas`.
- Check health: `GET http://localhost:4000/health`
- Check clocks: `GET http://localhost:4000/health` (lamport/vector via DB state)
- Trigger elections:
```bash
curl -X POST http://localhost:4000/election -H "Content-Type: application/json" -d '{"algorithm":"bully"}'
```
- Replicas summary: `GET http://localhost:4000/replicas`