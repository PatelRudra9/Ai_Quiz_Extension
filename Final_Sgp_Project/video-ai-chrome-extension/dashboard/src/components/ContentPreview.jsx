import React, { useState, useEffect, useRef } from 'react';
import { validateAnswers, savePerformance } from '../services/api';
import './ContentPreview.css';

export default function ContentPreview({ content }) {
  const isQuiz = content.contentType === 'quiz';
  const data = content.generatedData;
  const storageKey = `quiz_progress_${content.contentId}`;
  const startTimeRef = useRef(Date.now());

  const [userAnswers, setUserAnswers] = useState(() => {
    try { const s = localStorage.getItem(storageKey); return s ? JSON.parse(s).userAnswers : {}; }
    catch { return {}; }
  });
  const [validationResults, setValidationResults] = useState(() => {
    try { const s = localStorage.getItem(storageKey); return s ? JSON.parse(s).validationResults : null; }
    catch { return null; }
  });
  const [showResults, setShowResults] = useState(() => {
    try { const s = localStorage.getItem(storageKey); return s ? JSON.parse(s).showResults : false; }
    catch { return false; }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ userAnswers, validationResults, showResults }));
  }, [userAnswers, validationResults, showResults, storageKey]);

  const handleQuizAnswer = (qi, oi) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [qi]: oi }));
  };

  const handleQAAnswer = (qi, val) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [qi]: val }));
  };

  const handleSubmit = async () => {
    const total = isQuiz ? data.questions?.length : data.qa?.length;
    if (Object.keys(userAnswers).length < total) {
      alert('Please answer all questions before submitting!');
      return;
    }
    setIsSubmitting(true);
    try {
      const results = await validateAnswers(content.contentId, userAnswers);
      setValidationResults(results);
      setShowResults(true);
      // Save performance record
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
      await savePerformance(content.contentId, results.score ?? null, total, timeTaken).catch(() => {});
    } catch (err) {
      alert('Failed to validate answers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setUserAnswers({});
    setValidationResults(null);
    setShowResults(false);
    startTimeRef.current = Date.now();
    localStorage.removeItem(storageKey);
  };

  return (
    <div className="preview">
      <div className="preview-header">
        <div className="preview-meta">
          <span className={`preview-badge ${content.contentType}`}>
            {content.contentType === 'quiz' ? '📝 QUIZ' : '💬 Q&A'}
          </span>
          <span className="preview-date">
            {new Date(content.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="preview-card">
        <h1 className="preview-title">{data.title}</h1>
        <div className="preview-info">
          <p><strong>Video:</strong> {content.pageTitle}</p>
          <p><strong>Source:</strong> <a href={content.pageUrl} target="_blank" rel="noreferrer" style={{color:'#7c3aed'}}>{content.domain}</a></p>
          <p><strong>Generated:</strong> {new Date(content.createdAt).toLocaleString()}</p>
        </div>

        {showResults && isQuiz && validationResults && (
          <div className="score-banner">
            <div>
              <div className="score-label">Your Score</div>
              <div className="score-text">{validationResults.score} / {validationResults.total}</div>
            </div>
            <div className="score-percentage">
              {Math.round((validationResults.score / validationResults.total) * 100)}%
            </div>
          </div>
        )}

        <div className="preview-content">
          {isQuiz && (
            <div className="quiz-preview">
              {data.questions?.map((q, index) => {
                const result = showResults ? validationResults?.results[index] : null;
                return (
                  <div key={index} className="quiz-item">
                    <div className="question-number">Question {index + 1}</div>
                    <h3 className="question-text">{q.question}</h3>
                    <div className="options-grid">
                      {q.options?.map((opt, i) => {
                        const isSelected = userAnswers[index] === i;
                        const isCorrect = showResults && result?.correctAnswer === i;
                        const isUserWrong = showResults && isSelected && !result?.isCorrect;
                        return (
                          <div key={i}
                            className={`option ${isSelected ? 'selected' : ''} ${showResults ? (isCorrect ? 'correct' : isUserWrong ? 'wrong' : '') : ''} ${!showResults ? 'clickable' : ''}`}
                            onClick={() => handleQuizAnswer(index, i)}>
                            <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                            <span className="option-text">{opt}</span>
                            {showResults && isCorrect && <span className="check">✓</span>}
                            {showResults && isUserWrong && <span className="cross">✗</span>}
                          </div>
                        );
                      })}
                    </div>
                    {showResults && result?.explanation && (
                      <div className="explanation"><strong>Explanation:</strong> {result.explanation}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isQuiz && (
            <div className="qa-preview">
              {data.qa?.map((item, index) => {
                const result = showResults ? validationResults?.results[index] : null;
                return (
                  <div key={index} className="qa-item">
                    <div className="qa-question">
                      <span className="qa-label">Q{index + 1}</span>
                      <p>{item.question}</p>
                    </div>
                    <div className="qa-answer-input">
                      <span className="qa-label">A</span>
                      <textarea className="answer-textarea" placeholder="Type your answer here..."
                        value={userAnswers[index] || ''} onChange={e => handleQAAnswer(index, e.target.value)}
                        disabled={showResults} rows={3} />
                    </div>
                    {showResults && result?.correctAnswer && (
                      <div className="qa-correct-answer">
                        <strong>Correct Answer:</strong>
                        <p>{result.correctAnswer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="preview-actions">
          {!showResults ? (
            <button className="submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Checking...' : 'Submit Answers'}
            </button>
          ) : (
            <button className="reset-btn" onClick={handleReset}>Try Again</button>
          )}
        </div>
      </div>
    </div>
  );
}
