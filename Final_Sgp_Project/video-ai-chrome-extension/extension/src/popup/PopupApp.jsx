import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

async function getAuthState() {
  return new Promise(resolve => {
    chrome.storage.local.get(['authToken','userName','userEmail'], r => {
      resolve({ isLoggedIn: !!r.authToken, name: r.userName || '', email: r.userEmail || '' });
    });
  });
}

async function authRequest(action, body) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'AUTH_REQUEST', action, body }, r => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (r?.ok) resolve(r.data);
      else reject(new Error(r?.data?.message || 'Auth failed'));
    });
  });
}

async function login(email, password) { return authRequest('login', { email, password }); }
async function register(name, email, password) { return authRequest('register', { name, email, password }); }
async function logout() {
  return new Promise(resolve => chrome.runtime.sendMessage({ type: 'LOGOUT' }, resolve));
}

async function apiGet(path) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'API_REQUEST', method: 'GET', path }, r => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (r?.ok) resolve(r.data);
      else reject(new Error(r?.data?.message || r?.error || 'Request failed'));
    });
  });
}

function getHistory(filter = 'all') {
  const path = filter === 'all' ? '/history' : `/history?type=${filter}`;
  return apiGet(path);
}

function getContentById(contentId) {
  return apiGet(`/history/${contentId}`);
}

export default function PopupApp() {
  const [authState, setAuthState] = useState({ isLoggedIn: false, name: '', email: '' });
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);

  useEffect(() => { getAuthState().then(setAuthState); }, []);
  useEffect(() => { if (authState.isLoggedIn) loadHistory(); }, [filter, authState.isLoggedIn]);

  const loadHistory = async () => {
    setLoading(true); setError(null);
    try {
      const data = await getHistory(filter);
      setHistory(data);
    } catch (err) { setError(err.message || 'Failed to load history'); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthError(null);
    const f = new FormData(e.target);
    try {
      await login(f.get('email'), f.get('password'));
      setAuthState(await getAuthState());
    } catch (err) { setAuthError(err.message); }
    finally { setAuthLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthError(null);
    const f = new FormData(e.target);
    try {
      await register(f.get('name'), f.get('email'), f.get('password'));
      setAuthState(await getAuthState());
    } catch (err) { setAuthError(err.message); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await logout();
    setAuthState({ isLoggedIn: false, name: '', email: '' });
    setHistory([]); setSelectedContent(null);
  };

  const handleViewContent = async (contentId) => {
    try { setSelectedContent(await getContentById(contentId)); }
    catch (err) { alert('Failed to load: ' + err.message); }
  };

  const openDashboard = () => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });

  // ─── Auth ───
  if (!authState.isLoggedIn) {
    return (
      <div style={s.wrap}>
        <div style={s.header}>
          <div style={s.headerInner}>
            <span style={{fontSize:28}}>🎓</span>
            <div>
              <div style={s.brand}>Video AI</div>
              <div style={s.brandSub}>Smart Learning Assistant</div>
            </div>
          </div>
        </div>
        <div style={{padding:'20px'}}>
          <div style={s.tabs}>
            {['login','register'].map(m => (
              <button key={m} style={{...s.tab,...(authMode===m?s.tabActive:{})}}
                onClick={()=>{setAuthMode(m);setAuthError(null);}}>
                {m==='login'?'Login':'Register'}
              </button>
            ))}
          </div>
          {authError && <div style={s.errBox}>⚠️ {authError}</div>}
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} style={s.form}>
              <input name="email" type="email" placeholder="Email address" required style={s.input}/>
              <input name="password" type="password" placeholder="Password" required minLength={6} style={s.input}/>
              <button type="submit" disabled={authLoading} style={s.submitBtn}>
                {authLoading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={s.form}>
              <input name="name" type="text" placeholder="Full name" required style={s.input}/>
              <input name="email" type="email" placeholder="Email address" required style={s.input}/>
              <input name="password" type="password" placeholder="Password (min 6 chars)" required minLength={6} style={s.input}/>
              <button type="submit" disabled={authLoading} style={s.submitBtn}>
                {authLoading ? 'Creating account...' : 'Create Account →'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ─── Content Preview ───
  if (selectedContent) return <Preview content={selectedContent} onClose={()=>setSelectedContent(null)} />;

  // ─── Main ───
  const quizCount = history.filter(i=>i.contentType==='quiz').length;
  const qaCount = history.filter(i=>i.contentType==='qa').length;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={{...s.headerInner,justifyContent:'space-between'}}>
          <div style={s.headerInner}>
            <span style={{fontSize:26}}>🎓</span>
            <div>
              <div style={s.brand}>Video AI</div>
              <div style={s.brandSub}>Hi, {authState.name}!</div>
            </div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:'8px',padding:'12px 16px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
        {[{label:'Total',val:history.length,color:'#667eea'},{label:'Quizzes',val:quizCount,color:'#764ba2'},{label:'Q&A',val:qaCount,color:'#f5576c'}].map(stat=>(
          <div key={stat.label} style={{flex:1,background:'#fff',borderRadius:'10px',padding:'10px',textAlign:'center',border:'1px solid #e2e8f0'}}>
            <div style={{fontSize:'20px',fontWeight:'800',color:stat.color}}>{stat.val}</div>
            <div style={{fontSize:'11px',color:'#94a3b8',fontWeight:'600'}}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:'6px',padding:'10px 16px',background:'#fff',borderBottom:'1px solid #e2e8f0'}}>
        {[['all','📚 All'],['quiz','📝 Quiz'],['qa','💬 Q&A']].map(([f,label])=>(
          <button key={f} style={{...s.filterBtn,...(filter===f?s.filterActive:{})}} onClick={()=>setFilter(f)}>{label}</button>
        ))}
      </div>

      {/* List */}
      <div style={{flex:1,overflowY:'auto',padding:'12px'}}>
        {loading && <div style={{textAlign:'center',padding:'32px',color:'#94a3b8'}}>Loading...</div>}
        {error && (
          <div style={{background:'#fff5f5',border:'1px solid #fecaca',borderRadius:'10px',padding:'16px',textAlign:'center'}}>
            <p style={{color:'#ef4444',margin:'0 0 10px',fontSize:'13px'}}>⚠️ {error}</p>
            <button style={s.retryBtn} onClick={loadHistory}>Retry</button>
          </div>
        )}
        {!loading && !error && history.length === 0 && (
          <div style={{textAlign:'center',padding:'40px 20px'}}>
            <div style={{fontSize:'52px',marginBottom:'12px'}}>🎬</div>
            <div style={{fontWeight:'700',color:'#1e293b',marginBottom:'6px'}}>No content yet</div>
            <div style={{fontSize:'12px',color:'#94a3b8'}}>Watch a YouTube video and let it end to generate a quiz!</div>
          </div>
        )}
        {!loading && !error && history.map(item => (
          <div key={item.contentId} style={s.card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <span style={{...s.badge,...(item.contentType==='quiz'?s.quizBadge:s.qaBadge)}}>
                {item.contentType==='quiz'?'📝 QUIZ':'💬 Q&A'}{item.isPartial?' (partial)':''}
              </span>
              <span style={{fontSize:'11px',color:'#94a3b8'}}>{formatDate(item.createdAt)}</span>
            </div>
            <div style={{fontSize:'14px',fontWeight:'600',color:'#1e293b',marginBottom:'4px',lineHeight:'1.4'}}>{item.pageTitle}</div>
            <div style={{fontSize:'11px',color:'#94a3b8',marginBottom:'12px'}}>🌐 {item.domain}</div>
            <button style={s.viewBtn} onClick={()=>handleViewContent(item.contentId)}>View Content →</button>
          </div>
        ))}
      </div>

      <div style={{padding:'12px',borderTop:'1px solid #e2e8f0',background:'#fff'}}>
        <button style={s.dashBtn} onClick={openDashboard}>📊 Open Full Dashboard</button>
      </div>
    </div>
  );
}

function formatDate(d) {
  const date = new Date(d), now = new Date();
  const diff = Math.floor((now - date) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return date.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

function Preview({ content, onClose }) {
  const isQuiz = content.contentType === 'quiz';
  const data = content.generatedData;
  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.2)',color:'#fff',border:'none',padding:'6px 14px',borderRadius:'8px',cursor:'pointer',fontSize:'13px',marginBottom:'8px'}}>← Back</button>
        <div style={{fontSize:'15px',fontWeight:'700',color:'#fff'}}>{data.title}</div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px'}}>
        {isQuiz && data.questions?.map((q,i)=>(
          <div key={i} style={{...s.card,marginBottom:'10px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#1e293b',marginBottom:'10px'}}>{i+1}. {q.question}</div>
            {q.options?.map((opt,j)=>(
              <div key={j} style={{padding:'8px 12px',borderRadius:'8px',marginBottom:'6px',fontSize:'12px',background:j===q.answerIndex?'#d1fae5':'#f8fafc',color:j===q.answerIndex?'#065f46':'#475569',border:`1px solid ${j===q.answerIndex?'#6ee7b7':'#e2e8f0'}`,fontWeight:j===q.answerIndex?'600':'400'}}>
                {String.fromCharCode(65+j)}. {opt} {j===q.answerIndex&&'✓'}
              </div>
            ))}
            {q.explanation&&<div style={{fontSize:'11px',color:'#64748b',background:'#f8fafc',padding:'8px',borderRadius:'6px',borderLeft:'3px solid #667eea',marginTop:'8px'}}>{q.explanation}</div>}
          </div>
        ))}
        {!isQuiz && data.qa?.map((item,i)=>(
          <div key={i} style={{...s.card,marginBottom:'10px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#1e293b',marginBottom:'8px'}}>Q{i+1}: {item.question}</div>
            <div style={{fontSize:'12px',color:'#475569',lineHeight:'1.6',background:'#f0fdf4',padding:'8px',borderRadius:'6px',borderLeft:'3px solid #10b981'}}>A: {item.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap: { width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',background:'#f8fafc' },
  header: { padding:'16px',background:'linear-gradient(135deg,#667eea,#764ba2)',boxShadow:'0 4px 12px rgba(102,126,234,0.4)' },
  headerInner: { display:'flex',alignItems:'center',gap:'10px' },
  brand: { fontSize:'18px',fontWeight:'800',color:'#fff' },
  brandSub: { fontSize:'11px',color:'rgba(255,255,255,0.8)' },
  logoutBtn: { background:'rgba(255,255,255,0.2)',color:'#fff',border:'none',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:'600' },
  tabs: { display:'flex',gap:'6px',marginBottom:'16px' },
  tab: { flex:1,padding:'10px',border:'2px solid #e2e8f0',borderRadius:'10px',cursor:'pointer',fontSize:'13px',fontWeight:'600',background:'#f8fafc',color:'#64748b' },
  tabActive: { background:'#fff',color:'#667eea',border:'2px solid #667eea' },
  form: { display:'flex',flexDirection:'column',gap:'10px' },
  input: { padding:'11px 14px',border:'2px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',outline:'none',background:'#fff' },
  submitBtn: { padding:'12px',background:'linear-gradient(135deg,#667eea,#764ba2)',color:'#fff',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer' },
  errBox: { background:'#fff5f5',color:'#ef4444',padding:'10px 12px',borderRadius:'8px',fontSize:'12px',marginBottom:'12px',border:'1px solid #fecaca' },
  filterBtn: { flex:1,padding:'8px',border:'2px solid transparent',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:'600',background:'#f1f5f9',color:'#64748b' },
  filterActive: { background:'#fff',color:'#667eea',border:'2px solid #667eea' },
  card: { background:'#fff',borderRadius:'12px',padding:'14px',marginBottom:'10px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'1px solid #e2e8f0' },
  badge: { padding:'4px 10px',borderRadius:'6px',fontSize:'10px',fontWeight:'700',color:'#fff' },
  quizBadge: { background:'linear-gradient(135deg,#667eea,#764ba2)' },
  qaBadge: { background:'linear-gradient(135deg,#f093fb,#f5576c)' },
  viewBtn: { width:'100%',padding:'9px',background:'linear-gradient(135deg,#667eea,#764ba2)',color:'#fff',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:'600' },
  dashBtn: { width:'100%',padding:'12px',background:'linear-gradient(135deg,#11998e,#38ef7d)',color:'#fff',border:'none',borderRadius:'10px',cursor:'pointer',fontSize:'13px',fontWeight:'700' },
  retryBtn: { padding:'8px 20px',background:'#667eea',color:'#fff',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px' },
};
