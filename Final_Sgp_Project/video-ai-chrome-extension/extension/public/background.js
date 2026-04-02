// Background service worker
console.log('[Background] Service worker starting...');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Video AI Extension installed');
});

// Single message listener to handle all message types
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request.type);

  // Handle VIDEO_ENDED
  if (request.type === 'VIDEO_ENDED') {
    console.log('[Background] Video ended on:', request.data);
    sendResponse({ success: true });
    return true;
  }

  // Handle OPEN_DASHBOARD
  if (request.type === 'OPEN_DASHBOARD') {
    const dashboardUrl = 'http://localhost:3000';
    console.log('[Background] Opening dashboard:', dashboardUrl);

    chrome.tabs.query({}, (tabs) => {
      const existingTab = tabs.find(tab =>
        tab.url && (tab.url.startsWith(dashboardUrl) || tab.url.includes('localhost:3000'))
      );

      if (existingTab) {
        chrome.tabs.update(existingTab.id, { active: true }, () => {
          chrome.windows.update(existingTab.windowId, { focused: true });
          sendResponse({ success: true, reused: true });
        });
      } else {
        chrome.tabs.create({ url: dashboardUrl }, () => {
          sendResponse({ success: true, reused: false });
        });
      }
    });

    return true; // Keep channel open for async response
  }

  // Handle API_REQUEST
  if (request.type === 'API_REQUEST') {
    const { method = 'GET', path = '/', body } = request;
    console.log('[Background] API_REQUEST:', method, path);

    chrome.storage.local.get(['authToken'], (result) => {
      const token = result.authToken || null;
      const url = `http://localhost:5000/api${path}`;
      console.log('[Background] Fetching:', url);

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
        .then(async (res) => {
          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch (e) { data = text; }
          console.log('[Background] Fetch result:', res.status, res.ok);
          sendResponse({ ok: res.ok, status: res.status, data });
        })
        .catch((err) => {
          console.error('[Background] Fetch error:', err.message);
          sendResponse({ ok: false, error: err.message });
        });
    });

    return true; // Keep channel open for async response
  }

  // Handle AUTH_REQUEST
  if (request.type === 'AUTH_REQUEST') {
    const { action, body } = request;
    const path = action === 'register' ? '/auth/register' : action === 'login' ? '/auth/login' : '/auth/profile';
    const method = action === 'profile' ? 'GET' : 'POST';
    console.log('[Background] AUTH_REQUEST:', action);

    (async () => {
      const baseHosts = ['localhost', '127.0.0.1'];

      // For profile, include the token
      let token = null;
      if (action === 'profile') {
        const result = await chrome.storage.local.get(['authToken']);
        token = result.authToken || null;
      }

      for (const host of baseHosts) {
        const url = `http://${host}:5000/api${path}`;
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          });
          const data = await res.json();

          // If login/register successful, save token
          if (res.ok && data.token) {
            await chrome.storage.local.set({
              authToken: data.token,
              userName: data.user?.name || '',
              userEmail: data.user?.email || '',
            });
          }

          sendResponse({ ok: res.ok, status: res.status, data });
          return;
        } catch (err) {
          console.error('[Background] Auth error for', url, err);
          continue;
        }
      }
      sendResponse({ ok: false, error: 'Auth request failed' });
    })();

    return true; // Keep channel open for async response
  }

  // Handle LOGOUT
  if (request.type === 'LOGOUT') {
    console.log('[Background] Logging out');
    chrome.storage.local.remove(['authToken', 'userName', 'userEmail'], () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  // Unknown message type
  console.warn('[Background] Unknown message type:', request.type);
  sendResponse({ ok: false, error: 'Unknown message type' });
  return true;
});

console.log('[Background] Service worker ready');
