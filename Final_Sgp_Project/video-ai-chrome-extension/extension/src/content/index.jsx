import { generateVideoIdentifier } from '../utils/hash.js';
import { extractTranscript, extractPageText } from '../utils/transcript.js';
import { getVideoDuration } from '../utils/youtube.js';
import { registerConsoleHelper } from '../utils/transcriptValidator.js';

const processedVideos = new WeakSet();

function getVideoSrc(video) {
  if (video.currentSrc) return video.currentSrc;
  const src = video.querySelector('source');
  return (src && src.src) || video.src || '';
}

// ─── API call via background.js (attaches auth token automatically) ───
function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Request timed out after 45 seconds')), 45000);
    chrome.runtime.sendMessage({ type: 'API_REQUEST', method, path, body }, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (response && response.ok) resolve(response.data);
      else reject(new Error(response?.data?.message || response?.error || 'API request failed'));
    });
  });
}

// ─── Overlay styles injected once ───
function injectStyles() {
  if (document.getElementById('video-ai-styles')) return;
  const style = document.createElement('style');
  style.id = 'video-ai-styles';
  style.textContent = `
    #video-ai-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    @keyframes vai-spin { to { transform: rotate(360deg); } }
    @keyframes vai-fadeIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes vai-pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    .vai-spinner { width:48px; height:48px; border:4px solid rgba(255,255,255,0.2); border-top-color:#fff; border-radius:50%; animation:vai-spin 0.8s linear infinite; }
    .vai-card { animation: vai-fadeIn 0.3s ease; }
    .vai-btn { cursor:pointer; border:none; font-weight:600; transition:all 0.2s; }
    .vai-btn:hover { transform:translateY(-1px); filter:brightness(1.08); }
    .vai-btn:active { transform:translateY(0); }
    .vai-option { cursor:pointer; border:2px solid #e2e8f0; border-radius:10px; padding:12px 16px; display:flex; align-items:center; gap:12px; background:#fff; transition:all 0.15s; margin-bottom:8px; }
    .vai-option:hover { border-color:#667eea; background:#f5f3ff; }
    .vai-option.selected { border-color:#667eea; background:#ede9fe; }
    .vai-option.correct { border-color:#10b981; background:#d1fae5; }
    .vai-option.wrong { border-color:#ef4444; background:#fee2e2; }
    .vai-progress-bar { height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden; }
    .vai-progress-fill { height:100%; background:linear-gradient(90deg,#667eea,#764ba2); border-radius:3px; transition:width 0.3s; }
    .vai-scroll { overflow-y:auto; scrollbar-width:thin; scrollbar-color:#c4b5fd transparent; }
    .vai-scroll::-webkit-scrollbar { width:6px; }
    .vai-scroll::-webkit-scrollbar-thumb { background:#c4b5fd; border-radius:3px; }
  `;
  document.head.appendChild(style);
}

// ─── Main overlay container ───
function getOrCreateRoot() {
  let root = document.getElementById('video-ai-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'video-ai-root';
    root.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(root);
  }
  return root;
}

function removeRoot() {
  const r = document.getElementById('video-ai-root');
  if (r) r.remove();
}

// ─── Loading screen ───
function showLoading(contentType) {
  injectStyles();
  const root = getOrCreateRoot();
  root.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(15,15,30,0.85);backdrop-filter:blur(6px);"></div>
    <div class="vai-card" style="position:relative;background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:24px;padding:48px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.5);">
      <div style="margin-bottom:24px;display:flex;justify-content:center;">
        <div class="vai-spinner"></div>
      </div>
      <h2 style="color:#fff;margin:0 0 8px;font-size:22px;font-weight:700;">Generating ${contentType === 'quiz' ? 'Quiz' : 'Q&A'}...</h2>
      <p style="color:rgba(255,255,255,0.6);margin:0;font-size:14px;">AI is analyzing the video content</p>
      <div style="margin-top:24px;display:flex;gap:6px;justify-content:center;">
        ${[0,1,2].map(i=>`<div style="width:8px;height:8px;border-radius:50%;background:#a78bfa;animation:vai-pulse 1.2s ease ${i*0.2}s infinite;"></div>`).join('')}
      </div>
    </div>
  `;
}

// ─── Choice screen (shown first when video ends) ───
function showChoiceScreen(videoData) {
  injectStyles();
  const root = getOrCreateRoot();
  root.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(15,15,30,0.85);backdrop-filter:blur(6px);"></div>
    <div class="vai-card" style="position:relative;background:#fff;border-radius:24px;padding:36px 32px;max-width:460px;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.4);">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="font-size:52px;margin-bottom:12px;">🎓</div>
        <h2 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#1e1b4b;">Video Complete!</h2>
        <p style="margin:0;color:#64748b;font-size:14px;">Generate learning content from this video</p>
      </div>
      <button id="vai-quiz-btn" class="vai-btn" style="width:100%;padding:18px;border-radius:14px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:16px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:10px;">
        <span style="font-size:22px;">📝</span>
        <div style="text-align:left;">
          <div style="font-size:16px;font-weight:700;">Quiz (MCQs)</div>
          <div style="font-size:12px;opacity:0.85;font-weight:400;">Test your knowledge with multiple choice</div>
        </div>
      </button>
      <button id="vai-qa-btn" class="vai-btn" style="width:100%;padding:18px;border-radius:14px;background:linear-gradient(135deg,#f093fb,#f5576c);color:#fff;font-size:16px;margin-bottom:20px;display:flex;align-items:center;justify-content:center;gap:10px;">
        <span style="font-size:22px;">💬</span>
        <div style="text-align:left;">
          <div style="font-size:16px;font-weight:700;">Q&A Pairs</div>
          <div style="font-size:12px;opacity:0.85;font-weight:400;">Review with question & answer format</div>
        </div>
      </button>
      <button id="vai-close-btn" class="vai-btn" style="width:100%;padding:12px;border-radius:10px;background:#f1f5f9;color:#64748b;font-size:14px;">✕ Skip for now</button>
    </div>
  `;
  document.getElementById('vai-quiz-btn').onclick = () => handleGenerate(videoData, 'quiz');
  document.getElementById('vai-qa-btn').onclick = () => handleGenerate(videoData, 'qa');
  document.getElementById('vai-close-btn').onclick = removeRoot;
}

// ─── Quiz display ───
function showQuiz(data) {
  injectStyles();
  const root = getOrCreateRoot();
  const questions = data.questions || [];
  let current = 0;
  const answers = {};

  function render() {
    const q = questions[current];
    const answered = answers[current] !== undefined;
    const pct = Math.round(((current) / questions.length) * 100);

    root.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(15,15,30,0.9);backdrop-filter:blur(6px);overflow-y:auto;padding:20px;display:flex;align-items:flex-start;justify-content:center;">
        <div class="vai-card" style="position:relative;background:#fff;border-radius:24px;padding:32px;max-width:620px;width:100%;margin:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div>
              <div style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Question ${current+1} of ${questions.length}</div>
              <div style="font-size:18px;font-weight:700;color:#1e1b4b;margin-top:2px;">${data.title || 'Quiz'}</div>
            </div>
            <button id="vai-exit" class="vai-btn" style="background:#f1f5f9;color:#64748b;padding:8px 14px;border-radius:8px;font-size:13px;">✕ Exit</button>
          </div>
          <div class="vai-progress-bar" style="margin-bottom:24px;">
            <div class="vai-progress-fill" style="width:${pct}%;"></div>
          </div>
          <p style="font-size:17px;font-weight:600;color:#1e293b;margin:0 0 20px;line-height:1.6;">${q.question}</p>
          <div id="vai-options">
            ${q.options.map((opt, i) => `
              <div class="vai-option ${answers[current]===i?'selected':''}" data-idx="${i}">
                <span style="min-width:28px;height:28px;border-radius:50%;background:${answers[current]===i?'#667eea':'#e2e8f0'};color:${answers[current]===i?'#fff':'#64748b'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">${String.fromCharCode(65+i)}</span>
                <span style="font-size:14px;color:#334155;">${opt}</span>
              </div>
            `).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:24px;gap:12px;">
            <button id="vai-prev" class="vai-btn" style="padding:12px 24px;border-radius:10px;background:#f1f5f9;color:#64748b;font-size:14px;${current===0?'opacity:0.4;pointer-events:none;':''}">← Previous</button>
            ${current === questions.length-1
              ? `<button id="vai-submit" class="vai-btn" style="padding:12px 28px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:14px;">Submit Quiz ✓</button>`
              : `<button id="vai-next" class="vai-btn" style="padding:12px 28px;border-radius:10px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:14px;${!answered?'opacity:0.5;pointer-events:none;':''}">Next →</button>`
            }
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.vai-option').forEach(el => {
      el.onclick = () => {
        answers[current] = parseInt(el.dataset.idx);
        render();
      };
    });
    document.getElementById('vai-exit').onclick = removeRoot;
    if (current > 0) document.getElementById('vai-prev').onclick = () => { current--; render(); };
    const nextBtn = document.getElementById('vai-next');
    if (nextBtn) nextBtn.onclick = () => { current++; render(); };
    const submitBtn = document.getElementById('vai-submit');
    if (submitBtn) submitBtn.onclick = () => {
      if (Object.keys(answers).length < questions.length) {
        alert('Please answer all questions before submitting.');
        return;
      }
      showResults(data, answers);
    };
  }
  render();
}

// ─── Results screen ───
function showResults(data, answers) {
  const questions = data.questions || [];
  let score = 0;
  questions.forEach((q, i) => { if (answers[i] === q.answerIndex) score++; });
  const pct = Math.round((score / questions.length) * 100);
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const emoji = pct >= 70 ? '🎉' : pct >= 40 ? '👍' : '📚';

  const root = getOrCreateRoot();
  root.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(15,15,30,0.9);backdrop-filter:blur(6px);overflow-y:auto;padding:20px;display:flex;align-items:flex-start;justify-content:center;">
      <div class="vai-card vai-scroll" style="position:relative;background:#fff;border-radius:24px;padding:32px;max-width:620px;width:100%;margin:auto;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="font-size:48px;margin-bottom:8px;">${emoji}</div>
          <h2 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#1e1b4b;">Quiz Complete!</h2>
          <div style="font-size:48px;font-weight:800;color:${color};margin:12px 0;">${pct}%</div>
          <p style="margin:0;color:#64748b;font-size:15px;">You got <strong>${score}</strong> out of <strong>${questions.length}</strong> correct</p>
        </div>
        <div style="margin-bottom:24px;">
          ${questions.map((q, i) => {
            const userAns = answers[i];
            const correct = userAns === q.answerIndex;
            return `
              <div style="border:2px solid ${correct?'#10b981':'#ef4444'};border-radius:12px;padding:16px;margin-bottom:12px;background:${correct?'#f0fdf4':'#fff5f5'};">
                <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1e293b;">${i+1}. ${q.question}</p>
                <p style="margin:0 0 4px;font-size:13px;color:${correct?'#10b981':'#ef4444'};">
                  ${correct?'✓':'✗'} Your answer: ${q.options[userAns] || 'Not answered'}
                </p>
                ${!correct?`<p style="margin:0 0 4px;font-size:13px;color:#10b981;">✓ Correct: ${q.options[q.answerIndex]}</p>`:''}
                ${q.explanation?`<p style="margin:8px 0 0;font-size:12px;color:#64748b;background:#f8fafc;padding:8px;border-radius:6px;border-left:3px solid #667eea;">${q.explanation}</p>`:''}
              </div>
            `;
          }).join('')}
        </div>
        <div style="display:flex;gap:12px;">
          <button id="vai-dashboard" class="vai-btn" style="flex:1;padding:14px;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:14px;">📊 View Dashboard</button>
          <button id="vai-close-res" class="vai-btn" style="flex:1;padding:14px;border-radius:12px;background:#f1f5f9;color:#64748b;font-size:14px;">✕ Close</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('vai-dashboard').onclick = () => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
  document.getElementById('vai-close-res').onclick = removeRoot;
}

// ─── Q&A display ───
function showQA(data) {
  injectStyles();
  const root = getOrCreateRoot();
  const pairs = data.qa || [];
  root.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(15,15,30,0.9);backdrop-filter:blur(6px);overflow-y:auto;padding:20px;display:flex;align-items:flex-start;justify-content:center;">
      <div class="vai-card" style="position:relative;background:#fff;border-radius:24px;padding:32px;max-width:620px;width:100%;margin:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <div>
            <div style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Q&A — ${pairs.length} pairs</div>
            <div style="font-size:18px;font-weight:700;color:#1e1b4b;margin-top:2px;">${data.title || 'Q&A'}</div>
          </div>
          <button id="vai-qa-close" class="vai-btn" style="background:#f1f5f9;color:#64748b;padding:8px 14px;border-radius:8px;font-size:13px;">✕ Close</button>
        </div>
        ${pairs.map((item, i) => `
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:12px;">
            <div style="display:flex;gap:10px;margin-bottom:10px;">
              <span style="min-width:28px;height:28px;border-radius:8px;background:#667eea;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">Q${i+1}</span>
              <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;line-height:1.5;">${item.question}</p>
            </div>
            <div style="display:flex;gap:10px;">
              <span style="min-width:28px;height:28px;border-radius:8px;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">A</span>
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">${item.answer}</p>
            </div>
          </div>
        `).join('')}
        <div style="display:flex;gap:12px;margin-top:8px;">
          <button id="vai-qa-dashboard" class="vai-btn" style="flex:1;padding:14px;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:14px;">📊 View Dashboard</button>
          <button id="vai-qa-done" class="vai-btn" style="flex:1;padding:14px;border-radius:12px;background:#f1f5f9;color:#64748b;font-size:14px;">✕ Close</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('vai-qa-close').onclick = removeRoot;
  document.getElementById('vai-qa-done').onclick = removeRoot;
  document.getElementById('vai-qa-dashboard').onclick = () => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
}

// ─── Error screen ───
function showError(message) {
  injectStyles();
  const root = getOrCreateRoot();
  root.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(15,15,30,0.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;">
      <div class="vai-card" style="background:#fff;border-radius:24px;padding:36px;max-width:400px;width:90%;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">❌</div>
        <h3 style="margin:0 0 8px;color:#1e1b4b;font-size:20px;">Generation Failed</h3>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px;">${message}</p>
        <button id="vai-err-close" class="vai-btn" style="padding:12px 32px;border-radius:10px;background:#f1f5f9;color:#64748b;font-size:14px;">Close</button>
      </div>
    </div>
  `;
  document.getElementById('vai-err-close').onclick = removeRoot;
}

// ─── Handle generation ───
async function handleGenerate(videoData, contentType) {
  showLoading(contentType);
  try {
    const data = await apiRequest('POST', '/generate', { ...videoData, contentType });
    const generated = data.generatedData;
    if (contentType === 'quiz') showQuiz(generated);
    else showQA(generated);
  } catch (err) {
    console.error('[Video AI] Generation error:', err);
    showError(err.message || 'Could not connect to backend. Make sure it is running on port 5000.');
  }
}

// ─── Video event handler ───
async function handleVideoEvent(video, isPartial = false) {
  try {
    const videoSrc = getVideoSrc(video);
    if (!videoSrc) return;

    const pageTitle = document.title;
    const domain = window.location.hostname;
    const pageUrl = window.location.href;

    const identifierInput = isPartial
      ? `${domain}|${pageUrl}|${videoSrc}|partial_${Math.floor(video.currentTime)}`
      : `${domain}|${pageUrl}|${videoSrc}`;

    const videoIdentifier = await generateVideoIdentifier(domain, pageUrl, isPartial ? identifierInput : videoSrc);
    const transcript = await extractTranscript(video);
    const pageText = transcript || extractPageText();
    const videoDuration = await getVideoDuration(video, domain, pageUrl);
    const watchedDuration = isPartial ? Math.floor(video.currentTime) : null;

    const videoData = { videoIdentifier, pageTitle, domain, pageUrl, videoSrc, transcript: pageText, videoDuration, isPartial, watchedDuration };

    // Show choice screen — user picks quiz or Q&A
    showChoiceScreen(videoData);

    chrome.runtime.sendMessage({ type: 'VIDEO_ENDED', data: videoData });
  } catch (error) {
    console.error('[Video AI] Error handling video event:', error);
  }
}

// ─── Attach listeners ───
function attachVideoListener(video) {
  if (processedVideos.has(video)) return;
  processedVideos.add(video);

  let playStartTime = 0;
  let pauseDebounce = null;

  video.addEventListener('play', () => { playStartTime = Date.now(); });

  video.addEventListener('ended', () => {
    clearTimeout(pauseDebounce);
    handleVideoEvent(video, false);
  });

  video.addEventListener('pause', () => {
    if (video.ended) return;
    const playedMs = Date.now() - playStartTime;
    if (playedMs < 60000 || video.currentTime < 60) return;
    clearTimeout(pauseDebounce);
    pauseDebounce = setTimeout(() => handleVideoEvent(video, true), 1500);
  });

  video.addEventListener('playing', () => clearTimeout(pauseDebounce));
}

// ─── Init ───
function detectVideos() {
  document.querySelectorAll('video').forEach(attachVideoListener);
}

function init() {
  registerConsoleHelper();
  detectVideos();
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeName === 'VIDEO') attachVideoListener(node);
        else if (node.querySelectorAll) node.querySelectorAll('video').forEach(attachVideoListener);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[Video AI] Initialized');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
