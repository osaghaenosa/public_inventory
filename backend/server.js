const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
const missing = requiredEnv.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('❌ Missing env vars:', missing.join(', '));
  process.exit(1);
}

console.log('✓ Environment loaded');
console.log('  MONGO_URI:', process.env.MONGO_URI);

// Routes
const saasAuthRoutes  = require('./routes/saas-auth');
const tableRoutes     = require('./routes/tables');
const activityRoutes  = require('./routes/activity');
const usersRoutes     = require('./routes/saas-users');
const aiRoutes        = require('./routes/ai');
const dynamicTableRoutes = require('./routes/dynamic-tables');
const receiptsRoutes  = require('./routes/receipts');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST','PUT','DELETE'] }
});

app.set('io', io);
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/saas',     saasAuthRoutes);
app.use('/api/tables',   tableRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/users',    usersRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/dynamic-tables', dynamicTableRoutes);
app.use('/api/receipts', receiptsRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: err.message });
});

io.on('connection', socket => {
  socket.on('join-company', ({ companyId, databaseId }) => {
    socket.join(`company-${companyId}-${databaseId}`);
  });
  socket.on('join-admin', () => socket.join('admin-room'));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✓ Connected to MongoDB');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`✓ InventoryOS SaaS running on http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });
