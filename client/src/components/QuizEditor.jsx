import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Check, Code, Clock } from 'lucide-react';

// Resolve the backend URL the same way SocketContext does
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

export default function QuizEditor({ onBackToHome }) {
  const [quizzes, setQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchUrl = `${getBackendUrl()}/api/quizzes`;

    fetch(fetchUrl)
      .then(res => res.json())
      .then(data => {
        setQuizzes(data);
        if (data.length > 0) {
          setCurrentQuiz(JSON.parse(JSON.stringify(data[0])));
        } else {
          // No quizzes yet — show empty state instead of spinning forever
          setCurrentQuiz(null);
        }
      })
      .catch(err => {
        console.error('Error fetching quizzes:', err);
        setCurrentQuiz(null);
      });
  }, []);

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
      questions: [...currentQuiz.questions, newQ]
    });
  };

  const handleRemoveQuestion = (idx) => {
    if (!currentQuiz || currentQuiz.questions.length <= 1) return;
    const updated = currentQuiz.questions.filter((_, i) => i !== idx);
    setCurrentQuiz({ ...currentQuiz, questions: updated });
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

  const handleSave = async () => {
    if (!currentQuiz) return;
    setIsSaving(true);
    setSaveSuccess(false);

    const saveUrl = `${getBackendUrl()}/api/quizzes`;

    try {
      const res = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentQuiz)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Error saving quiz:', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (quizzes.length === 0 && !currentQuiz) {
    const emptyQuiz = {
      id: `quiz_${Date.now()}`,
      title: 'DevFest 2026 Quiz',
      questions: [{
        id: `q_${Date.now()}`,
        question: 'What is Google I/O?',
        options: ['A developer conference', 'A search engine', 'An AI model', 'A cloud service'],
        correctIndex: 0,
        timeLimit: 20,
        points: 1000,
        category: 'Google',
        codeSnippet: ''
      }]
    };
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ fontSize: '1.2rem', opacity: 0.7 }}>📋 No quizzes yet.</p>
        <button className="btn-primary" onClick={() => { setQuizzes([emptyQuiz]); setCurrentQuiz(emptyQuiz); }}>
          + Create Your First Quiz
        </button>
        <button onClick={onBackToHome} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
          ← Back to Arena
        </button>
      </div>
    );
  }

  if (!currentQuiz) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading Quiz Editor...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px', minHeight: '100vh' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button onClick={onBackToHome} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to Arena
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleAddQuestion} className="btn-secondary">
            <Plus size={18} /> Add Question
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={isSaving}>
            {saveSuccess ? <><Check size={18} /> Saved!</> : <><Save size={18} /> {isSaving ? 'Saving...' : 'Save Quiz'}</>}
          </button>
        </div>
      </div>

      {/* Quiz Details */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            QUIZ TITLE
          </label>
          <input
            type="text"
            value={currentQuiz.title}
            onChange={(e) => setCurrentQuiz({ ...currentQuiz, title: e.target.value })}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            DESCRIPTION
          </label>
          <input
            type="text"
            value={currentQuiz.description}
            onChange={(e) => setCurrentQuiz({ ...currentQuiz, description: e.target.value })}
            style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '1rem' }}
          />
        </div>
      </div>

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {currentQuiz.questions.map((q, qIdx) => (
          <div key={q.id || qIdx} className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="glass-pill" style={{ padding: '4px 12px', fontWeight: 800, color: 'var(--google-blue)', fontSize: '0.9rem' }}>
                  Question {qIdx + 1}
                </span>
                <input
                  type="text"
                  placeholder="Category (e.g. AI, Cloud)"
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

                {currentQuiz.questions.length > 1 && (
                  <button
                    onClick={() => handleRemoveQuestion(qIdx)}
                    style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '4px' }}
                    title="Delete Question"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
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
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0d1117', border: '1px solid rgba(255,255,255,0.12)', color: '#58a6ff', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
              />
            </div>

            {/* 4 Options & Correct Answer Radio */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                      background: 'rgba(0,0,0,0.25)',
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
    </div>
  );
}
