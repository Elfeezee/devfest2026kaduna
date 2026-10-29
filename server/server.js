const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);

// CORS configuration supporting both local and all deployed domains (Firebase, Render, etc.)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// High-performance Socket.IO configuration engineered for 1,000+ simultaneous connections
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling'],
  // Disable compression on individual messages to minimize CPU usage during high concurrency
  perMessageDeflate: false,
  maxHttpBufferSize: 1e6 // 1MB
});

const gameManager = new GameManager(io);

// REST API Health & Monitoring Endpoint
app.get('/api/health', (req, res) => {
  const memory = process.memoryUsage();
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    activeRooms: gameManager.rooms.size,
    totalConnectedSockets: io.engine.clientsCount,
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024)
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/quizzes', (req, res) => {
  res.json(gameManager.getQuizzes());
});

app.post('/api/quizzes', (req, res) => {
  try {
    const saved = gameManager.saveQuiz(req.body);
    res.json({ success: true, quiz: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve static frontend build
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));

// WebSockets Management
io.on('connection', (socket) => {
  // HOST PRIVILEGED EVENTS
  socket.on('host:create-game', ({ quizId }) => {
    try {
      const { room, hostToken } = gameManager.createRoom(socket, quizId);
      socket.emit('host:game-created', {
        pin: room.pin,
        hostToken, // secure token stored in host state
        quiz: {
          id: room.quiz.id,
          title: room.quiz.title,
          description: room.quiz.description,
          totalQuestions: room.quiz.questions.length
        }
      });
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('host:next-question', ({ pin, hostToken }) => {
    if (hostToken && !gameManager.validateHost(pin, hostToken)) {
      return socket.emit('error', { message: 'Unauthorized host action' });
    }
    const room = gameManager.rooms.get(pin);
    if (!room) return;

    gameManager.startNextQuestion(pin);

    // Auto-trigger simulated bots if present
    setTimeout(() => {
      gameManager.triggerBotAnswers(pin);
    }, 2800);
  });

  socket.on('host:show-leaderboard', ({ pin, hostToken }) => {
    if (hostToken && !gameManager.validateHost(pin, hostToken)) {
      return socket.emit('error', { message: 'Unauthorized host action' });
    }
    gameManager.showLeaderboard(pin);
  });

  socket.on('host:kick-player', ({ pin, hostToken, playerId }, callback) => {
    const result = gameManager.kickPlayer(pin, hostToken, playerId);
    if (typeof callback === 'function') callback(result);
  });

  socket.on('host:simulate-bots', ({ pin, hostToken, count }) => {
    const result = gameManager.simulateBots(pin, count || 100);
    socket.emit('host:bots-simulated', result);
  });

  // PLAYER PARTICIPANT EVENTS
  socket.on('player:join', ({ pin, nickname, avatar, existingPlayerId }, callback) => {
    const result = gameManager.joinRoom(socket, pin, nickname, avatar, existingPlayerId);
    if (typeof callback === 'function') {
      callback(result);
    } else {
      socket.emit('player:join-response', result);
    }
  });

  socket.on('player:submit-answer', ({ answerIndex }, callback) => {
    const result = gameManager.submitAnswer(socket.id, answerIndex);
    if (typeof callback === 'function') {
      callback(result);
    }
  });

  socket.on('player:reaction', ({ emoji }) => {
    gameManager.handleReaction(socket.id, emoji);
  });

  socket.on('disconnect', () => {
    gameManager.handleDisconnect(socket.id);
  });
});

// Single Page Application routing fallback
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send('DevFest 2026 Quiz Server is running. Client build will be served here once generated.');
    }
  });
});

// Graceful process exit
const shutdown = () => {
  console.log('[Server] Gracefully shutting down...');
  server.close(() => {
    console.log('[Server] Closed out remaining connections.');
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`⚡ DevFest 2026 Quiz Server listening on http://0.0.0.0:${PORT}`);
  console.log(`Ready for 1,000+ concurrent live participants!`);
  console.log(`=======================================================`);
});
