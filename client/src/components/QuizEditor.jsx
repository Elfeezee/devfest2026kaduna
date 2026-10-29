import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Check,
  Code,
  Clock,
  Shuffle,
  Sparkles,
  FileText,
  Play,
  RotateCcw,
  HelpCircle,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  parseQuestionsFromText,
  shuffleQuestions,
  shuffleOptions,
  shuffleAll,
  getSampleQuizText
} from '../utils/quizParser';

// Resolve backend URL
const getBackendUrl = () => {
  const PRODUCTION_BACKEND = 'https://devfest2026kaduna.onrender.com';
  if (typeof window === 'undefined') return PRODUCTION_BACKEND;
  const saved = localStorage.getItem('devfest_backend_url');
  if (saved) return saved;
  if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }
  return PRODUCTION_BACKEND;
};

export default function QuizEditor({ onBackToHome, onLaunchGame }) {
  const [quizzes, setQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [activeTab, setActiveTab] = useState('PASTE'); // 'PASTE' or 'VISUAL'
  const [rawText, setRawText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [notification, setNotification] = useState(null);
  const [autoShuffleAnswers, setAutoShuffleAnswers] = useState(true);
  const [autoShuffleQuestions, setAutoShuffleQuestions] = useState(false);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    const fetchUrl = `${getBackendUrl()}/api/quizzes`;

    fetch(fetchUrl)
      .then(res => res.json())
      .then(data => {
        setQuizzes(data);
        if (data.length > 0) {
          setCurrentQuiz(JSON.parse(JSON.stringify(data[0])));
        } else {
          // Initialize default empty quiz
          initEmptyQuiz();
        }
      })
      .catch(err => {
        console.error('Error fetching quizzes:', err);
        initEmptyQuiz();
      });
  }, []);

  const initEmptyQuiz = () => {
    const empty = {
      id: `quiz_${Date.now()}`,
      title: 'DevFest 2026 Custom Quiz',
      description: 'The ultimate live tech showdown at DevFest Kaduna 2026!',
      questions: []
    };
    setCurrentQuiz(empty);
  };

  // Pre-fill paste area with sample on first load if empty
  const handleLoadSample = () => {
    const sample = getSampleQuizText();
    setRawText(sample);
    showNotification('💡 Sample questions loaded into text box');
  };

  // Parse questions from pasted text
  const handleGenerateFromText = () => {
    if (!rawText.trim()) {
      showNotification('Please paste your questions in the box first!', 'error');
      return;
    }

    let parsed = parseQuestionsFromText(rawText);
    if (!parsed || parsed.length === 0) {
      showNotification('Could not parse questions. Check format or use the sample template.', 'error');
      return;
    }

    if (autoShuffleAnswers) {
      parsed = shuffleOptions(parsed);
    }
    if (autoShuffleQuestions) {
      parsed = shuffleQuestions(parsed);
    }

    const updated = {
      ...(currentQuiz || {
        id: `quiz_${Date.now()}`,
        title: 'DevFest 2026 Custom Quiz',
        description: 'Auto-generated trivia for DevFest Kaduna 2026'
      }),
      questions: parsed
    };

    setCurrentQuiz(updated);
    showNotification(`✨ Successfully generated ${parsed.length} questions!`);
  };

  // Reshuffle questions order
  const handleReshuffleQuestions = () => {
    if (!currentQuiz || currentQuiz.questions.length === 0) return;
    const shuffled = shuffleQuestions(currentQuiz.questions);
    setCurrentQuiz({ ...currentQuiz, questions: shuffled });
    showNotification('🔀 Questions order reshuffled!');
  };

  // Reshuffle option answers
  const handleReshuffleOptions = () => {
    if (!currentQuiz || currentQuiz.questions.length === 0) return;
    const shuffled = shuffleOptions(currentQuiz.questions);
    setCurrentQuiz({ ...currentQuiz, questions: shuffled });
    showNotification('🔀 Answer choices reshuffled (correct answers updated)!');
  };

  // Reshuffle everything
  const handleReshuffleAll = () => {
    if (!currentQuiz || currentQuiz.questions.length === 0) return;
    const shuffled = shuffleAll(currentQuiz.questions);
    setCurrentQuiz({ ...currentQuiz, questions: shuffled });
    showNotification('🎲 Questions AND answer choices completely reshuffled!');
  };

  // Manual Editor handlers
  const handleAddQuestion = () => {
    if (!currentQuiz) return;
    const newQ = {
      id: `q_${Date.now()}`,
      question: 'New Question Title',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctIndex: 0,
      timeLimit: 20,
      points: 1000,
      category: 'General Tech',
      codeSnippet: ''
    };
    setCurrentQuiz({
      ...currentQuiz,
      questions: [...(currentQuiz.questions || []), newQ]
    });
    setActiveTab('VISUAL');
  };

  const handleRemoveQuestion = (idx) => {
    if (!currentQuiz) return;
    const updated = currentQuiz.questions.filter((_, i) => i !== idx);
    setCurrentQuiz({ ...currentQuiz, questions: updated });
    showNotification('Question removed');
  };

  const handleUpdateQuestion = (idx, field, value) => {
    if (!currentQuiz) return;
    const updatedQuestions = [...currentQuiz.questions];
    updatedQuestions[idx] = {
      ...updatedQuestions[idx],
      [field]: value
    };
    setCurrentQuiz({ ...currentQuiz, questions: updatedQuestions });
  };

  const handleUpdateOption = (qIdx, optIdx, value) => {
    if (!currentQuiz) return;
    const updatedQuestions = [...currentQuiz.questions];
    const updatedOptions = [...updatedQuestions[qIdx].options];
    updatedOptions[optIdx] = value;
    updatedQuestions[qIdx].options = updatedOptions;
    setCurrentQuiz({ ...currentQuiz, questions: updatedQuestions });
  };

  // Save to backend
  const handleSave = async () => {
    if (!currentQuiz) return;
    if (!currentQuiz.questions || currentQuiz.questions.length === 0) {
      showNotification('Please add or generate at least one question first!', 'error');
      return;
    }

    setIsSaving(true);
    const saveUrl = `${getBackendUrl()}/api/quizzes`;

    try {
      const res = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentQuiz)
      });
      const data = await res.json();
      if (data.success) {
        showNotification('💾 Quiz saved successfully!');
      } else {
        showNotification('Saved locally (server response received)');
      }
    } catch (e) {
      console.error('Error saving quiz:', e);
      showNotification('Saved locally in browser session');
    } finally {
      setIsSaving(false);
    }
  };

  // Save and directly launch host mode with PIN & QR
  const handleSaveAndLaunch = async () => {
    if (!currentQuiz || !currentQuiz.questions || currentQuiz.questions.length === 0) {
      showNotification('Please generate or add questions before launching!', 'error');
      return;
    }

    setIsLaunching(true);
    const saveUrl = `${getBackendUrl()}/api/quizzes`;

    try {
      const res = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentQuiz)
      });
      const data = await res.json();
      const targetQuizId = data.quiz?.id || currentQuiz.id;

      if (onLaunchGame) {
        onLaunchGame(targetQuizId);
      }
    } catch (e) {
      console.error('Launch failed:', e);
      if (onLaunchGame) {
        onLaunchGame(currentQuiz.id);
      }
    } finally {
      setIsLaunching(false);
    }
  };

  if (!currentQuiz) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-sub)' }}>Preparing Quiz Creator...</p>
      </div>
    );
  }

  const questionCount = currentQuiz.questions?.length || 0;

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 20px', minHeight: '100vh' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            background: notification.type === 'error' ? 'rgba(234, 67, 53, 0.95)' : 'rgba(52, 168, 83, 0.95)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'popIn 0.25s ease'
          }}
        >
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          {notification.msg}
        </div>
      )}

      {/* Top Navigation & Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBackToHome} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            <ArrowLeft size={16} /> Back to Arena
          </button>

          {/* Mode Switcher Tabs */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setActiveTab('PASTE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'PASTE' ? 'var(--google-blue)' : 'transparent',
                color: activeTab === 'PASTE' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <FileText size={16} /> Paste & Auto-Generate
            </button>
            <button
              onClick={() => setActiveTab('VISUAL')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'VISUAL' ? 'var(--google-blue)' : 'transparent',
                color: activeTab === 'VISUAL' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Layers size={16} /> Form Editor ({questionCount})
            </button>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {questionCount > 0 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleReshuffleOptions}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                title="Shuffle answer choices (A, B, C, D) while preserving correctness"
              >
                <Shuffle size={14} color="var(--google-yellow)" /> Reshuffle Answers
              </button>
              <button
                onClick={handleReshuffleQuestions}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                title="Shuffle question order"
              >
                <RotateCcw size={14} color="var(--google-blue)" /> Reshuffle Questions
              </button>
            </div>
          )}

          <button onClick={handleSave} className="btn-secondary" disabled={isSaving} style={{ padding: '8px 16px' }}>
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Quiz'}
          </button>

          <button
            onClick={handleSaveAndLaunch}
            className="btn-primary"
            disabled={isLaunching || questionCount === 0}
            style={{
              padding: '8px 20px',
              background: 'linear-gradient(135deg, #34A853 0%, #1a73e8 100%)',
              border: 'none',
              boxShadow: '0 4px 14px rgba(52, 168, 83, 0.4)'
            }}
          >
            <Play size={16} fill="currentColor" /> {isLaunching ? 'Launching...' : 'Host Live Now (Get PIN & QR)'}
          </button>
        </div>
      </div>

      {/* Quiz Details Panel */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              QUIZ TITLE
            </label>
            <input
              type="text"
              value={currentQuiz.title || ''}
              onChange={(e) => setCurrentQuiz({ ...currentQuiz, title: e.target.value })}
              placeholder="e.g. DevFest 2026 Grand Quiz"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              DESCRIPTION
            </label>
            <input
              type="text"
              value={currentQuiz.description || ''}
              onChange={(e) => setCurrentQuiz({ ...currentQuiz, description: e.target.value })}
              placeholder="e.g. Live stage trivia showdown with 1,000 developers!"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.95rem' }}
            />
          </div>
        </div>
      </div>

      {/* TAB 1: PASTE & AUTO-GENERATE QUESTIONS */}
      {activeTab === 'PASTE' && (
        <div className="glass-panel animate-pop" style={{ padding: '28px', marginBottom: '24px' }}>
          {/* Instructions Banner */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--google-blue)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '4px' }}>
                <Sparkles size={20} /> Paste Series of Questions
              </div>
              <p style={{ color: 'var(--text-sub)', fontSize: '0.95rem', maxWidth: '650px', lineHeight: 1.5 }}>
                Paste questions from ChatGPT, Google Docs, or notes. The system will automatically detect the question prompt, choices, code blocks, and correct answers!
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleLoadSample}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                💡 Load Sample Questions
              </button>
              {rawText && (
                <button
                  onClick={() => setRawText('')}
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.85rem', color: '#ff6b6b' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Syntax Hint */}
          <div style={{ background: 'rgba(66, 133, 244, 0.08)', border: '1px solid rgba(66, 133, 244, 0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
            <strong>Supported Formats:</strong> Mark correct answers with <code>*</code>, <code>(correct)</code>, or <code>Answer: B</code>.
            Example: <code>A) Kotlin</code> | <code>*B) Dart</code> | <code>C) Rust</code> | <code>D) Go</code>
          </div>

          {/* Text Area */}
          <div style={{ marginBottom: '20px' }}>
            <textarea
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Paste your questions here...\n\nExample:\n1. What is the primary language used to build cross-platform apps with Flutter?\nA) Kotlin\n*B) Dart\nC) TypeScript\nD) Rust\n\n2. Which company created Flutter?\nA. Apple\nB. Microsoft\n*C. Google\nD. Amazon`}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                background: '#0d1117',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#e6edf3',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                resize: 'vertical'
              }}
            />
          </div>

          {/* Shuffling Options & Generate Button Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#fff' }}>
                <input
                  type="checkbox"
                  checked={autoShuffleAnswers}
                  onChange={(e) => setAutoShuffleAnswers(e.target.checked)}
                />
                <span>🔀 Reshuffle answer choices automatically</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#fff' }}>
                <input
                  type="checkbox"
                  checked={autoShuffleQuestions}
                  onChange={(e) => setAutoShuffleQuestions(e.target.checked)}
                />
                <span>🔀 Reshuffle question order</span>
              </label>
            </div>

            <button
              onClick={handleGenerateFromText}
              className="btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '1.05rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                border: 'none',
                boxShadow: '0 4px 18px rgba(66, 133, 244, 0.4)'
              }}
            >
              <Sparkles size={18} /> Auto-Generate Quiz
            </button>
          </div>

          {/* Generated Questions Summary / Preview */}
          {questionCount > 0 && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--google-green)' }}>
                    ✅ {questionCount} Questions Ready
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    (Ready to host or tweak in the form editor)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleReshuffleAll}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    🎲 Reshuffle All
                  </button>
                  <button
                    onClick={() => setActiveTab('VISUAL')}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--google-blue)' }}
                  >
                    Open in Form Editor →
                  </button>
                </div>
              </div>

              {/* Preview Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentQuiz.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--google-blue)', fontSize: '0.9rem' }}>
                          #{idx + 1}
                        </span>
                        <span className="glass-pill" style={{ padding: '2px 8px', fontSize: '0.75rem', color: 'var(--google-yellow)' }}>
                          {q.category || 'General'}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          ⏱ {q.timeLimit || 20}s
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '8px' }}>
                        {q.question}
                      </div>

                      {/* Options summary */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctIndex;
                          return (
                            <span
                              key={oIdx}
                              style={{
                                fontSize: '0.8rem',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: isCorrect ? 'rgba(52, 168, 83, 0.25)' : 'rgba(255,255,255,0.05)',
                                border: isCorrect ? '1px solid #34A853' : '1px solid rgba(255,255,255,0.1)',
                                color: isCorrect ? '#4ade80' : 'var(--text-muted)',
                                fontWeight: isCorrect ? 700 : 500
                              }}
                            >
                              {isCorrect ? '✓ ' : ''}{opt}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveQuestion(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '6px' }}
                      title="Delete Question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VISUAL FORM EDITOR */}
      {activeTab === 'VISUAL' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              Questions List ({questionCount})
            </h3>
            <button onClick={handleAddQuestion} className="btn-secondary" style={{ padding: '8px 16px' }}>
              <Plus size={18} /> Add Question
            </button>
          </div>

          {questionCount === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No questions yet.</p>
              <button onClick={() => setActiveTab('PASTE')} className="btn-primary">
                📋 Paste Questions Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {currentQuiz.questions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="glass-panel animate-pop" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="glass-pill" style={{ padding: '4px 12px', fontWeight: 800, color: 'var(--google-blue)', fontSize: '0.9rem' }}>
                        Question {qIdx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder="Category (e.g. AI, Cloud, Web)"
                        value={q.category || ''}
                        onChange={(e) => handleUpdateQuestion(qIdx, 'category', e.target.value)}
                        style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--google-yellow)', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} color="var(--text-muted)" />
                        <select
                          value={q.timeLimit || 20}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'timeLimit', Number(e.target.value))}
                          style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', padding: '4px 8px', fontSize: '0.85rem' }}
                        >
                          <option value={10}>10 seconds</option>
                          <option value={15}>15 seconds</option>
                          <option value={20}>20 seconds</option>
                          <option value={30}>30 seconds</option>
                          <option value={60}>60 seconds</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleRemoveQuestion(qIdx)}
                        style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '4px' }}
                        title="Delete Question"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div style={{ marginBottom: '16px' }}>
                    <textarea
                      rows={2}
                      value={q.question}
                      onChange={(e) => handleUpdateQuestion(qIdx, 'question', e.target.value)}
                      placeholder="Enter question text..."
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '1.1rem', fontWeight: 600, resize: 'vertical' }}
                    />
                  </div>

                  {/* Optional Code Snippet */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <Code size={14} /> Optional Code Snippet
                    </div>
                    <textarea
                      rows={2}
                      value={q.codeSnippet || ''}
                      onChange={(e) => handleUpdateQuestion(qIdx, 'codeSnippet', e.target.value)}
                      placeholder="const answer = 42; (leave empty if not a code question)"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0d1117', border: '1px solid rgba(255,255,255,0.12)', color: '#58a6ff', fontFamily: 'monospace', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* 4 Options & Correct Answer Radio */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {q.options.map((opt, optIdx) => {
                      const colors = ['#e21b3c', '#1368ce', '#ffa602', '#26890c'];
                      const symbols = ['▲', '◆', '●', '■'];
                      const isCorrect = q.correctIndex === optIdx;

                      return (
                        <div
                          key={optIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: isCorrect ? 'rgba(52, 168, 83, 0.15)' : 'rgba(0,0,0,0.25)',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: isCorrect ? '2px solid #34A853' : '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          <span style={{ color: colors[optIdx], fontWeight: 900, fontSize: '1.2rem' }}>
                            {symbols[optIdx]}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem' }}
                          />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', cursor: 'pointer', color: isCorrect ? '#4ade80' : 'var(--text-muted)' }}>
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={isCorrect}
                              onChange={() => handleUpdateQuestion(qIdx, 'correctIndex', optIdx)}
                            />
                            Correct
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
