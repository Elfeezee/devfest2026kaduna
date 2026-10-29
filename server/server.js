const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);

// CORS configuration for both local dev and production cloud deployment
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  // High-performance settings for 1000+ concurrent connections
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

const gameManager = new GameManager(io);

// REST APIs
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeRooms: gameManager.rooms.size,
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

// Serve static frontend build if it exists
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));

// WebSockets
io.on('connection', (socket) => {
  // HOST EVENTS
  socket.on('host:create-game', ({ quizId }) => {
    try {
      const room = gameManager.createRoom(socket, quizId);
      socket.emit('host:game-created', {
        pin: room.pin,
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

  socket.on('host:next-question', ({ pin }) => {
    const room = gameManager.rooms.get(pin);
    if (!room) return;
    gameManager.startNextQuestion(pin);

    // If bots are present, auto-trigger their responses for the new question
    setTimeout(() => {
      gameManager.triggerBotAnswers(pin);
    }, 2800);
  });

  socket.on('host:show-leaderboard', ({ pin }) => {
    gameManager.showLeaderboard(pin);
  });

  socket.on('host:simulate-bots', ({ pin, count }) => {
    const result = gameManager.simulateBots(pin, count || 100);
    socket.emit('host:bots-simulated', result);
  });

  // PLAYER EVENTS
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

  socket.on('disconnect', () => {
    gameManager.handleDisconnect(socket.id);
  });
});

// Fallback to React index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send('DevFest 2026 Quiz Server is running. Client build will be served here once generated.');
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🚀 DevFest 2026 Quiz Server listening on http://0.0.0.0:${PORT}`);
  console.log(`Ready for 1,000+ concurrent players!`);
  console.log(`===============================================`);
});
