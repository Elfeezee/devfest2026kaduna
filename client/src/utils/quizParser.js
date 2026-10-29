/**
 * Intelligent Quiz Parser and Shuffler for DevFest 2026 Quiz Arena
 * Converts pasted raw text (from ChatGPT, notes, Google Forms, docs) into structured quiz questions.
 */

// Detect category from question text
export function detectCategory(text = '') {
  const t = text.toLowerCase();
  if (t.includes('flutter') || t.includes('dart') || t.includes('android') || t.includes('kotlin') || t.includes('ios') || t.includes('swift')) {
    return 'Mobile Dev';
  }
  if (t.includes('ai') || t.includes('gemini') || t.includes('llm') || t.includes('model') || t.includes('machine learning') || t.includes('gpt') || t.includes('neural')) {
    return 'AI & Machine Learning';
  }
  if (t.includes('cloud') || t.includes('gcp') || t.includes('aws') || t.includes('docker') || t.includes('kubernetes') || t.includes('server')) {
    return 'Cloud & Infrastructure';
  }
  if (t.includes('react') || t.includes('javascript') || t.includes('typescript') || t.includes('css') || t.includes('html') || t.includes('web')) {
    return 'Web Development';
  }
  if (t.includes('security') || t.includes('crypto') || t.includes('auth') || t.includes('token')) {
    return 'Cybersecurity';
  }
  return 'DevFest General';
}

/**
 * Parses raw pasted text into an array of question objects.
 */
export function parseQuestionsFromText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  // Normalize line breaks
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Split into question blocks
  // Matches numbered questions like "1. ", "1) ", "Question 1:", "Q1.", or double line breaks
  const blocks = splitIntoQuestionBlocks(normalized);
  const questions = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    const parsedQ = parseSingleBlock(block, i + 1);
    if (parsedQ && parsedQ.question && parsedQ.options.length >= 2) {
      questions.push(parsedQ);
    }
  }

  return questions;
}

function splitIntoQuestionBlocks(text) {
  // First attempt: check for numbered questions (e.g. "1. " or "Question 1:" or "Q1.")
  const numberedRegex = /(?:^|\n+)(?=(?:(?:Question\s*\d+|Q\d+)\s*[:.\-]|^\d+[\.\)]\s+))/gim;
  const parts = text.split(numberedRegex);

  if (parts.length > 1) {
    return parts.filter(p => p.trim().length > 0);
  }

  // Fallback: split by 2 or more empty newlines
  const doubleNewlineParts = text.split(/\n\s*\n+/);
  if (doubleNewlineParts.length > 1) {
    return doubleNewlineParts;
  }

  // Single block fallback
  return [text];
}

function parseSingleBlock(block, index) {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  let codeSnippet = '';
  const filteredLines = [];
  let inCode = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeSnippet += (codeSnippet ? '\n' : '') + line;
    } else {
      filteredLines.push(line);
    }
  }

  let explicitAnswerKey = null; // e.g. "Answer: B"
  const optionLines = [];
  const questionLines = [];

  // Option regex patterns:
  // e.g. "A) ...", "A. ...", "*B) ...", "- ...", "[A] ...", "1) ..."
  const optionPrefixRegex = /^(\*|\✓|\+)?\s*(?:\(?([A-Da-d0-9])\)|\b([A-Da-d])[\.\:\-]|[-•])\s*(.*)$/;
  const answerLineRegex = /^(?:Answer|Ans|Correct(?:\s*Answer)?)\s*[:=\-]?\s*([A-Da-d0-9]|\S+)/i;

  let readingOptions = false;

  for (const line of filteredLines) {
    // Check if line is an explicit answer declaration
    const ansMatch = line.match(answerLineRegex);
    if (ansMatch) {
      explicitAnswerKey = ansMatch[1].trim().toUpperCase();
      continue;
    }

    const optMatch = line.match(optionPrefixRegex);
    if (optMatch) {
      readingOptions = true;
      optionLines.push(line);
    } else if (readingOptions && optionLines.length > 0) {
      // Continuation of previous option or next option
      optionLines[optionLines.length - 1] += ' ' + line;
    } else {
      questionLines.push(line);
    }
  }

  // Clean Question Title
  let questionTitle = questionLines.join(' ').trim();
  // Strip question number prefix like "1. ", "Question 1: ", "Q1. "
  questionTitle = questionTitle.replace(/^(?:Question\s*\d+|Q\d+|\d+)[\.\:\-\)]\s*/i, '').trim();

  if (!questionTitle && optionLines.length > 0) {
    questionTitle = `Question ${index}`;
  }

  // Parse options and detect which one is correct
  const options = [];
  let correctIndex = -1;

  optionLines.forEach((rawOpt, optIdx) => {
    let optText = rawOpt;
    let isCorrect = false;

    // Check for leading asterisk/check: e.g. "*A) Python" or "* Option"
    if (/^[\*✓+]/.test(optText)) {
      isCorrect = true;
      optText = optText.replace(/^[\*✓+]\s*/, '');
    }

    // Check letter label e.g. "A)", "B.", "[B]"
    const labelMatch = optText.match(/^(?:\(?([A-Da-d0-9])\)|\b([A-Da-d])[\.\:\-]|[-•])\s*/);
    let letterLabel = null;
    if (labelMatch) {
      letterLabel = (labelMatch[1] || labelMatch[2] || '').toUpperCase();
      optText = optText.replace(labelMatch[0], '');
    }

    // Check for trailing asterisk: "Dart *"
    if (/\s*\*$/.test(optText)) {
      isCorrect = true;
      optText = optText.replace(/\s*\*$/, '');
    }

    // Check for trailing tags: "[correct]", "(correct)", "(answer)", "[x]"
    const correctTagRegex = /[\(\[]\s*(?:correct|answer|true|x|✓)\s*[\)\]]/i;
    if (correctTagRegex.test(optText)) {
      isCorrect = true;
      optText = optText.replace(correctTagRegex, '');
    }

    // Check if matched explicit answer key (e.g. "Answer: B")
    if (explicitAnswerKey) {
      if (letterLabel === explicitAnswerKey) {
        isCorrect = true;
      } else if (optText.trim().toLowerCase() === explicitAnswerKey.toLowerCase()) {
        isCorrect = true;
      } else if (['1', '2', '3', '4'].includes(explicitAnswerKey) && optIdx === parseInt(explicitAnswerKey) - 1) {
        isCorrect = true;
      }
    }

    optText = optText.trim();
    if (optText) {
      options.push(optText);
      if (isCorrect && correctIndex === -1) {
        correctIndex = options.length - 1;
      }
    }
  });

  // Ensure 4 options by filling with sensible fallbacks if 2 or 3 provided
  while (options.length < 4 && options.length > 0) {
    const missingNum = options.length + 1;
    options.push(`Option ${missingNum}`);
  }

  // If no correct answer was detected, default to 0
  if (correctIndex === -1) {
    correctIndex = 0;
  }

  return {
    id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    question: questionTitle || `Question ${index}`,
    options: options.slice(0, 4),
    correctIndex: Math.min(correctIndex, options.length - 1),
    timeLimit: 20,
    points: 1000,
    category: detectCategory(questionTitle),
    codeSnippet: codeSnippet.trim()
  };
}

/**
 * Shuffles an array randomly using Fisher-Yates
 */
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffles questions order
 */
export function shuffleQuestions(questions) {
  return shuffleArray(questions);
}

/**
 * Shuffles options for all questions while preserving and tracking correct answer
 */
export function shuffleOptions(questions) {
  return questions.map(q => {
    const correctValue = q.options[q.correctIndex];
    const shuffled = shuffleArray(q.options);
    const newCorrectIdx = shuffled.indexOf(correctValue);
    return {
      ...q,
      options: shuffled,
      correctIndex: newCorrectIdx >= 0 ? newCorrectIdx : 0
    };
  });
}

/**
 * Shuffles both questions order and option choices
 */
export function shuffleAll(questions) {
  const reshuffledQuestions = shuffleQuestions(questions);
  return shuffleOptions(reshuffledQuestions);
}

/**
 * Sample quiz text for DevFest Kaduna
 */
export function getSampleQuizText() {
  return `1. What is the primary programming language used to build apps with Flutter?
A) Kotlin
*B) Dart
C) TypeScript
D) Rust

2. Which Google open-source framework was introduced to accelerate Web & AI performance?
A) Angular
B) TensorFlow.js
*C) Project IDX
D) Polymer

3. In Cloud Architecture, what does 'Serverless' mean?
A) No servers exist anywhere in the world
*B) Server management and scaling are handled automatically by the cloud provider
C) Applications only run on client browsers
D) Hardware without a CPU

4. What is the main model architecture powering modern Large Language Models like Gemini?
A) Convolutional Neural Network (CNN)
B) Recurrent Neural Network (RNN)
*C) Transformer
D) Random Forest

5. Which command initializes a new Git repository in the current folder?
A) git start
*B) git init
C) git create
D) git new`;
}
