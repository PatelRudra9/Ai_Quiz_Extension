const API_BASE_URL = 'http://localhost:5000/api';

// ─── Auth helpers ───

function getToken() {
  return localStorage.getItem('videoai_token');
}

function setToken(token) {
  localStorage.setItem('videoai_token', token);
}

export function clearToken() {
  localStorage.removeItem('videoai_token');
  localStorage.removeItem('videoai_user');
}

export function getSavedUser() {
  const user = localStorage.getItem('videoai_user');
  return user ? JSON.parse(user) : null;
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── Auth API ───

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Login failed');
  setToken(data.token);
  localStorage.setItem('videoai_user', JSON.stringify(data.user));
  return data;
}

export async function registerUser(name, email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Registration failed');
  setToken(data.token);
  localStorage.setItem('videoai_user', JSON.stringify(data.user));
  return data;
}

// ─── Content API ───

export async function getHistory(filter = 'all') {
  const url = filter === 'all'
    ? `${API_BASE_URL}/history`
    : `${API_BASE_URL}/history?type=${filter}`;

  const response = await fetch(url, { headers: authHeaders() });

  if (response.status === 401) {
    clearToken();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) throw new Error('Failed to fetch history');
  return await response.json();
}

export async function getContentById(contentId) {
  const response = await fetch(`${API_BASE_URL}/history/${contentId}`, {
    headers: authHeaders(),
  });

  if (response.status === 401) {
    clearToken();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) throw new Error('Failed to fetch content');
  return await response.json();
}

export async function validateAnswers(contentId, userAnswers) {
  const response = await fetch(`${API_BASE_URL}/history/${contentId}/validate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userAnswers }),
  });

  if (response.status === 401) {
    clearToken();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) throw new Error('Failed to validate answers');
  return await response.json();
}

export async function savePerformance(contentId, score, total, timeTakenSeconds) {
  const response = await fetch(`${API_BASE_URL}/performance`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ contentId, score, total, timeTakenSeconds }),
  });
  if (!response.ok) throw new Error('Failed to save performance');
  return await response.json();
}

export async function getPerformance() {
  const response = await fetch(`${API_BASE_URL}/performance`, { headers: authHeaders() });
  if (response.status === 401) { clearToken(); throw new Error('Session expired. Please log in again.'); }
  if (!response.ok) throw new Error('Failed to fetch performance');
  return await response.json();
}
