import React from 'react';
import './ContentList.css';

export default function ContentList({ history, loading, onViewContent }) {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading your content...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">🎬</div>
        <h3>No content yet</h3>
        <p>Watch a YouTube video and let it end — the extension will auto-generate a quiz for you!</p>
      </div>
    );
  }

  return (
    <div className="content-list">
      <div className="grid">
        {history.map(item => (
          <div key={item.contentId} className="card">
            <div className="card-header">
              <span className={`badge ${item.contentType}`}>
                {item.contentType === 'quiz' ? '📝 QUIZ' : '💬 Q&A'}
                {item.isPartial ? ' · partial' : ''}
              </span>
              <span className="date">
                {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h3 className="card-title">{item.pageTitle}</h3>
            <p className="card-domain">🌐 {item.domain}</p>
            <button className="view-btn" onClick={() => onViewContent(item.contentId)}>
              View Content →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
