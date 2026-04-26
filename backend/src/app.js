const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
require('./services/telegram');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('io', io);

// Routes (TANPA E-MONEY)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/siswa', require('./routes/siswa'));
app.use('/api/absensi', require('./routes/absensi'));
app.use('/api/nilai', require('./routes/nilai'));
app.use('/api/asrama', require('./routes/asrama'));
app.use('/api/kesehatan', require('./routes/kesehatan'));
app.use('/api/perlengkapan', require('./routes/perlengkapan'));
app.use('/api/pengumuman', require('./routes/pengumuman'));
app.use('/api/laporan', require('./routes/laporan'));
app.use('/api/bakat-minat', require('./routes/bakatMinat'));

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    pesan: 'Server SRT 48 Pasuruan Berjalan ✅',
    waktu: new Date().toLocaleString('id-ID')
  });
});

io.on('connection', (socket) => {
  console.log('Client terhubung:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client terputus:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('================================');
  console.log('🏫 SRT 48 PASURUAN');
  console.log(`🚀 Server berjalan port ${PORT}`);
  console.log('================================');
});
