import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import HostView from './components/HostView';
import PlayerView from './components/PlayerView';
import QuizEditor from './components/QuizEditor';
import { Play, Tv, Edit3, Settings, Sparkles, X, Check, Server } from 'lucide-react';

function ArenaApp() {
  const { isConnected, activeUrl, setBackendUrl } = useSocket();
  const [view, setView] = useState('HOME'); // HOME, PLAYER, HOST, EDITOR
  const [initialPin, setInitialPin] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pin = params.get('pin');
    if (pin) {
      setInitialPin(pin);
      setView('PLAYER');
    }
  }, []);

  const handleSaveBackendUrl = (e) => {
    e.preventDefault();
    if (customUrlInput.trim()) {
      setBackendUrl(customUrlInput.trim());
      setShowSettings(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Connection Indicator (Clickable to change backend server) */}
      <div style={{ position: 'fixed', top: '12px', right: '16px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => {
            setCustomUrlInput(activeUrl || '');
            setShowSettings(true);
          }}
          className="glass-pill"
          style={{
            padding: '6px 14px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isConnected ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: isConnected ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(234, 67, 53, 0.4)',
            cursor: 'pointer',
            color: '#fff'
          }}
          title="Click to view/change server connection"
        >
          {isConnected ? (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }}></span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>Live Server Ready</span>
            </>
          ) : (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EA4335', display: 'inline-block' }}></span>
              <span style={{ color: '#ff6b6b', fontWeight: 600 }}>Connecting... (Click to configure)</span>
            </>
          )}
        </button>
      </div>

      {/* Backend Server Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animate-pop" style={{ maxWidth: '520px', width: '100%', padding: '28px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={20} color="var(--google-blue)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Game Server Connection</h3>
              </div>
              <button onClick={() => setShowSettings(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px', lineHeight: 1.5 }}>
              Firebase Hosting delivers the web interface. To synchronize 1,000 live players, the app connects to the real-time Socket.IO server:
            </p>

            <form onSubmit={handleSaveBackendUrl}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: '6px' }}>
                  BACKEND SERVER URL
                </label>
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="e.g. http://localhost:4000 or https://your-server.onrender.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setCustomUrlInput('http://localhost:4000')}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Local (localhost:4000)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomUrlInput(window.location.origin)}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Current Host
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowSettings(false)} className="btn-secondary" style={{ padding: '10px 18px', fontSize: '0.9rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 22px', fontSize: '0.9rem' }}>
                  Connect Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SWITCHER */}
      {view === 'HOME' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          {/* Logo & Headline */}
          <div className="animate-pop" style={{ marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '9999px', background: 'rgba(66, 133, 244, 0.15)', border: '1px solid rgba(66, 133, 244, 0.3)', color: 'var(--google-blue)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '20px' }}>
              <Sparkles size={16} /> DevFest Kaduna 2026 Live Arena
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
                  Project on stage: PIN, QR code, live chart distribution, and grand podium.
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

          {/* DevFest Kaduna 2026 Footer */}
          <footer style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Built for Google Developer Groups (GDG) • DevFest Kaduna 2026 Edition
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
