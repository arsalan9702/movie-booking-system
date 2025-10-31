"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load env from backend/.env then project root .env.local and .env
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '..', '.env.local') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '..', '.env') });
// Prefer MySQL by default if MYSQL_* present
if (!process.env.USE_MYSQL) {
    if (process.env.MYSQL_HOST || process.env.MYSQL_DB || process.env.MYSQL_PORT) {
        process.env.USE_MYSQL = 'true';
    }
}
if (!process.env.USE_IN_MEMORY) {
    process.env.USE_IN_MEMORY = 'false';
}
const config_1 = require("@/lib/db/config");
const node_manager_1 = require("@/lib/distributed/node-manager");
const movies_1 = __importDefault(require("./routes/movies"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const health_1 = __importDefault(require("./routes/health"));
const election_1 = __importDefault(require("./routes/election"));
const replicas_1 = __importDefault(require("./routes/replicas"));
const sync_1 = __importDefault(require("./routes/sync"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = parseInt(process.env.PORT || process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || process.env.NODE_PORT || '4000', 10);
const NODE_ID = process.env.NODE_ID || `node-${PORT}`;
const NODE_HOST = process.env.NODE_HOST || 'localhost';
const NODE_PORT = PORT;
console.log(`[backend] DB driver: ${process.env.USE_MYSQL === 'true' ? 'mysql' : (process.env.USE_IN_MEMORY === 'true' ? 'memory' : 'postgres')} (USE_MYSQL=${process.env.USE_MYSQL}, USE_IN_MEMORY=${process.env.USE_IN_MEMORY})`);
(0, config_1.initializeDatabase)().catch(console.error);
const nodeManager = new node_manager_1.NodeManager(NODE_ID, NODE_HOST, NODE_PORT);
nodeManager.initialize().catch(console.error);
app.set('nodeManager', nodeManager);
app.use('/movies', movies_1.default);
app.use('/bookings', bookings_1.default);
app.use('/health', health_1.default);
app.use('/election', election_1.default);
app.use('/replicas', replicas_1.default);
app.use('/sync', sync_1.default);
app.get('/', (_req, res) => {
    res.json({ status: 'ok', nodeId: NODE_ID, port: PORT, useMySQL: process.env.USE_MYSQL });
});
app.listen(PORT, () => {
    console.log(`[backend] listening on http://localhost:${PORT} as ${NODE_ID}`);
});
