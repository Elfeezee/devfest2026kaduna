import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import {
  Users,
  Play,
  Volume2,
  VolumeX,
  ChevronRight,
  Trophy,
  Award,
  Zap,
  Bot,
  Copy,
  Check,
  Code2,
  Clock,
  Sparkles
} from 'lucide-react';

const SHAPES = [
  { icon: '▲', name: 'Triangle', colorClass: 'red' },
  { icon: '◆', name: 'Diamond', colorClass: 'blue' },
  { icon: '●', name: 'Circle', colorClass: 'yellow' },
  { icon: '■', name: 'Square', colorClass: 'green' }
];

export default function HostView({ onBackToHome, quizId }) {
  const { socket, isConnected } = useSocket();
  const [pin, setPin] = useState(null);
  const [hostToken, setHostToken] = useState(null);
  const [quizInfo, setQuizInfo] = useState(null);
  const [gameState, setGameState] = useState('INIT'); // INIT, LOBBY, INTRO, QUESTION, RESULTS, LEADERBOARD, PODIUM
  const [players, setPlayers] = useState([]);
  const [playerCount, setPlayerCount] = useState(0);

  // Question state
  const [questionData, setQuestionData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [totalTime, setTotalTime] = useState(20);
  const [tally, setTally] = useState([0, 0, 0, 0]);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [resultsData, setResultsData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [podiumData, setPodiumData] = useState(null);

  // UI return snippet – replace placeholder with full render
  // (Will be inserted later in return block)
  const [isMuted, setIsMuted] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isAddingBots, setIsAddingBots] = useState(false);
  const [reactions, setReactions] = useState([]);
  const timerRef = useRef(null);
  const lastTickedRef = useRef(null);

  // Initialize game room on mount
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('host:create-game', { quizId: quizId || 'devfest-2026' });

    socket.on('host:game-created', ({ pin, hostToken: token, quiz }) => {
      setPin(pin);
      setHostToken(token);
      setQuizInfo(quiz);
      setGameState('LOBBY');
    });

    socket.on('host:lobby-update', ({ playerCount, recentPlayers }) => {
      setPlayerCount(playerCount);
      setPlayers(recentPlayers);
      sounds.playPop();
    });

    socket.on('game:reaction', (reaction) => {
      setReactions(prev => [...prev.slice(-30), reaction]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reaction.id));
      }, 3200);
    });

    socket.on('game:question-intro', (intro) => {
      setGameState('INTRO');
      setResultsData(null);
      setQuestionData(intro);
      sounds.playCountdownWarn();
    });

    socket.on('host:question-active', (data) => {
      setGameState('QUESTION');
      setQuestionData(data);
      setTimeLeft(data.timeLimit);
      setTotalTime(data.timeLimit);
      setTally([0, 0, 0, 0]);
      setTotalAnswered(0);
      lastTickedRef.current = null;

      // Start countdown
      const startTime = Date.now();
      const endTime = startTime + data.durationMs;

      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 5 && remaining > 0 && remaining !== lastTickedRef.current) {
          lastTickedRef.current = remaining;
          sounds.playTensionBeat(remaining);
        }

        if (remaining <= 0) {
          clearInterval(timerRef.current);
          sounds.playBuzzer();
        }
      }, 250);
    });

    socket.on('host:tally-update', ({ answerTally, totalAnswered, totalPlayers }) => {
      setTally(answerTally);
      setTotalAnswered(totalAnswered);
    });

    socket.on('host:question-results', (results) => {
      clearInterval(timerRef.current);
      setGameState('RESULTS');
      setResultsData(results);
      setTally(results.answerTally);
      setTotalAnswered(results.totalAnswered);
      sounds.playDing();
    });

    socket.on('host:leaderboard', (data) => {
      setGameState('LEADERBOARD');
      setLeaderboardData(data);
      sounds.playPop();
    });

    socket.on('host:podium', (data) => {
      setGameState('PODIUM');
      setPodiumData(data);
      sounds.playFanfare();
      triggerConfetti();
    });

    socket.on('host:bots-simulated', (res) => {
      setIsAddingBots(false);
      if (res.success) {
        setPlayerCount(res.totalPlayers);
      }
    });

    return () => {
      clearInterval(timerRef.current);
      socket.off('host:game-created');
      socket.off('host:lobby-update');
      socket.off('game:reaction');
      socket.off('game:question-intro');
      socket.off('host:question-active');
      socket.off('host:tally-update');
      socket.off('host:question-results');
      socket.off('host:leaderboard');
      socket.off('host:podium');
      socket.off('host:bots-simulated');
    };
  }, [socket, isConnected]);

  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 }
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleStartGame = () => {
    if (!socket || !pin) return;
    socket.emit('host:next-question', { pin, hostToken });
  };

  const handleShowLeaderboard = () => {
    if (!socket || !pin) return;
    socket.emit('host:show-leaderboard', { pin, hostToken });
  };

  const handleNextQuestion = () => {
    if (!socket || !pin) return;
    socket.emit('host:next-question', { pin, hostToken });
  };

  const handleSimulateBots = (count) => {
    if (!socket || !pin) return;
    setIsAddingBots(true);
    socket.emit('host:simulate-bots', { pin, hostToken, count });
  };

  const handleKickPlayer = (playerId) => {
    if (!socket || !pin || !hostToken) return;
    socket.emit('host:kick-player', { pin, hostToken, playerId }, (res) => {
      if (res?.success) sounds.playPop();
    });
  };

  const handleCopyPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?pin=${pin || ''}`
    : `https://devfest.live?pin=${pin || ''}`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '20px 32px' }}>
      {/* Floating Emoji Reactions from Auditorium Audience */}
      {reactions.map(rx => (
        <div
          key={rx.id}
          className="floating-reaction-item"
          style={{ left: `${rx.x}%` }}
        >
          {rx.emoji}
        </div>
      ))}

      {/* Top Bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={onBackToHome} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            ← Home
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <span style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.5px' }}>
              DevFest <span style={{ color: 'var(--google-blue)' }}>2026</span> Live Arena
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Stage Soundboard */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px' }}>SFX</span>
            <button onClick={() => sounds.playDrumroll()} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Play Drumroll">
              🥁 Roll
            </button>
            <button onClick={() => sounds.playApplause()} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Play Crowd Cheer">
              👏 Cheer
            </button>
            <button onClick={() => sounds.playDing()} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Play Chime">
              ✨ Ding
            </button>
            <button onClick={() => sounds.playBuzzer()} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Play Buzzer">
              🚨 Buzz
            </button>
          </div>

          {pin && (
            <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 18px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>GAME PIN:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '2px', color: '#fff' }}>
                {pin.slice(0, 3)} {pin.slice(3)}
              </span>
              <button
                onClick={handleCopyPin}
                style={{ background: 'transparent', border: 'none', color: copiedPin ? '#34A853' : '#94a3b8', cursor: 'pointer', display: 'flex' }}
                title="Copy PIN"
              >
                {copiedPin ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          )}

          <button
            onClick={toggleSound}
            className="btn-secondary"
            style={{ width: '42px', height: '42px', padding: 0, borderRadius: '50%' }}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={20} color="#ff6b6b" /> : <Volume2 size={20} color="#4ade80" />}
          </button>
        </div>
      </header>

      {/* Main Content Area based on State */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* INIT / CONNECTING STATE */}
        {gameState === 'INIT' && (
          <div className="glass-panel animate-pop" style={{ maxWidth: '620px', margin: '0 auto', padding: '40px 32px', textAlign: 'center' }}>
            <div className="animate-float" style={{ fontSize: '3.5rem', marginBottom: '16px' }}>
              ⚡
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '12px' }}>
              Connecting to Game Server...
            </h2>
            <p style={{ color: 'var(--text-sub)', fontSize: '1.05rem', lineHeight: 1.5, marginBottom: '24px' }}>
              Waiting to establish real-time WebSocket connection to the game server.
            </p>

            <div style={{ background: 'rgba(66, 133, 244, 0.1)', border: '1px solid rgba(66, 133, 244, 0.3)', borderRadius: '14px', padding: '18px', textAlign: 'left', fontSize: '0.92rem', color: 'var(--text-sub)', marginBottom: '24px' }}>
              <div style={{ fontWeight: 800, color: 'var(--google-blue)', marginBottom: '8px', fontSize: '1rem' }}>
                💡 Quick Setup Guide
              </div>
              <div style={{ marginBottom: '8px' }}>
                • <strong>Testing on this computer?</strong> Open <a href="http://localhost:4000" style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 700 }}>http://localhost:4000</a> where the local server is already running!
              </div>
              <div>
                • <strong>Testing from another phone or live?</strong> Click the <strong>Connecting...</strong> badge in the top right corner to set your cloud backend URL (e.g. Render / Cloud Run / tunnel).
              </div>
            </div>

            <button onClick={onBackToHome} className="btn-secondary" style={{ width: '100%', padding: '14px' }}>
              ← Return to Arena Menu
            </button>
          </div>
        )}

        {/* LOBBY STATE */}
        {gameState === 'LOBBY' && (
          <div className="animate-pop" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '32px', alignItems: 'center' }}>
              {/* Left Column: QR Code & Join Instructions */}
              <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Scan to Join on Mobile
                </h3>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', margin: '16px 0' }}>
                  <QRCodeSVG value={joinUrl} size={220} level="H" includeMargin={false} />
                </div>
                <p style={{ fontSize: '1.05rem', color: 'var(--text-sub)', marginBottom: '8px' }}>
                  Or visit in your browser:
                </p>
                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 16px', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--google-blue)', fontWeight: 600, wordBreak: 'break-all', marginBottom: '16px' }}>
                  {typeof window !== 'undefined' ? window.location.host : 'devfest.live'}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Enter PIN: <strong style={{ color: '#fff', fontSize: '1.2rem' }}>{pin}</strong>
                </div>
              </div>

              {/* Right Column: Player count, nickname cloud, Start button, & 1000-player stress test */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(66, 133, 244, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--google-blue)' }}>
                        <Users size={28} />
                      </div>
                      <div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>{playerCount}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Developers in Lobby</div>
                      </div>
                    </div>

                    <button
                      onClick={handleStartGame}
                      className="btn-primary"
                      disabled={playerCount === 0}
                      style={{
                        padding: '16px 36px',
                        fontSize: '1.3rem',
                        opacity: playerCount === 0 ? 0.5 : 1,
                        cursor: playerCount === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Play size={24} fill="#fff" /> Start Showdown
                    </button>
                  </div>

                  {/* Nickname Pills Cloud */}
                  <div style={{ minHeight: '180px', maxHeight: '260px', overflowY: 'auto', background: 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignContent: 'flex-start' }}>
                    {players.length === 0 ? (
                      <div style={{ width: '100%', height: '100%', minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        Waiting for developers to scan the QR code and join...
                      </div>
                    ) : (
                      players.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleKickPlayer(p.id)}
                          className="glass-pill animate-pop"
                          title="Click to remove player"
                          style={{
                            padding: '8px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '1.05rem',
                            fontWeight: 600,
                            background: 'rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(234, 67, 53, 0.25)';
                            e.currentTarget.style.borderColor = 'rgba(234, 67, 53, 0.6)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                          }}
                        >
                          <span style={{ fontSize: '1.2rem' }}>{p.avatar}</span>
                          <span>{p.nickname}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* DevFest 1,000 Players Concurrency Tester */}
                <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(22, 28, 48, 0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Bot size={24} color="var(--google-yellow)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>DevFest Concurrency Simulator</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Simulate 100, 500, or 1,000 live participants to verify high-throughput handling
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleSimulateBots(100)}
                      disabled={isAddingBots}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                      +100 Devs
                    </button>
                    <button
                      onClick={() => handleSimulateBots(500)}
                      disabled={isAddingBots}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                      +500 Devs
                    </button>
                    <button
                      onClick={() => handleSimulateBots(1000)}
                      disabled={isAddingBots}
                      className="btn-secondary"
                      style={{
                        padding: '8px 18px',
                        fontSize: '0.9rem',
                        borderColor: 'var(--google-yellow)',
                        color: 'var(--google-yellow)',
                        fontWeight: 700
                      }}
                    >
                      ⚡ +1,000 Devs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QUESTION INTRO (3-second splash) */}
        {gameState === 'INTRO' && questionData && (
          <div className="animate-pop" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div className="glass-pill" style={{ display: 'inline-block', padding: '8px 24px', marginBottom: '20px', color: 'var(--google-yellow)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '1px' }}>
              {questionData.category}
            </div>
            <h1 style={{ fontSize: '4.5rem', fontWeight: 900, marginBottom: '24px', letterSpacing: '-1px' }}>
              Question {questionData.questionNumber}
            </h1>
            <p style={{ fontSize: '1.8rem', color: 'var(--text-sub)' }}>
              Get ready on your mobile devices...
            </p>
          </div>
        )}

        {/* ACTIVE QUESTION ON BIG STAGE */}
        {gameState === 'QUESTION' && questionData && (
          <div className="animate-pop" style={{ maxWidth: '1300px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Question Header & Timer Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span className="glass-pill" style={{ padding: '8px 18px', fontWeight: 700, color: 'var(--google-blue)', fontSize: '1.1rem' }}>
                  {questionData.questionNumber} / {questionData.totalQuestions}
                </span>
                <span className="glass-pill" style={{ padding: '8px 18px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '1rem' }}>
                  {questionData.category}
                </span>
              </div>

              {/* Center Circular Timer */}
              <div className={`timer-badge ${timeLeft <= 5 ? 'warning' : ''}`}>
                <span>{timeLeft}</span>
              </div>

              {/* Right: Live Answers In Tracker */}
              <div className="glass-panel" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Zap size={22} color="var(--google-yellow)" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>
                    {totalAnswered} <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/ {questionData.totalPlayers || playerCount}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Answers In</div>
                </div>
              </div>
            </div>

            {/* Question Card */}
            <div className="glass-panel" style={{ padding: '36px 44px', textAlign: 'center', minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.3, marginBottom: questionData.codeSnippet ? '20px' : '0' }}>
                {questionData.question}
              </h2>

              {questionData.codeSnippet && (
                <div className="code-container" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'left' }}>
                  <pre><code>{questionData.codeSnippet}</code></pre>
                </div>
              )}
            </div>

            {/* 4 Kahoot Colored Option Cards */}
            <div className="answer-grid">
              {questionData.options.map((option, idx) => {
                const shape = SHAPES[idx];
                return (
                  <div
                    key={idx}
                    className={`answer-btn ${shape.colorClass}`}
                    style={{ minHeight: '110px', fontSize: '1.4rem' }}
                  >
                    <div className="answer-shape">{shape.icon}</div>
                    <span style={{ flex: 1 }}>{option}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QUESTION RESULTS & BAR CHART DISTRIBUTION */}
        {gameState === 'RESULTS' && resultsData && (
          <div className="animate-pop" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>
                {resultsData.question}
              </h2>
              <button onClick={handleShowLeaderboard} className="btn-primary" style={{ padding: '14px 32px', fontSize: '1.2rem' }}>
                Leaderboard <ChevronRight size={22} />
              </button>
            </div>

            {/* Bar Chart Visualization */}
            <div className="glass-panel" style={{ padding: '36px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', minHeight: '340px', alignItems: 'flex-end' }}>
              {resultsData.options.map((opt, idx) => {
                const shape = SHAPES[idx];
                const count = tally[idx] || 0;
                const total = totalAnswered || 1;
                const pct = Math.round((count / total) * 100);
                const isCorrect = idx === resultsData.correctIndex;

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.4rem', color: isCorrect ? '#4ade80' : 'var(--text-sub)' }}>
                      {count} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>({pct}%)</span>
                    </div>

                    {/* Vertical Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(pct * 2.2, 16)}px`,
                        background: isCorrect
                          ? 'linear-gradient(180deg, #34A853 0%, #1f6f09 100%)'
                          : `var(--color-${shape.colorClass})`,
                        borderRadius: '12px 12px 6px 6px',
                        boxShadow: isCorrect ? '0 0 25px rgba(52, 168, 83, 0.6)' : 'none',
                        transition: 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingTop: '8px'
                      }}
                    >
                      {isCorrect && (
                        <div style={{ background: '#ffffff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1f6f09' }}>
                          <Check size={20} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <div
                      className={`answer-btn ${shape.colorClass}`}
                      style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '1.1rem',
                        boxShadow: isCorrect ? '0 0 15px rgba(52, 168, 83, 0.5)' : 'none',
                        border: isCorrect ? '2px solid #fff' : 'none'
                      }}
                    >
                      <span className="answer-shape" style={{ fontSize: '1.3rem' }}>{shape.icon}</span>
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LEADERBOARD VIEW */}
        {gameState === 'LEADERBOARD' && leaderboardData && (
          <div className="animate-pop" style={{ maxWidth: '900px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Trophy size={36} color="var(--google-yellow)" />
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Leaderboard</h2>
              </div>
              <button
                onClick={leaderboardData.isFinal ? () => socket.emit('host:next-question', { pin }) : handleNextQuestion}
                className="btn-primary"
                style={{ padding: '14px 32px', fontSize: '1.2rem' }}
              >
                {leaderboardData.isFinal ? '🏆 Final Podium' : 'Next Question'} <ChevronRight size={22} />
              </button>
            </div>

            <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {leaderboardData.top10.map((player, idx) => {
                const isTop3 = idx < 3;
                return (
                  <div
                    key={player.id}
                    className="animate-pop"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderRadius: '14px',
                      background: idx === 0
                        ? 'linear-gradient(90deg, rgba(251, 188, 5, 0.25) 0%, rgba(22, 28, 48, 0.6) 100%)'
                        : idx === 1
                        ? 'linear-gradient(90deg, rgba(200, 200, 200, 0.2) 0%, rgba(22, 28, 48, 0.6) 100%)'
                        : idx === 2
                        ? 'linear-gradient(90deg, rgba(205, 127, 50, 0.2) 0%, rgba(22, 28, 48, 0.6) 100%)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: idx === 0 ? '1px solid rgba(251, 188, 5, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, minWidth: '36px', color: isTop3 ? 'var(--google-yellow)' : 'var(--text-muted)' }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: '1.8rem' }}>{player.avatar}</span>
                      <span style={{ fontSize: '1.35rem', fontWeight: 700 }}>{player.nickname}</span>
                      {player.streak >= 2 && (
                        <span className="glass-pill" style={{ padding: '4px 10px', fontSize: '0.85rem', color: '#ff7a00', fontWeight: 700 }}>
                          🔥 {player.streak} streak
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {player.pointsAwarded > 0 && (
                        <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '1.1rem' }}>
                          +{player.pointsAwarded}
                        </span>
                      )}
                      <span style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                        {player.score.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GRAND PODIUM FINALE */}
        {gameState === 'PODIUM' && podiumData && (
          <div className="animate-pop" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Sparkles size={32} color="var(--google-yellow)" />
              <h1 style={{ fontSize: '3.6rem', fontWeight: 900, letterSpacing: '-1px' }}>
                DevFest 2026 Champions!
              </h1>
              <Sparkles size={32} color="var(--google-yellow)" />
            </div>
            <p style={{ fontSize: '1.3rem', color: 'var(--text-muted)', marginBottom: '48px' }}>
              Out of {podiumData.totalParticipants.toLocaleString()} brilliant developers
            </p>

            {/* 3 Step Podium */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '24px', minHeight: '380px' }}>
              {/* 2nd Place */}
              {podiumData.second && (
                <div style={{ flex: 1, maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>{podiumData.second.avatar}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px' }}>{podiumData.second.nickname}</div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
                    {podiumData.second.score.toLocaleString()} pts
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '200px',
                      background: 'linear-gradient(180deg, #94a3b8 0%, #475569 100%)',
                      borderRadius: '16px 16px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                      fontWeight: 900,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                  >
                    🥈 2nd
                  </div>
                </div>
              )}

              {/* 1st Place (Center, Tallest) */}
              {podiumData.first && (
                <div style={{ flex: 1, maxWidth: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '-10px' }}>👑</div>
                  <div style={{ fontSize: '4.5rem', marginBottom: '8px' }}>{podiumData.first.avatar}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--google-yellow)', marginBottom: '4px' }}>
                    {podiumData.first.nickname}
                  </div>
                  <div style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800, marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
                    {podiumData.first.score.toLocaleString()} pts
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '280px',
                      background: 'linear-gradient(180deg, #FBBC05 0%, #D89E00 100%)',
                      borderRadius: '20px 20px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3.8rem',
                      fontWeight: 900,
                      color: '#1a1a1a',
                      boxShadow: '0 0 50px rgba(251, 188, 5, 0.6)'
                    }}
                  >
                    🥇 1st
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {podiumData.third && (
                <div style={{ flex: 1, maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>{podiumData.third.avatar}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px' }}>{podiumData.third.nickname}</div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
                    {podiumData.third.score.toLocaleString()} pts
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '150px',
                      background: 'linear-gradient(180deg, #cd7f32 0%, #8b4513 100%)',
                      borderRadius: '16px 16px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem',
                      fontWeight: 900,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                  >
                    🥉 3rd
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.2rem' }}>
                🎉 Host Another Game
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
