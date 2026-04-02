import React, { useEffect, useState } from 'react';
import { getPerformance } from '../services/api';
import './Performance.css';

function formatTime(seconds) {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60), s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60), rm = m % 60;
  return `${h}h ${rm}m`;
}

function formatDate(d) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function AccuracyBar({ value, color }) {
  return (
    <div style={{ background: '#e2e8f0', borderRadius: 6, height: 8, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${value || 0}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function ScoreRing({ pct, size = 100 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = ((pct || 0) / 100) * circ;
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fill: color, fontSize: size * 0.22, fontWeight: 800, fontFamily: 'inherit' }}>
        {pct ?? '—'}%
      </text>
    </svg>
  );
}

export default function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview'); // overview | history

  useEffect(() => {
    getPerformance()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="perf-loading">
      <div className="perf-spinner" />
      <p>Loading performance data...</p>
    </div>
  );

  if (error) return (
    <div className="perf-error">⚠️ {error}</div>
  );

  const { stats, records } = data;
  const quizRecords = records.filter(r => r.contentType === 'quiz');
  const qaRecords = records.filter(r => r.contentType === 'qa');

  // Build accuracy trend (last 10 quiz attempts)
  const trend = quizRecords.slice(0, 10).reverse();

  return (
    <div className="perf-wrap">
      {/* Tabs */}
      <div className="perf-tabs">
        {[['overview', '📊 Overview'], ['history', '📋 Attempt History']].map(([t, label]) => (
          <button key={t} className={`perf-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Top stat cards */}
          <div className="perf-stats-grid">
            {[
              { icon: '🎯', label: 'Avg Accuracy', val: `${stats.avgAccuracy}%`, sub: 'across all quizzes', color: '#7c3aed' },
              { icon: '🏆', label: 'Best Score', val: `${stats.bestScore}%`, sub: 'highest quiz score', color: '#f59e0b' },
              { icon: '⏱️', label: 'Total Screen Time', val: formatTime(stats.totalScreenTime), sub: 'time spent learning', color: '#10b981' },
              { icon: '📝', label: 'Quizzes Taken', val: stats.quizAttempts, sub: 'total attempts', color: '#667eea' },
              { icon: '💬', label: 'Q&A Reviewed', val: stats.qaAttempts, sub: 'total attempts', color: '#f093fb' },
              { icon: '⚡', label: 'Avg Time / Quiz', val: formatTime(stats.avgTime), sub: 'per attempt', color: '#06b6d4' },
            ].map(s => (
              <div key={s.label} className="perf-stat-card">
                <div className="perf-stat-icon" style={{ background: s.color + '18' }}>{s.icon}</div>
                <div className="perf-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="perf-stat-label">{s.label}</div>
                <div className="perf-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Overall performance ring + breakdown */}
          <div className="perf-row">
            <div className="perf-card perf-ring-card">
              <div className="perf-card-title">Overall Performance</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
                <ScoreRing pct={stats.avgAccuracy} size={130} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  {[
                    { label: 'Excellent (≥80%)', count: quizRecords.filter(r => r.accuracy >= 80).length, color: '#10b981' },
                    { label: 'Good (60–79%)', count: quizRecords.filter(r => r.accuracy >= 60 && r.accuracy < 80).length, color: '#f59e0b' },
                    { label: 'Needs Work (<60%)', count: quizRecords.filter(r => r.accuracy < 60).length, color: '#ef4444' },
                  ].map(b => (
                    <div key={b.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#475569', fontWeight: 600 }}>{b.label}</span>
                        <span style={{ color: b.color, fontWeight: 700 }}>{b.count}</span>
                      </div>
                      <AccuracyBar value={quizRecords.length ? (b.count / quizRecords.length) * 100 : 0} color={b.color} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Accuracy trend */}
            <div className="perf-card" style={{ flex: 1 }}>
              <div className="perf-card-title">Recent Quiz Accuracy Trend</div>
              {trend.length === 0 ? (
                <div className="perf-empty-small">No quiz attempts yet</div>
              ) : (
                <div className="perf-trend">
                  {trend.map((r, i) => {
                    const color = r.accuracy >= 70 ? '#10b981' : r.accuracy >= 40 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={i} className="perf-trend-bar-wrap" title={`${r.pageTitle}\n${r.accuracy}%`}>
                        <div className="perf-trend-pct" style={{ color }}>{r.accuracy}%</div>
                        <div className="perf-trend-bar-bg">
                          <div className="perf-trend-bar-fill" style={{ height: `${r.accuracy}%`, background: color }} />
                        </div>
                        <div className="perf-trend-label">{new Date(r.attemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent attempts */}
          <div className="perf-card">
            <div className="perf-card-title">Recent Attempts</div>
            {records.length === 0 ? (
              <div className="perf-empty">
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <p>No attempts yet. Go take a quiz!</p>
              </div>
            ) : (
              <div className="perf-table-wrap">
                <table className="perf-table">
                  <thead>
                    <tr>
                      <th>Video</th>
                      <th>Type</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                      <th>Time Taken</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 8).map((r, i) => {
                      const color = r.accuracy >= 70 ? '#10b981' : r.accuracy >= 40 ? '#f59e0b' : '#ef4444';
                      return (
                        <tr key={i}>
                          <td className="perf-td-title">{r.pageTitle}</td>
                          <td><span className={`perf-badge ${r.contentType}`}>{r.contentType === 'quiz' ? '📝 Quiz' : '💬 Q&A'}</span></td>
                          <td>{r.score !== null ? `${r.score}/${r.total}` : '—'}</td>
                          <td>
                            {r.accuracy !== null ? (
                              <span style={{ color, fontWeight: 700 }}>{r.accuracy}%</span>
                            ) : '—'}
                          </td>
                          <td>{formatTime(r.timeTakenSeconds)}</td>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>{formatDate(r.attemptedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="perf-card">
          <div className="perf-card-title">Full Attempt History ({records.length} records)</div>
          {records.length === 0 ? (
            <div className="perf-empty">
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p>No attempts recorded yet.</p>
            </div>
          ) : (
            <div className="perf-table-wrap">
              <table className="perf-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Video Title</th>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>Accuracy</th>
                    <th>Time Taken</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const color = r.accuracy >= 70 ? '#10b981' : r.accuracy >= 40 ? '#f59e0b' : '#ef4444';
                    return (
                      <tr key={i}>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                        <td className="perf-td-title">{r.pageTitle}</td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{r.domain}</td>
                        <td><span className={`perf-badge ${r.contentType}`}>{r.contentType === 'quiz' ? '📝 Quiz' : '💬 Q&A'}</span></td>
                        <td>{r.score !== null ? `${r.score}/${r.total}` : '—'}</td>
                        <td>
                          {r.accuracy !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color, fontWeight: 700, minWidth: 36 }}>{r.accuracy}%</span>
                              <AccuracyBar value={r.accuracy} color={color} />
                            </div>
                          ) : '—'}
                        </td>
                        <td>{formatTime(r.timeTakenSeconds)}</td>
                        <td style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(r.attemptedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
