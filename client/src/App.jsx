import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import HostView from './components/HostView';
import PlayerView from './components/PlayerView';
import QuizEditor from './components/QuizEditor';
import { Play, Tv, Edit3, Wifi, WifiOff, Sparkles } from 'lucide-react';

function ArenaApp() {
  const { isConnected } = useSocket();
  const [view, setView] = useState('HOME'); // HOME, PLAYER, HOST, EDITOR
  const [initialPin, setInitialPin] = useState('');

  useEffect(() => {
    // If URL contains a pin (e.g. from QR code scan), open Player view directly!
    const params = new URLSearchParams(window.location.search);
    const pin = params.get('pin');
    if (pin) {
      setInitialPin(pin);
      setView('PLAYER');
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Connection Indicator */}
      <div style={{ position: 'fixed', top: '12px', right: '16px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          className="glass-pill"
          style={{
            padding: '6px 14px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isConnected ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: isConnected ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(234, 67, 53, 0.4)'
          }}
        >
          {isConnected ? (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }}></span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>Live Server Ready</span>
            </>
          ) : (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EA4335', display: 'inline-block' }}></span>
              <span style={{ color: '#ff6b6b', fontWeight: 600 }}>Connecting...</span>
            </>
          )}
        </div>
      </div>

      {/* VIEW SWITCHER */}
      {view === 'HOME' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          {/* Logo & Headline */}
          <div className="animate-pop" style={{ marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '9999px', background: 'rgba(66, 133, 244, 0.15)', border: '1px solid rgba(66, 133, 244, 0.3)', color: 'var(--google-blue)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '20px' }}>
              <Sparkles size={16} /> DevFest 2026 Interactive Experience
            </div>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '16px' }}>
              Real-Time Quiz Arena
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-sub)', maxWidth: '580px', margin: '0 auto' }}>
              Engineered for high-concurrency live trivia with up to 1,000 simultaneous participants.
            </p>
          </div>

          {/* Mode Selector Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', width: '100%', marginBottom: '40px' }}>
            {/* Player Card */}
            <div
              onClick={() => setView('PLAYER')}
              className="glass-panel"
              style={{
                padding: '32px 24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(52, 168, 83, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--google-green)', marginBottom: '20px' }}>
                  <Play size={24} fill="currentColor" />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Join as Player</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  Enter PIN, pick your avatar, and answer questions on your phone.
                </p>
              </div>
              <div style={{ marginTop: '24px', color: 'var(--google-green)', fontWeight: 700, fontSize: '0.95rem' }}>
                Enter Game →
              </div>
            </div>

            {/* Stage Host Card */}
            <div
              onClick={() => setView('HOST')}
              className="glass-panel"
              style={{
                padding: '32px 24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: 'rgba(66, 133, 244, 0.4)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(66, 133, 244, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--google-blue)', marginBottom: '20px' }}>
                  <Tv size={24} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Host on Big Screen</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  Project on the stage: PIN, QR code, live chart distribution, and grand podium.
                </p>
              </div>
              <div style={{ marginTop: '24px', color: 'var(--google-blue)', fontWeight: 700, fontSize: '0.95rem' }}>
                Launch Stage Display →
              </div>
            </div>

            {/* Quiz Editor Card */}
            <div
              onClick={() => setView('EDITOR')}
              className="glass-panel"
              style={{
                padding: '32px 24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(251, 188, 5, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--google-yellow)', marginBottom: '20px' }}>
                  <Edit3 size={24} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Quiz Creator</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  Customize questions, add code snippets, tune timers, and prepare rounds.
                </p>
              </div>
              <div style={{ marginTop: '24px', color: 'var(--google-yellow)', fontWeight: 700, fontSize: '0.95rem' }}>
                Edit Quizzes →
              </div>
            </div>
          </div>

          {/* DevFest 2026 Footer */}
          <footer style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Built for Google Developer Groups (GDG) • DevFest 2026 Edition
          </footer>
        </div>
      )}

      {view === 'PLAYER' && <PlayerView initialPin={initialPin} onBackToHome={() => setView('HOME')} />}
      {view === 'HOST' && <HostView onBackToHome={() => setView('HOME')} />}
      {view === 'EDITOR' && <QuizEditor onBackToHome={() => setView('HOME')} />}
    </div>
  );
}

export default function App() {
  return (
    <SocketProvider>
      <ArenaApp />
    </SocketProvider>
  );
}
