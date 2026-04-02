/**
 * Extract transcript from video track elements
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {Promise<string|null>} Transcript text or null
 */
export async function extractTranscript(videoElement) {
  // Try YouTube captions first (highest quality)
  const ytTranscript = await extractYouTubeTranscript();
  if (ytTranscript && ytTranscript.length > 100) {
    console.log('[Transcript] Extracted YouTube captions:', ytTranscript.length, 'chars');
    return ytTranscript;
  }

  // Try HTML5 video track elements (VTT subtitles/captions)
  const trackTranscript = await extractFromTracks(videoElement);
  if (trackTranscript && trackTranscript.length > 100) {
    console.log('[Transcript] Extracted from VTT tracks:', trackTranscript.length, 'chars');
    return trackTranscript;
  }

  return null;
}

/**
 * Extract transcript from YouTube's embedded captions data
 * @returns {Promise<string|null>} Transcript text or null
 */
async function extractYouTubeTranscript() {
  try {
    const captions = await new Promise((resolve) => {
      const eventId = Math.random().toString(36).substring(2);
      
      const listener = (event) => {
        window.removeEventListener('yt-player-response-' + eventId, listener);
        try {
          if (event.detail) resolve(JSON.parse(event.detail));
          else resolve(null);
        } catch (e) {
          resolve(null);
        }
      };
      
      window.addEventListener('yt-player-response-' + eventId, listener);
      
      // Inject script to read from main page context
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          let captions = null;
          try {
            // Method 1: Get from player API (works across SPA navigation)
            const player = document.getElementById('movie_player');
            if (player && player.getPlayerResponse) {
              const res = player.getPlayerResponse();
              if (res && res.captions) captions = res.captions;
            }
            // Method 2: Global variable (fallback for initial load)
            if (!captions && window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.captions) {
              captions = window.ytInitialPlayerResponse.captions;
            }
          } catch(e) {}
          // Pass as string to avoid Chrome isolated world cloning restrictions
          window.dispatchEvent(new CustomEvent('yt-player-response-${eventId}', { detail: captions ? JSON.stringify(captions) : null }));
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
      
      // Timeout after 2 seconds
      setTimeout(() => {
        window.removeEventListener('yt-player-response-' + eventId, listener);
        resolve(null);
      }, 2000);
    });

    if (!captions) return null;
    
    const captionTracks = captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (captionTracks && captionTracks.length > 0) {
      // Prefer English, fall back to first available
      const track = captionTracks.find(t => t.languageCode === 'en')
        || captionTracks.find(t => t.languageCode && t.languageCode.startsWith('en'))
        || captionTracks[0];

      if (track && track.baseUrl) {
        try {
          // Fetch JSON3 format which is extremely reliable
          const response = await fetch(track.baseUrl + '&fmt=json3');
          const data = await response.json();
          const text = data.events
            ?.filter(e => e.segs)
            .map(e => e.segs.map(s => s.utf8 || '').join(''))
            .join(' ')
            .replace(/\\s+/g, ' ')
            .trim();

          if (text && text.length > 100) {
            console.log('[Transcript] Extracted via injected script JSON3:', text.length, 'chars');
            return text;
          }
        } catch (e) {
          console.warn('[Transcript] Failed JSON3 fetch:', e);
        }
      }
    }
    return null;
  } catch (error) {
    console.warn('[Transcript] YouTube extraction error:', error);
    return null;
  }
}

/**
 * Recursively search ytInitialData for transcript text
 */
function findTranscriptInYtData(data, depth = 0) {
  if (!data || typeof data !== 'object' || depth > 10) return null;

  // Look for transcript segment renderer
  if (data.transcriptSegmentRenderer?.snippet?.runs) {
    return data.transcriptSegmentRenderer.snippet.runs.map(r => r.text).join('');
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findTranscriptInYtData(item, depth + 1);
      if (result) return result;
    }
  } else {
    for (const key in data) {
      const result = findTranscriptInYtData(data[key], depth + 1);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Extract transcript from HTML5 video <track> elements
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {Promise<string|null>} Transcript text or null
 */
async function extractFromTracks(videoElement) {
  const tracks = videoElement.querySelectorAll('track[kind="subtitles"], track[kind="captions"]');

  if (tracks.length === 0) return null;

  try {
    const track = tracks[0];
    const src = track.src;
    if (!src) return null;

    const response = await fetch(src);
    const vttText = await response.text();

    const lines = vttText.split('\n');
    const textLines = [];

    for (const line of lines) {
      if (line.startsWith('WEBVTT') ||
        line.includes('-->') ||
        line.trim() === '' ||
        /^\d+$/.test(line.trim())) {
        continue;
      }

      const cleanedLine = line.replace(/<[^>]*>/g, '').trim();
      if (cleanedLine) {
        textLines.push(cleanedLine);
      }
    }

    return textLines.join(' ');
  } catch (error) {
    console.error('[Transcript] Failed to extract from tracks:', error);
    return null;
  }
}

/**
 * Extract page text content as fallback
 * @param {number} maxLength - Maximum length to extract
 * @returns {string} Page text content
 */
export function extractPageText(maxLength = 20000) {
  // Try to extract main content area first (avoid ads, sidebar, comments)
  const mainSelectors = [
    'article',
    'main',
    '[role="main"]',
    '#content',
    '.content',
    '#description',          // YouTube description
    'ytd-text-inline-expander', // YouTube description
  ];

  for (const selector of mainSelectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText && el.innerText.trim().length > 200) {
      return el.innerText.trim().substring(0, maxLength);
    }
  }

  // Fallback to body text
  const bodyText = document.body.innerText || '';
  return bodyText.trim().substring(0, maxLength);
}
