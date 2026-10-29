const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load default quizzes
const quizzesFilePath = path.join(__dirname, 'data', 'quizzes.json');
let quizzes = [];
try {
  const data = fs.readFileSync(quizzesFilePath, 'utf8');
  quizzes = JSON.parse(data);
} catch (e) {
  console.error('Error loading default quizzes:', e);
}

// Basic profane words filter for live stage safety
const BLOCKED_WORDS = ['admin', 'root', 'moderator', 'system', 'f**k', 'shit', 'bitch', 'asshole', 'nigger', 'porn', 'sex'];

class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // pin -> roomObject
    this.playerToRoom = new Map(); // socket.id -> { pin, playerId, isHost }
  }

  getQuizzes() {
    return quizzes;
  }

  saveQuiz(quiz) {
    if (!quiz.id) quiz.id = uuidv4();
    const existingIndex = quizzes.findIndex(q => q.id === quiz.id);
    if (existingIndex >= 0) {
      quizzes[existingIndex] = quiz;
    } else {
      quizzes.push(quiz);
    }
    try {
      fs.writeFileSync(quizzesFilePath, JSON.stringify(quizzes, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save quiz to disk:', err);
    }
    return quiz;
  }

  generatePin() {
    let pin;
    do {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(pin));
    return pin;
  }

  sanitizeNickname(name) {
    if (!name || typeof name !== 'string') return 'Dev_' + Math.floor(100 + Math.random() * 900);
    // Strip HTML and special control characters
    let clean = name.replace(/[<>'"/\\&`]/g, '').trim().slice(0, 20);
    if (clean.length === 0) clean = 'Dev_' + Math.floor(100 + Math.random() * 900);

    const lower = clean.toLowerCase();
    for (const bad of BLOCKED_WORDS) {
      if (lower.includes(bad)) {
        return 'CoolDev_' + Math.floor(100 + Math.random() * 900);
      }
    }
    return clean;
  }

  createRoom(hostSocket, quizId) {
    const quiz = quizzes.find(q => q.id === quizId) || quizzes[0];
    if (!quiz) throw new Error('Quiz not found');

    const pin = this.generatePin();
    const hostToken = uuidv4(); // Secure token required for privileged host actions

    const room = {
      pin,
      hostToken,
      hostSocketId: hostSocket.id,
      quiz: JSON.parse(JSON.stringify(quiz)), // clone
      currentQuestionIndex: -1,
      state: 'LOBBY', // LOBBY, INTRO, QUESTION, RESULTS, LEADERBOARD, PODIUM
      players: new Map(), // playerId -> player
      socketToPlayerId: new Map(), // socketId -> playerId
      answerTally: [0, 0, 0, 0],
      totalAnswered: 0,
      questionStartTime: 0,
      questionDuration: 0,
      questionTimer: null,
      tallyBatchTimer: null,
      leaderboardCache: []
    };

    this.rooms.set(pin, room);
    this.playerToRoom.set(hostSocket.id, { pin, isHost: true });
    hostSocket.join(`room:${pin}`);
    hostSocket.join(`host:${pin}`);

    console.log(`[GameManager] Created room ${pin} with quiz: "${quiz.title}"`);
    return { room, hostToken };
  }

  validateHost(pin, hostToken) {
    const room = this.rooms.get(pin);
    if (!room) return false;
    return room.hostToken === hostToken;
  }

  joinRoom(playerSocket, pin, nickname, avatar = '🚀', existingPlayerId = null) {
    const room = this.rooms.get(pin);
    if (!room) {
      return { success: false, error: 'Game PIN not found. Please verify the 6-digit code on the main screen.' };
    }

    let player;
    let playerId = existingPlayerId;

    if (existingPlayerId && room.players.has(existingPlayerId)) {
      // Reconnection: restore previous session!
      player = room.players.get(existingPlayerId);
      const oldSocketId = player.socketId;
      if (oldSocketId) {
        room.socketToPlayerId.delete(oldSocketId);
        this.playerToRoom.delete(oldSocketId);
      }
      player.socketId = playerSocket.id;
      player.connected = true;
      room.socketToPlayerId.set(playerSocket.id, playerId);
      console.log(`[GameManager] Player "${player.nickname}" reconnected to ${pin}`);
    } else {
      if (room.state !== 'LOBBY') {
        return { success: false, error: 'Showdown has already started. Spectating current round.' };
      }

      playerId = uuidv4();
      const cleanNickname = this.sanitizeNickname(nickname);

      player = {
        id: playerId,
        socketId: playerSocket.id,
        nickname: cleanNickname,
        avatar: avatar || '⚡',
        score: 0,
        streak: 0,
        currentAnswer: null, // index
        answerTimeMs: 0,
        isCorrect: false,
        pointsAwarded: 0,
        connected: true,
        rank: 0
      };

      room.players.set(playerId, player);
      room.socketToPlayerId.set(playerSocket.id, playerId);
    }

    this.playerToRoom.set(playerSocket.id, { pin, playerId, isHost: false });
    playerSocket.join(`room:${pin}`);
    playerSocket.join(`player:${playerId}`);

    // Notify host with updated player count and sample recent players
    this.broadcastLobbyUpdate(room);

    // If player reconnected mid-question, give them current question details
    let currentQuestionPayload = null;
    if (room.state === 'QUESTION') {
      const q = room.quiz.questions[room.currentQuestionIndex];
      const remainingMs = Math.max(0, room.questionDuration - (Date.now() - room.questionStartTime));
      currentQuestionPayload = {
        questionNumber: room.currentQuestionIndex + 1,
        totalQuestions: room.quiz.questions.length,
        optionsCount: q.options.length,
        options: q.options,
        question: q.question,
        codeSnippet: q.codeSnippet || null,
        timeLimit: Math.ceil(remainingMs / 1000),
        durationMs: remainingMs,
        serverStartTime: room.questionStartTime,
        hasAnswered: player.currentAnswer !== null,
        selectedAnswer: player.currentAnswer
      };
    }

    return {
      success: true,
      pin,
      playerId,
      nickname: player.nickname,
      avatar: player.avatar,
      score: player.score,
      state: room.state,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.quiz.questions.length,
      currentQuestion: currentQuestionPayload
    };
  }

  kickPlayer(pin, hostToken, playerId) {
    if (!this.validateHost(pin, hostToken)) return { success: false, error: 'Unauthorized host' };
    const room = this.rooms.get(pin);
    if (!room) return { success: false, error: 'Room not found' };

    const player = room.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    if (player.socketId) {
      this.io.to(player.socketId).emit('player:kicked', { reason: 'Removed by host' });
      room.socketToPlayerId.delete(player.socketId);
      this.playerToRoom.delete(player.socketId);
    }
    room.players.delete(playerId);
    this.broadcastLobbyUpdate(room);

    return { success: true };
  }

  broadcastLobbyUpdate(room) {
    const playerCount = room.players.size;
    // Send top 50 recent players for UI display + exact total count
    const recentPlayers = Array.from(room.players.values())
      .slice(-50)
      .map(p => ({ id: p.id, nickname: p.nickname, avatar: p.avatar }));

    this.io.to(`host:${room.pin}`).emit('host:lobby-update', {
      playerCount,
      recentPlayers
    });

    this.io.to(`room:${room.pin}`).emit('game:player-count', { playerCount });
  }

  startNextQuestion(roomPin) {
    const room = this.rooms.get(roomPin);
    if (!room) return;

    room.currentQuestionIndex++;
    if (room.currentQuestionIndex >= room.quiz.questions.length) {
      this.triggerPodium(room);
      return;
    }

    const question = room.quiz.questions[room.currentQuestionIndex];
    room.state = 'INTRO';
    room.answerTally = [0, 0, 0, 0];
    room.totalAnswered = 0;

    // Reset player answer states
    for (const player of room.players.values()) {
      player.currentAnswer = null;
      player.answerTimeMs = 0;
      player.isCorrect = false;
      player.pointsAwarded = 0;
    }

    // Step 1: Send 3-second INTRO
    const introPayload = {
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: room.quiz.questions.length,
      category: question.category || 'Tech Trivia',
      timeLimit: question.timeLimit || 20
    };

    this.io.to(`room:${room.pin}`).emit('game:question-intro', introPayload);

    setTimeout(() => {
      if (!this.rooms.has(room.pin)) return;
      this.activateQuestion(room, question);
    }, 2800);
  }

  activateQuestion(room, question) {
    room.state = 'QUESTION';
    room.questionStartTime = Date.now();
    room.questionDuration = (question.timeLimit || 20) * 1000;

    // Host receives full question + options + code snippet
    this.io.to(`host:${room.pin}`).emit('host:question-active', {
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: room.quiz.questions.length,
      question: question.question,
      options: question.options,
      codeSnippet: question.codeSnippet || null,
      category: question.category || 'Tech',
      timeLimit: question.timeLimit || 20,
      totalPlayers: room.players.size,
      durationMs: room.questionDuration,
      serverStartTime: room.questionStartTime
    });

    // Players receive question number, options, code snippet and timer
    this.io.to(`room:${room.pin}`).emit('player:question-active', {
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: room.quiz.questions.length,
      optionsCount: question.options.length,
      options: question.options,
      question: question.question,
      codeSnippet: question.codeSnippet || null,
      timeLimit: question.timeLimit || 20,
      durationMs: room.questionDuration,
      serverStartTime: room.questionStartTime
    });

    // Automatic timeout timer
    clearTimeout(room.questionTimer);
    room.questionTimer = setTimeout(() => {
      if (room.state === 'QUESTION') {
        this.endQuestion(room);
      }
    }, room.questionDuration + 300);

    // Periodic batch tally updates to host (every 200ms)
    this.startTallyBatcher(room);
  }

  startTallyBatcher(room) {
    clearInterval(room.tallyBatchTimer);
    room.tallyBatchTimer = setInterval(() => {
      if (room.state !== 'QUESTION') {
        clearInterval(room.tallyBatchTimer);
        return;
      }
      this.io.to(`host:${room.pin}`).emit('host:tally-update', {
        answerTally: room.answerTally,
        totalAnswered: room.totalAnswered,
        totalPlayers: room.players.size
      });
    }, 200);
  }

  submitAnswer(socketId, answerIndex) {
    const meta = this.playerToRoom.get(socketId);
    if (!meta || meta.isHost) return { success: false, error: 'Invalid participant' };

    const room = this.rooms.get(meta.pin);
    if (!room || room.state !== 'QUESTION') return { success: false, error: 'Question closed' };

    const player = room.players.get(meta.playerId);
    if (!player || player.currentAnswer !== null) return { success: false, error: 'Already answered' };

    const question = room.quiz.questions[room.currentQuestionIndex];
    const timeTaken = Math.max(0, Math.min(Date.now() - room.questionStartTime, room.questionDuration));
    const maxTime = room.questionDuration;

    player.currentAnswer = answerIndex;
    player.answerTimeMs = timeTaken;

    if (answerIndex >= 0 && answerIndex < 4) {
      room.answerTally[answerIndex] = (room.answerTally[answerIndex] || 0) + 1;
    }
    room.totalAnswered++;

    // Scoring formula: Speed scaled (1000 -> 500) + streak bonus (up to +500)
    const isCorrect = answerIndex === question.correctIndex;
    player.isCorrect = isCorrect;

    if (isCorrect) {
      player.streak++;
      const timeRatio = Math.min(Math.max(timeTaken / maxTime, 0), 1);
      const speedScore = Math.round((1 - timeRatio / 2) * (question.points || 1000));
      const streakBonus = Math.min((player.streak - 1) * 100, 500);
      player.pointsAwarded = speedScore + streakBonus;
      player.score += player.pointsAwarded;
    } else {
      player.streak = 0;
      player.pointsAwarded = 0;
    }

    // Acknowledge player immediately
    this.io.to(socketId).emit('player:answer-received', {
      answerIndex,
      isAnswered: true
    });

    // If 100% of participants answered, end question early
    if (room.totalAnswered >= room.players.size && room.players.size > 0) {
      clearTimeout(room.questionTimer);
      clearInterval(room.tallyBatchTimer);
      setTimeout(() => this.endQuestion(room), 350);
    }

    return { success: true };
  }

  endQuestion(room) {
    if (room.state !== 'QUESTION') return;
    room.state = 'RESULTS';
    clearTimeout(room.questionTimer);
    clearInterval(room.tallyBatchTimer);

    const question = room.quiz.questions[room.currentQuestionIndex];

    // High performance O(N log N) rank sorting
    const sortedPlayers = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
    sortedPlayers.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    room.leaderboardCache = sortedPlayers;

    // Send final tally & correct answer to Host
    this.io.to(`host:${room.pin}`).emit('host:question-results', {
      correctIndex: question.correctIndex,
      correctOptionText: question.options[question.correctIndex],
      answerTally: room.answerTally,
      totalAnswered: room.totalAnswered,
      totalPlayers: room.players.size,
      options: question.options,
      question: question.question
    });

    // Send individual results to connected players
    for (const player of room.players.values()) {
      if (player.socketId && player.connected) {
        this.io.to(player.socketId).emit('player:question-results', {
          isCorrect: player.isCorrect,
          pointsAwarded: player.pointsAwarded,
          currentScore: player.score,
          streak: player.streak,
          rank: player.rank,
          totalPlayers: room.players.size,
          correctIndex: question.correctIndex
        });
      }
    }
  }

  showLeaderboard(roomPin) {
    const room = this.rooms.get(roomPin);
    if (!room) return;

    room.state = 'LEADERBOARD';

    const top10 = room.leaderboardCache.slice(0, 10).map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak,
      pointsAwarded: p.pointsAwarded
    }));

    this.io.to(`host:${room.pin}`).emit('host:leaderboard', {
      top10,
      currentQuestion: room.currentQuestionIndex + 1,
      totalQuestions: room.quiz.questions.length,
      isFinal: room.currentQuestionIndex + 1 >= room.quiz.questions.length
    });

    this.io.to(`room:${room.pin}`).emit('player:leaderboard-view', {
      isFinal: room.currentQuestionIndex + 1 >= room.quiz.questions.length
    });
  }

  triggerPodium(room) {
    room.state = 'PODIUM';

    const sortedPlayers = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
    const podium = {
      first: sortedPlayers[0] ? { nickname: sortedPlayers[0].nickname, avatar: sortedPlayers[0].avatar, score: sortedPlayers[0].score } : null,
      second: sortedPlayers[1] ? { nickname: sortedPlayers[1].nickname, avatar: sortedPlayers[1].avatar, score: sortedPlayers[1].score } : null,
      third: sortedPlayers[2] ? { nickname: sortedPlayers[2].nickname, avatar: sortedPlayers[2].avatar, score: sortedPlayers[2].score } : null,
      totalParticipants: sortedPlayers.length
    };

    this.io.to(`host:${room.pin}`).emit('host:podium', podium);

    for (const player of room.players.values()) {
      if (player.socketId && player.connected) {
        this.io.to(player.socketId).emit('player:podium', {
          yourRank: player.rank,
          yourScore: player.score,
          totalParticipants: sortedPlayers.length,
          top3: podium
        });
      }
    }
  }

  // BOT SIMULATOR FOR CONCURRENCY BENCHMARKING
  simulateBots(roomPin, count = 100) {
    const room = this.rooms.get(roomPin);
    if (!room) return { success: false, error: 'Room not found' };

    const avatars = ['🤖', '⚡', '💻', '🚀', '🔥', '🧠', '✨', '🎯', '👾', '🎉', '🦁', '🦉'];
    const devNames = [
      'Gopher', 'Rusty', 'CloudNinja', 'ByteMe', 'TensorFlow', 'FlutterFan', 'K8sCaptain',
      'PromptEngineer', 'FullStackGod', 'GeminiGuru', 'NullPointer', 'SyntaxError', 'BugHunter',
      'AsyncAwait', 'CodeBrew', 'GitPushForce', 'KernelPanic', 'StackOverflow', 'PixelCrafter'
    ];

    for (let i = 1; i <= count; i++) {
      const playerId = `bot-${i}-${uuidv4().slice(0, 6)}`;
      const name = `${devNames[Math.floor(Math.random() * devNames.length)]}_${Math.floor(100 + Math.random() * 900)}`;
      const avatar = avatars[Math.floor(Math.random() * avatars.length)];

      const bot = {
        id: playerId,
        socketId: null,
        nickname: name,
        avatar,
        score: 0,
        streak: 0,
        currentAnswer: null,
        answerTimeMs: 0,
        isCorrect: false,
        pointsAwarded: 0,
        connected: true,
        rank: 0,
        isBot: true
      };

      room.players.set(playerId, bot);
    }

    this.broadcastLobbyUpdate(room);
    return { success: true, totalPlayers: room.players.size };
  }

  triggerBotAnswers(roomPin) {
    const room = this.rooms.get(roomPin);
    if (!room || room.state !== 'QUESTION') return;

    const question = room.quiz.questions[room.currentQuestionIndex];
    if (!question) return;

    for (const player of room.players.values()) {
      if (player.isBot && player.currentAnswer === null) {
        const delay = Math.floor(600 + Math.random() * Math.min(room.questionDuration - 1000, 12000));
        setTimeout(() => {
          if (room.state !== 'QUESTION' || player.currentAnswer !== null) return;

          let pickIndex;
          if (Math.random() < 0.70) {
            pickIndex = question.correctIndex;
          } else {
            pickIndex = Math.floor(Math.random() * question.options.length);
          }

          player.currentAnswer = pickIndex;
          player.answerTimeMs = delay;
          if (pickIndex >= 0 && pickIndex < 4) {
            room.answerTally[pickIndex] = (room.answerTally[pickIndex] || 0) + 1;
          }
          room.totalAnswered++;

          const isCorrect = pickIndex === question.correctIndex;
          player.isCorrect = isCorrect;
          if (isCorrect) {
            player.streak++;
            const timeRatio = Math.min(Math.max(delay / room.questionDuration, 0), 1);
            const speedScore = Math.round((1 - timeRatio / 2) * (question.points || 1000));
            const streakBonus = Math.min((player.streak - 1) * 100, 500);
            player.pointsAwarded = speedScore + streakBonus;
            player.score += player.pointsAwarded;
          } else {
            player.streak = 0;
            player.pointsAwarded = 0;
          }

          if (room.totalAnswered >= room.players.size) {
            clearTimeout(room.questionTimer);
            clearInterval(room.tallyBatchTimer);
            setTimeout(() => this.endQuestion(room), 300);
          }
        }, delay);
      }
    }
  }

  handleDisconnect(socketId) {
    const meta = this.playerToRoom.get(socketId);
    if (!meta) return;

    const room = this.rooms.get(meta.pin);
    if (!room) {
      this.playerToRoom.delete(socketId);
      return;
    }

    if (meta.isHost) {
      console.log(`[GameManager] Host disconnected from room ${meta.pin}`);
    } else {
      const player = room.players.get(meta.playerId);
      if (player) {
        player.connected = false;
        console.log(`[GameManager] Player "${player.nickname}" socket dropped`);
      }
      room.socketToPlayerId.delete(socketId);
      this.playerToRoom.delete(socketId);
      if (room.state === 'LOBBY') {
        this.broadcastLobbyUpdate(room);
      }
    }
  }
}

module.exports = GameManager;
