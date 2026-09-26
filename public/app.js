/**
 * German B1 Exam Prep Web Application - Client-Side Engine
 * Dual-Mode Quiz State Machine (Interactive Practice & Exam Simulation)
 */

// Option letter labels for multiple-choice questions
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

// LocalStorage key for session state persistence
const STORAGE_KEY = 'german_b1_quiz_state';

// Application State
const appState = {
  view: 'setup', // 'setup' | 'loading' | 'error' | 'quiz' | 'results'
  mode: 'practice', // 'practice' | 'exam'
  subject: 'Grammatik',
  topic: 'Konjunktiv II',
  questions: [],
  currentIndex: 0,
  userAnswers: [], // stores selected index per question (0-4)
  score: 0,
  isCurrentQuestionAnswered: false,
  errorMessage: ''
};

// DOM Element References
const elements = {
  views: {
    setup: document.getElementById('setup-view'),
    loading: document.getElementById('loading-view'),
    error: document.getElementById('error-view'),
    quiz: document.getElementById('quiz-view'),
    results: document.getElementById('results-view')
  },
  form: document.getElementById('quiz-config-form'),
  topicSelect: document.getElementById('topic-select'),
  modeRadios: document.querySelectorAll('input[name="study-mode"]'),
  modeCards: document.querySelectorAll('.mode-card'),
  startBtn: document.getElementById('start-btn'),
  retryBtn: document.getElementById('retry-btn'),
  backToSetupBtn: document.getElementById('back-to-setup-btn'),
  errorMessage: document.getElementById('error-message'),
  // Quiz View Elements
  topicBadge: document.getElementById('topic-badge'),
  modeBadge: document.getElementById('mode-badge'),
  progressText: document.getElementById('progress-text'),
  scoreText: document.getElementById('score-text'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  questionIdTag: document.getElementById('question-id-tag'),
  questionText: document.getElementById('question-text'),
  optionsContainer: document.getElementById('options-container'),
  feedbackPanel: document.getElementById('feedback-panel'),
  feedbackIcon: document.getElementById('feedback-icon'),
  feedbackTitle: document.getElementById('feedback-title'),
  feedbackTip: document.getElementById('feedback-tip'),
  actionBtn: document.getElementById('action-btn'),
  actionBtnText: document.getElementById('action-btn-text'),
  // Results Elements
  finalScoreNum: document.getElementById('final-score-num'),
  finalTotalNum: document.getElementById('final-total-num'),
  percentageBadge: document.getElementById('percentage-badge'),
  resultsMessage: document.getElementById('results-message'),
  resultsTrophy: document.getElementById('results-trophy'),
  reviewList: document.getElementById('review-list'),
  restartQuizBtn: document.getElementById('restart-quiz-btn'),
  newTopicBtn: document.getElementById('new-topic-btn')
};

/**
 * Switch the active visible view section
 * @param {'setup'|'loading'|'error'|'quiz'|'results'} viewName 
 */
function switchView(viewName) {
  appState.view = viewName;
  Object.keys(elements.views).forEach((key) => {
    const el = elements.views[key];
    if (el) {
      if (key === viewName) {
        el.classList.remove('hidden');
        el.classList.add('active');
      } else {
        el.classList.add('hidden');
        el.classList.remove('active');
      }
    }
  });
}

/**
 * Update UI for the selected study mode card
 */
function updateModeCardStyles() {
  elements.modeCards.forEach((card) => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.checked) {
      card.classList.add('active');
      appState.mode = radio.value;
    } else {
      card.classList.remove('active');
    }
  });
}

/**
 * Persist current quiz progress to localStorage
 */
function saveProgress() {
  if (appState.questions && appState.questions.length > 0 && appState.view !== 'setup' && appState.view !== 'loading' && appState.view !== 'error') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
      console.warn('Could not save quiz state to localStorage', e);
    }
  }
}

/**
 * Clear saved quiz state from localStorage
 */
function clearSavedProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Could not clear quiz state from localStorage', e);
  }
}

/**
 * Restore quiz state from localStorage upon reload/app switch
 * @returns {boolean} True if a session was restored
 */
function restoreSavedProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;

    const parsedState = JSON.parse(saved);
    if (parsedState && Array.isArray(parsedState.questions) && parsedState.questions.length > 0) {
      const savedWasAnswered = Boolean(parsedState.isCurrentQuestionAnswered);
      Object.assign(appState, parsedState);

      // Restore form/selection inputs
      if (elements.topicSelect && appState.topic) {
        elements.topicSelect.value = appState.topic;
      }
      elements.modeRadios.forEach((radio) => {
        if (radio.value === appState.mode) {
          radio.checked = true;
        }
      });
      updateModeCardStyles();

      if (appState.view === 'quiz') {
        if (elements.topicBadge) {
          elements.topicBadge.textContent = appState.topic;
        }
        if (elements.modeBadge) {
          elements.modeBadge.textContent = appState.mode === 'practice' ? 'Übungsmodus' : 'Prüfungssimulation';
          elements.modeBadge.className = appState.mode === 'practice' ? 'meta-badge' : 'meta-badge secondary';
        }

        switchView('quiz');
        renderCurrentQuestion();

        // Restore answered state and UI indications if user had already picked an option on this question
        const currentAns = appState.userAnswers[appState.currentIndex];
        if (currentAns !== null && currentAns !== undefined) {
          const currentQ = appState.questions[appState.currentIndex];
          const optionButtons = elements.optionsContainer ? elements.optionsContainer.querySelectorAll('.option-btn') : [];

          if (appState.mode === 'practice' && savedWasAnswered) {
            appState.isCurrentQuestionAnswered = true;
            const isCorrect = currentAns === currentQ.correct;

            optionButtons.forEach((btn, idx) => {
              btn.disabled = true;
              if (idx === currentQ.correct) {
                btn.classList.add('correct');
              } else if (idx === currentAns && !isCorrect) {
                btn.classList.add('incorrect');
              }
            });

            if (elements.feedbackPanel) {
              elements.feedbackPanel.classList.remove('hidden');
              elements.feedbackPanel.className = `feedback-panel ${isCorrect ? 'success' : 'error'}`;
              if (elements.feedbackIcon) {
                elements.feedbackIcon.textContent = isCorrect ? '✓' : '✗';
              }
              if (elements.feedbackTitle) {
                elements.feedbackTitle.textContent = isCorrect ? 'Richtig!' : 'Leider nicht richtig';
              }
              if (elements.feedbackTip) {
                elements.feedbackTip.textContent = currentQ.tip || (isCorrect ? 'Ausgezeichnet!' : `Die richtige Antwort ist: ${currentQ.options[currentQ.correct]}`);
              }
            }

            if (elements.actionBtn) {
              elements.actionBtn.classList.remove('hidden');
            }

            if (elements.scoreText) {
              elements.scoreText.textContent = `Punkte: ${appState.score} / ${appState.currentIndex + 1}`;
            }
          } else if (appState.mode === 'exam') {
            optionButtons.forEach((btn, idx) => {
              if (idx === currentAns) {
                btn.classList.add('selected');
              } else {
                btn.classList.remove('selected');
              }
            });
            if (elements.actionBtn) {
              elements.actionBtn.classList.remove('hidden');
            }
          }
        }
        return true;
      } else if (appState.view === 'results') {
        finishQuiz();
        return true;
      }
    }
  } catch (e) {
    console.warn('Could not restore quiz state', e);
    clearSavedProgress();
  }
  return false;
}

/**
 * Fetch 5 questions from the serverless API proxy
 */
async function loadQuestions() {
  switchView('loading');

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: appState.subject,
        topic: appState.topic
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: Fehler bei der Anfrage.`);
    }

    const data = await response.json();
    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error('Ungültiges Antwortformat vom Server erhalten.');
    }

    startQuiz(data.questions);
  } catch (err) {
    console.error('Quiz generation error:', err);
    appState.errorMessage = err.message || 'Die Fragen konnten nicht geladen werden. Bitte prüfe deine Internetverbindung.';
    if (elements.errorMessage) {
      elements.errorMessage.textContent = appState.errorMessage;
    }
    switchView('error');
  }
}

/**
 * Initialize a new quiz session with the loaded questions
 * @param {Array} questions 
 */
function startQuiz(questions) {
  appState.questions = questions;
  appState.currentIndex = 0;
  appState.userAnswers = new Array(questions.length).fill(null);
  appState.score = 0;
  appState.isCurrentQuestionAnswered = false;

  // Set header badges
  if (elements.topicBadge) {
    elements.topicBadge.textContent = appState.topic;
  }
  if (elements.modeBadge) {
    elements.modeBadge.textContent = appState.mode === 'practice' ? 'Übungsmodus' : 'Prüfungssimulation';
    elements.modeBadge.className = appState.mode === 'practice' ? 'meta-badge' : 'meta-badge secondary';
  }

  switchView('quiz');
  renderCurrentQuestion();
  saveProgress();
}

/**
 * Render the current question based on mode and index
 */
function renderCurrentQuestion() {
  const currentQ = appState.questions[appState.currentIndex];
  const total = appState.questions.length;
  appState.isCurrentQuestionAnswered = false;

  // Update progress
  const progressPercent = ((appState.currentIndex + 1) / total) * 100;
  if (elements.progressBarFill) {
    elements.progressBarFill.style.width = `${progressPercent}%`;
  }
  if (elements.progressText) {
    elements.progressText.textContent = `Frage ${appState.currentIndex + 1} von ${total}`;
  }

  // Update score badge
  if (elements.scoreText) {
    if (appState.mode === 'practice') {
      elements.scoreText.textContent = `Punkte: ${appState.score} / ${appState.currentIndex}`;
    } else {
      elements.scoreText.textContent = `Aufgabe ${appState.currentIndex + 1}/${total}`;
    }
  }

  // Question details
  if (elements.questionIdTag) {
    elements.questionIdTag.textContent = `Aufgabe ${appState.currentIndex + 1} (${currentQ.level || 'B1'})`;
  }
  if (elements.questionText) {
    elements.questionText.textContent = currentQ.question;
  }

  // Reset feedback panel and action button
  if (elements.feedbackPanel) {
    elements.feedbackPanel.classList.add('hidden');
    elements.feedbackPanel.className = 'feedback-panel hidden';
  }
  if (elements.actionBtn) {
    elements.actionBtn.classList.add('hidden');
    const isLast = appState.currentIndex === total - 1;
    if (elements.actionBtnText) {
      if (appState.mode === 'exam') {
        elements.actionBtnText.textContent = isLast ? 'Prüfung abgeben & Auswerten' : 'Nächste Frage';
      } else {
        elements.actionBtnText.textContent = isLast ? 'Zum Gesamtergebnis' : 'Nächste Frage';
      }
    }
  }

  // Render options
  if (elements.optionsContainer) {
    elements.optionsContainer.innerHTML = '';

    currentQ.options.forEach((optText, optIndex) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.dataset.index = optIndex;

      const letterSpan = document.createElement('span');
      letterSpan.className = 'option-letter';
      letterSpan.textContent = OPTION_LETTERS[optIndex] || `${optIndex + 1}`;

      const textSpan = document.createElement('span');
      textSpan.className = 'option-text';
      textSpan.textContent = optText;

      btn.appendChild(letterSpan);
      btn.appendChild(textSpan);

      btn.addEventListener('click', () => handleOptionClick(optIndex));
      elements.optionsContainer.appendChild(btn);
    });
  }
}

/**
 * Handle user click on an option
 * @param {number} selectedIndex 
 */
function handleOptionClick(selectedIndex) {
  const currentQ = appState.questions[appState.currentIndex];
  const optionButtons = elements.optionsContainer.querySelectorAll('.option-btn');

  if (appState.mode === 'practice') {
    // Practice Mode: Single answer lock, instant feedback
    if (appState.isCurrentQuestionAnswered) return;
    appState.isCurrentQuestionAnswered = true;
    appState.userAnswers[appState.currentIndex] = selectedIndex;

    const isCorrect = selectedIndex === currentQ.correct;
    if (isCorrect) {
      appState.score += 1;
    }

    // Disable all options
    optionButtons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === currentQ.correct) {
        btn.classList.add('correct');
      } else if (idx === selectedIndex && !isCorrect) {
        btn.classList.add('incorrect');
      }
    });

    // Show feedback tip panel
    if (elements.feedbackPanel) {
      elements.feedbackPanel.classList.remove('hidden');
      elements.feedbackPanel.className = `feedback-panel ${isCorrect ? 'success' : 'error'}`;
      if (elements.feedbackIcon) {
        elements.feedbackIcon.textContent = isCorrect ? '✓' : '✗';
      }
      if (elements.feedbackTitle) {
        elements.feedbackTitle.textContent = isCorrect ? 'Richtig!' : 'Leider nicht richtig';
      }
      if (elements.feedbackTip) {
        elements.feedbackTip.textContent = currentQ.tip || (isCorrect ? 'Ausgezeichnet!' : `Die richtige Antwort ist: ${currentQ.options[currentQ.correct]}`);
      }
    }

    // Show Next Question action button
    if (elements.actionBtn) {
      elements.actionBtn.classList.remove('hidden');
    }

    // Update score indicator
    if (elements.scoreText) {
      elements.scoreText.textContent = `Punkte: ${appState.score} / ${appState.currentIndex + 1}`;
    }

    saveProgress();
  } else {
    // Exam Simulation Mode: Allow selection, advance with action button
    appState.userAnswers[appState.currentIndex] = selectedIndex;

    optionButtons.forEach((btn, idx) => {
      if (idx === selectedIndex) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });

    // Reveal Next / Submit button once an option is picked
    if (elements.actionBtn) {
      elements.actionBtn.classList.remove('hidden');
    }

    saveProgress();
  }
}

/**
 * Advance to next question or display final results
 */
function handleNextAction() {
  const total = appState.questions.length;

  if (appState.mode === 'exam') {
    // Ensure user answered current question
    if (appState.userAnswers[appState.currentIndex] === null) {
      return;
    }
  }

  if (appState.currentIndex < total - 1) {
    appState.currentIndex += 1;
    renderCurrentQuestion();
    saveProgress();
  } else {
    finishQuiz();
  }
}

/**
 * Calculate final results and display results view
 */
function finishQuiz() {
  const total = appState.questions.length;

  // In Exam Mode, compute final score from recorded userAnswers
  if (appState.mode === 'exam') {
    let computedScore = 0;
    appState.questions.forEach((q, idx) => {
      if (appState.userAnswers[idx] === q.correct) {
        computedScore += 1;
      }
    });
    appState.score = computedScore;
  }

  const percentage = Math.round((appState.score / total) * 100);

  // Update Score and Percentage UI
  if (elements.finalScoreNum) elements.finalScoreNum.textContent = appState.score;
  if (elements.finalTotalNum) elements.finalTotalNum.textContent = total;
  if (elements.percentageBadge) elements.percentageBadge.textContent = `${percentage}%`;

  // Performance feedback based on CEFR B1 passing threshold (60%)
  let message = '';
  let trophy = '🏆';

  if (percentage === 100) {
    trophy = '🌟';
    message = 'Hervorragend! Du hast alle Fragen richtig beantwortet. Du beherrschst dieses Thema auf B1-Niveau perfekt!';
  } else if (percentage >= 80) {
    trophy = '🎉';
    message = 'Sehr gut bestanden! Eine starke Leistung. Du bist bestens für die B1-Prüfung vorbereitet.';
  } else if (percentage >= 60) {
    trophy = '👍';
    message = 'Bestanden (ab 60%). Solide Grundkenntnisse, aber schau dir die Erklärungen der falschen Antworten noch einmal an.';
  } else {
    trophy = '📚';
    message = 'Nicht bestanden (unter 60%). Nutze die Tipps unten zur Wiederholung und starte einen neuen Versuch!';
  }

  if (elements.resultsTrophy) elements.resultsTrophy.textContent = trophy;
  if (elements.resultsMessage) elements.resultsMessage.textContent = message;

  // Build Question Review List
  if (elements.reviewList) {
    elements.reviewList.innerHTML = '';

    appState.questions.forEach((q, idx) => {
      const userChoiceIdx = appState.userAnswers[idx];
      const isCorrect = userChoiceIdx === q.correct;

      const card = document.createElement('div');
      card.className = `review-card ${isCorrect ? 'correct' : 'incorrect'}`;

      const header = document.createElement('div');
      header.className = 'review-card-header';
      header.innerHTML = `
        <span>Frage ${idx + 1}</span>
        <span class="review-badge ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? 'Richtig ✓' : 'Falsch ✗'}</span>
      `;

      const questionEl = document.createElement('div');
      questionEl.className = 'review-question';
      questionEl.textContent = q.question;

      const details = document.createElement('div');
      details.className = 'review-details';

      const userAnsText = userChoiceIdx !== null && q.options[userChoiceIdx] 
        ? `${OPTION_LETTERS[userChoiceIdx]}: ${q.options[userChoiceIdx]}` 
        : 'Keine Antwort ausgewählt';
      const correctAnsText = `${OPTION_LETTERS[q.correct]}: ${q.options[q.correct]}`;

      details.innerHTML = `
        <div class="review-user-ans"><strong>Deine Antwort:</strong> ${userAnsText}</div>
        ${!isCorrect ? `<div class="review-correct-ans"><strong>Richtige Antwort:</strong> ${correctAnsText}</div>` : ''}
        ${q.tip ? `<div class="review-tip">💡 <strong>Tipp:</strong> ${q.tip}</div>` : ''}
      `;

      card.appendChild(header);
      card.appendChild(questionEl);
      card.appendChild(details);
      elements.reviewList.appendChild(card);
    });
  }

  switchView('results');
  saveProgress();
}

/**
 * Event Listeners and Initialization
 */
function init() {
  // Study mode card clicks
  elements.modeRadios.forEach((radio) => {
    radio.addEventListener('change', updateModeCardStyles);
  });
  elements.modeCards.forEach((card) => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        updateModeCardStyles();
      }
    });
  });

  // Start form submit
  if (elements.form) {
    elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const selectedOption = elements.topicSelect.options[elements.topicSelect.selectedIndex];
      appState.topic = elements.topicSelect.value;
      appState.subject = selectedOption ? (selectedOption.dataset.subject || 'Grammatik') : 'Grammatik';
      loadQuestions();
    });
  }

  // Action Button (Next / Finish)
  if (elements.actionBtn) {
    elements.actionBtn.addEventListener('click', handleNextAction);
  }

  // Retry Button on error
  if (elements.retryBtn) {
    elements.retryBtn.addEventListener('click', loadQuestions);
  }

  // Back to Setup from error
  if (elements.backToSetupBtn) {
    elements.backToSetupBtn.addEventListener('click', () => {
      clearSavedProgress();
      switchView('setup');
    });
  }

  // Restart Quiz for same topic
  if (elements.restartQuizBtn) {
    elements.restartQuizBtn.addEventListener('click', () => {
      clearSavedProgress();
      loadQuestions();
    });
  }

  // Pick new topic
  if (elements.newTopicBtn) {
    elements.newTopicBtn.addEventListener('click', () => {
      clearSavedProgress();
      switchView('setup');
    });
  }

  // Mobile background & unload listeners to guarantee state persistence
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveProgress();
    }
  });
  window.addEventListener('pagehide', saveProgress);
  window.addEventListener('beforeunload', saveProgress);

  // Initial style sync
  updateModeCardStyles();
  restoreSavedProgress();
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
