import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { sounds } from '../utils/audio';
import { Sparkles, Trophy, Flame, CheckCircle, XCircle, Clock } from 'lucide-react';

const AVATARS = ['🚀', '🤖', '⚡', '💻', '🔥', '🧠', '🎯', '👾', '🦁', '🦊', '🦉', '✨'];

const SHAPES = [
  { icon: '▲', colorClass: 'red' },
  { icon: '◆', colorClass: 'blue' },
  { icon: '●', colorClass: 'yellow' },
  { icon: '■', colorClass: 'green' }
];

export default function PlayerView({ initialPin = '', onBackToHome }) {
  const { socket, isConnected } = useSocket();

  // Inputs
  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Player session state
  const [joined, setJoined] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [playerRank, setPlayerRank] = useState(null);
  const [playerStreak, setPlayerStreak] = useState(0);

  // Game state
  const [gameState, setGameState] = useState('JOIN'); // JOIN, LOBBY, INTRO, QUESTION, ANSWERED, RESULTS, PODIUM
  const [questionData, setQuestionData] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [podiumResult, setPodiumResult] = useState(null);

  // Check URL params for pin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin');
    if (urlPin) {
      setPin(urlPin);
    }

    // Try auto-reconnect from localStorage
    const savedSession = localStorage.getItem('devfest_quiz_player');
    if (savedSession) {
      try {
        const { id, savedPin, name, icon } = JSON.parse(savedSession);
        if (id && savedPin) {
          setPlayerId(id);
          setPin(savedPin);
          setNickname(name);
          setAvatar(icon);
        }
      } catch (e) {}
    }
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('game:question-intro', (data) => {
      setGameState('INTRO');
      setSelectedAnswer(null);
      setRoundResult(null);
      setQuestionData(data);
      sounds.playPop();
    });

    socket.on('player:question-active', (data) => {
      setGameState('QUESTION');
      setSelectedAnswer(null);
      setQuestionData(data);
    });

    socket.on('player:answer-received', ({ answerIndex }) => {
      setSelectedAnswer(answerIndex);
      setGameState('ANSWERED');
    });

    socket.on('player:question-results', (results) => {
      setGameState('RESULTS');
      setRoundResult(results);
      setPlayerScore(results.currentScore);
      setPlayerRank(results.rank);
      setPlayerStreak(results.streak);

      if (results.isCorrect) {
        sounds.playCorrect();
      } else {
        sounds.playIncorrect();
      }
    });

    socket.on('player:leaderboard-view', () => {
      // Standby screen while host shows leaderboard on big screen
    });

    socket.on('player:podium', (data) => {
      setGameState('PODIUM');
      setPodiumResult(data);
      sounds.playFanfare();
    });

    return () => {
      socket.off('game:question-intro');
      socket.off('player:question-active');
      socket.off('player:answer-received');
      socket.off('player:question-results');
      socket.off('player:leaderboard-view');
      socket.off('player:podium');
    };
  }, [socket, isConnected]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pin || pin.length < 6) {
      setErrorMsg('Please enter a valid 6-digit Game PIN.');
      return;
    }
    if (!nickname.trim()) {
      setErrorMsg('Please enter your nickname or dev handle.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    socket.emit(
      'player:join',
      { pin: pin.trim(), nickname: nickname.trim(), avatar, existingPlayerId: playerId },
      (res) => {
        setIsSubmitting(false);
        if (res.success) {
          setJoined(true);
          setPlayerId(res.playerId);
          setPlayerScore(res.score || 0);
          setGameState(res.state === 'QUESTION' ? 'QUESTION' : 'LOBBY');

          // Save session to localStorage for resilience against refreshes/disconnects
          localStorage.setItem(
            'devfest_quiz_player',
            JSON.stringify({ id: res.playerId, savedPin: pin.trim(), name: nickname.trim(), icon: avatar })
          );
          sounds.playPop();
        } else {
          setErrorMsg(res.error || 'Failed to join game.');
        }
      }
    );
  };

  const handleSelectAnswer = (index) => {
    if (gameState !== 'QUESTION' || selectedAnswer !== null) return;

    // Haptic vibration on mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
    sounds.playPop();
    setSelectedAnswer(index);
    setGameState('ANSWERED');

    socket.emit('player:submit-answer', { answerIndex: index });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        maxWidth: '520px',
        margin: '0 auto',
        width: '100%'
      }}
    >
      {/* JOIN SCREEN */}
      {gameState === 'JOIN' && (
        <div className="glass-panel animate-pop" style={{ width: '100%', padding: '32px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '6px' }}>⚡</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
              Join DevFest Arena
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Compete live with 1,000 developers!
            </p>
          </div>

          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {errorMsg && (
              <div style={{ background: 'rgba(234, 67, 53, 0.15)', border: '1px solid rgba(234, 67, 53, 0.4)', borderRadius: '10px', padding: '10px 14px', color: '#ff6b6b', fontSize: '0.9rem', textAlign: 'center' }}>
                {errorMsg}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Game PIN
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="e.g. 482913"
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '1.3rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#fff',
                  textAlign: 'center',
                  letterSpacing: '3px',
                  fontWeight: 700
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Nickname / Dev Handle
              </label>
              <input
                type="text"
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. KotlinQueen, BugHunter"
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '1.1rem',
                  color: '#fff',
                  fontWeight: 600
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Select Your Avatar
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {AVATARS.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setAvatar(emoji)}
                    style={{
                      fontSize: '1.5rem',
                      padding: '8px 0',
                      borderRadius: '10px',
                      border: avatar === emoji ? '2px solid var(--google-blue)' : '1px solid rgba(255,255,255,0.1)',
                      background: avatar === emoji ? 'rgba(66, 133, 244, 0.25)' : 'rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ width: '100%', marginTop: '8px', padding: '16px' }}
            >
              {isSubmitting ? 'Joining...' : 'Enter Arena 🚀'}
            </button>

            <button
              type="button"
              onClick={onBackToHome}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', marginTop: '4px' }}
            >
              ← Back to menu
            </button>
          </form>
        </div>
      )}

      {/* LOBBY WAITING SCREEN */}
      {gameState === 'LOBBY' && (
        <div className="glass-panel animate-pop" style={{ width: '100%', padding: '40px 24px', textAlign: 'center' }}>
          <div className="animate-float" style={{ fontSize: '4.5rem', marginBottom: '16px' }}>
            {avatar}
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '6px' }}>
            You're in, {nickname}!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '28px' }}>
            See your name on the main stage screen?
          </p>

          <div className="glass-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', color: 'var(--google-blue)', fontWeight: 700 }}>
            <span>Room PIN: {pin}</span>
          </div>

          <div style={{ marginTop: '36px', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }}></span>
            Waiting for host to start the game...
          </div>
        </div>
      )}

      {/* QUESTION INTRO (3s) */}
      {gameState === 'INTRO' && (
        <div className="glass-panel animate-pop" style={{ width: '100%', padding: '44px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏱️</div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '12px' }}>
            Question {questionData?.questionNumber}
          </h2>
          <p style={{ color: 'var(--google-yellow)', fontWeight: 700, fontSize: '1.2rem' }}>
            {questionData?.category || 'Tech'}
          </p>
          <div style={{ marginTop: '24px', color: 'var(--text-muted)' }}>
            Get ready to tap fast!
          </div>
        </div>
      )}

      {/* ACTIVE QUESTION - 4 KAHOOT SHAPE BUTTONS */}
      {gameState === 'QUESTION' && questionData && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Question Text Preview for back-row players */}
          <div className="glass-panel" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
              Question {questionData.questionNumber} of {questionData.totalQuestions}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3 }}>
              {questionData.question}
            </div>
          </div>

          {/* 4 Colored Shape Buttons (2x2 grid) */}
          <div className="answer-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', minHeight: '340px' }}>
            {SHAPES.map((shape, idx) => {
              const optionText = questionData.options ? questionData.options[idx] : '';
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  className={`answer-btn ${shape.colorClass}`}
                  style={{
                    height: '160px',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px',
                    textAlign: 'center'
                  }}
                >
                  <span className="answer-shape" style={{ fontSize: '3rem', width: 'auto', height: 'auto' }}>
                    {shape.icon}
                  </span>
                  {optionText && (
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, opacity: 0.95, maxHeight: '44px', overflow: 'hidden' }}>
                      {optionText}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ANSWER SUBMITTED (WAITING) */}
      {gameState === 'ANSWERED' && (
        <div className="glass-panel animate-pop" style={{ width: '100%', padding: '44px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎯</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>
            Answer Locked In!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '24px' }}>
            Hold tight, waiting for timer to expire...
          </p>

          {selectedAnswer !== null && (
            <div className={`answer-btn ${SHAPES[selectedAnswer]?.colorClass}`} style={{ maxWidth: '200px', margin: '0 auto', padding: '12px', justifyContent: 'center' }}>
              <span className="answer-shape">{SHAPES[selectedAnswer]?.icon}</span>
              <span>Option {selectedAnswer + 1}</span>
            </div>
          )}
        </div>
      )}

      {/* QUESTION RESULTS SCREEN */}
      {gameState === 'RESULTS' && roundResult && (
        <div className="glass-panel animate-pop" style={{ width: '100%', padding: '36px 24px', textAlign: 'center' }}>
          {roundResult.isCorrect ? (
            <div>
              <div style={{ color: '#4ade80', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                <CheckCircle size={64} />
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#4ade80', marginBottom: '4px' }}>
                Correct!
              </h2>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
                +{roundResult.pointsAwarded} pts
              </div>
            </div>
          ) : (
            <div>
              <div style={{ color: '#ff6b6b', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                <XCircle size={64} />
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ff6b6b', marginBottom: '4px' }}>
                Incorrect!
              </h2>
              <div style={{ fontSize: '1.1rem', color: 'var(--text-sub)', marginBottom: '16px' }}>
                The correct shape was {SHAPES[roundResult.correctIndex]?.icon}
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Score
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                {roundResult.currentScore.toLocaleString()}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>
                Your Rank
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--google-yellow)' }}>
                #{roundResult.rank} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>of {roundResult.totalPlayers}</span>
              </div>
            </div>
          </div>

          {roundResult.streak > 1 && (
            <div className="glass-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', marginTop: '20px', color: '#ff7a00', fontWeight: 700 }}>
              <Flame size={18} fill="#ff7a00" />
              <span>Answer Streak: {roundResult.streak} in a row!</span>
            </div>
          )}
        </div>
      )}

      {/* PODIUM FINALE */}
      {gameState === 'PODIUM' && (
        <div className="glass-panel animate-pop" style={{ width: '100%', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>
            Game Over!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '24px' }}>
            Thank you for participating at DevFest 2026!
          </p>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '14px', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Your Final Position
            </div>
            <div style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--google-yellow)', margin: '6px 0' }}>
              #{playerRank || podiumResult?.yourRank || '-'}
            </div>
            <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
              Final Score: {playerScore.toLocaleString()} pts
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('devfest_quiz_player');
              setGameState('JOIN');
            }}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            Play Another Game
          </button>
        </div>
      )}
    </div>
  );
}
