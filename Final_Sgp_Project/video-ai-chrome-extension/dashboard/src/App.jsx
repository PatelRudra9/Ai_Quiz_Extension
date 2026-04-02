import React, { useState, useEffect } from 'react';
import { getHistory, getContentById, loginUser, registerUser, clearToken, getSavedUser } from './services/api.js';
import ContentList from './components/ContentList.jsx';
import ContentPreview from './components/ContentPreview.jsx';
import './App.css';

export default function App() {
  const [user, setUser] = useState(getSavedUser());
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);

  useEffect(() => { if (user) loadHistory(); }, [filter, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contentId = params.get('contentId');
    if (contentId && user) loadContent(contentId);
    const handlePop = () => {
      const p = new URLSearchParams(window.location.search);
      const id = p.get('contentId');
      if (id) loadContent(id); else setSelectedContent(null);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [user]);

  const loadHistory = async () => {
    setLoading(true); setError(null);
    try { setHistory(await getHistory(filter)); }
    catch (err) {
      if (err.message.includes('Session expired')) { handleLogout(); return; }
      setError(err.message);
    } finally { setLoading(false); }
  };

  const loadContent = async (contentId) => {
    try { setSelectedContent(await getContentById(contentId)); }
    catch (err) { console.error(err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthError(null);
    const f = new FormData(e.target);
    try { const r = await loginUser(f.get('email'), f.get('password')); setUser(r.user); }
    catch (err) { setAuthError(err.message); }
    finally { setAuthLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthError(null);
    const f = new FormData(e.target);
    try { const r = await registerUser(f.get('name'), f.get('email'), f.get('password')); setUser(r.user); }
    catch (err) { setAuthError(err.message); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = () => { clearToken(); setUser(null); setHistory([]); setSelectedContent(null); };

  const quizCount = history.filter(i => i.contentType === 'quiz').length;
  const qaCount = history.filter(i => i.contentType === 'qa').length;

  // ─── Auth ───
  if (!user) {
    return (
      <div className="app">
        <header className="header">
          <div className="header-content">
            <div className="logo-section">
              <span className="logo-icon">🎓</span>
              <div>
                <div className="logo-title">Video AI Dashboard</div>
                <div className="logo-subtitle">Smart Learning Assistant</div>
              </div>
            </div>
          </div>
        </header>
        <main className="auth-container">
          <div className="auth-card">
            <div className="auth-card-title">Welcome back 👋</div>
            <div className="auth-card-sub">Sign in to view your generated content</div>
            <div className="auth-tabs">
              {['login','register'].map(m => (
                <button key={m} className={`auth-tab ${authMode===m?'active':''}`}
                  onClick={()=>{setAuthMode(m);setAuthError(null);}}>
                  {m==='login'?'Sign In':'Register'}
                </button>
              ))}
            </div>
            {authError && <div className="auth-error">⚠️ {authError}</div>}
            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="auth-form">
                <input name="email" type="email" placeholder="Email address" required className="auth-input"/>
                <input name="password" type="password" placeholder="Password" required minLength={6} className="auth-input"/>
                <button type="submit" disabled={authLoading} className="auth-button">
                  {authLoading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="auth-form">
                <input name="name" type="text" placeholder="Full name" required className="auth-input"/>
                <input name="email" type="email" placeholder="Email address" required className="auth-input"/>
                <input name="password" type="password" placeholder="Password (min 6 chars)" required minLength={6} className="auth-input"/>
                <button type="submit" disabled={authLoading} className="auth-button">
                  {authLoading ? 'Creating account...' : 'Create Account →'}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── Content Preview ───
  if (selectedContent) {
    return (
      <div className="app">
        <header className="header">
          <div className="header-content">
            <button className="back-button" onClick={() => { setSelectedContent(null); window.history.pushState({}, '', '/'); }}>
              ← Back to Dashboard
            </button>
            <div className="user-info">
              <span className="user-email">{user.email}</span>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </header>
        <main className="main-content">
          <ContentPreview content={selectedContent} />
        </main>
      </div>
    );
  }

  // ─── Dashboard ───
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <span className="logo-icon">🎓</span>
            <div>
              <div className="logo-title">Video AI Dashboard</div>
              <div className="logo-subtitle">Welcome back, {user.name}!</div>
            </div>
          </div>
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <div className="filter-bar">
        <div className="filter-bar-inner">
          {[['all','📚 All Content'],['quiz','📝 Quizzes'],['qa','💬 Q&A']].map(([f,label]) => (
            <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}>{label}</button>
          ))}
        </div>
      </div>

      <main className="main-content">
        {/* Stats */}
        <div className="stats-row">
          {[
            {icon:'📚',val:history.length,label:'Total Generated'},
            {icon:'📝',val:quizCount,label:'Quizzes'},
            {icon:'💬',val:qaCount,label:'Q&A Sets'},
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <div>
                <div className="stat-val">{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={loadHistory}>Retry</button>
          </div>
        )}

        <ContentList
          history={history}
          loading={loading}
          onViewContent={(contentId) => {
            window.history.pushState({}, '', `?contentId=${contentId}`);
            loadContent(contentId);
          }}
        />
      </main>
    </div>
  );
}

