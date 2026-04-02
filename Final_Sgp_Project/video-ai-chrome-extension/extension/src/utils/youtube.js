/**
 * Extract video duration in seconds
 * Supports YouTube and generic HTML5 videos
 * @param {HTMLVideoElement} videoElement - Video element
 * @param {string} domain - Page domain
 * @param {string} pageUrl - Page URL
 * @returns {Promise<number|null>} Duration in seconds or null
 */
export async function getVideoDuration(videoElement, domain, pageUrl) {
  // Try YouTube-specific methods first
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
    const ytDuration = await getYouTubeDuration(pageUrl);
    if (ytDuration) {
      console.log('[YouTube] Duration extracted:', ytDuration, 'seconds');
      return ytDuration;
    }
  }

  // Fall back to video element duration
  if (videoElement && videoElement.duration && !isNaN(videoElement.duration) && isFinite(videoElement.duration)) {
    const duration = Math.floor(videoElement.duration);
    console.log('[Video Element] Duration extracted:', duration, 'seconds');
    return duration;
  }

  console.warn('[Duration] Could not extract video duration');
  return null;
}

/**
 * Extract duration from YouTube page
 * @param {string} pageUrl - YouTube page URL
 * @returns {Promise<number|null>} Duration in seconds or null
 */
async function getYouTubeDuration(pageUrl) {
  try {
    // Method 1: Check YouTube player API if available
    if (window.ytInitialPlayerResponse?.videoDetails?.lengthSeconds) {
      const duration = parseInt(window.ytInitialPlayerResponse.videoDetails.lengthSeconds);
      if (!isNaN(duration)) {
        return duration;
      }
    }

    // Method 2: Check window.ytInitialData
    if (window.ytInitialData?.contents) {
      const lengthText = findLengthInYtData(window.ytInitialData);
      if (lengthText) {
        return parseYouTubeDuration(lengthText);
      }
    }

    // Method 3: Parse from page metadata (microdata)
    const durationMeta = document.querySelector('meta[itemprop="duration"]');
    if (durationMeta) {
      const content = durationMeta.getAttribute('content');
      if (content) {
        return parseISO8601Duration(content);
      }
    }

    // Method 4: Parse from page text (video info)
    const timeElements = document.querySelectorAll('.ytp-time-duration, .ytp-time-current');
    for (const el of timeElements) {
      if (el.classList.contains('ytp-time-duration')) {
        const timeText = el.textContent.trim();
        const duration = parseYouTubeTimeString(timeText);
        if (duration) {
          return duration;
        }
      }
    }

    // Method 5: Check JSON-LD structured data
    const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scriptTags) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.duration) {
          return parseISO8601Duration(data.duration);
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('[YouTube Duration] Error:', error);
    return null;
  }
}

/**
 * Find length text in YouTube initial data
 * @param {Object} data - YouTube initial data
 * @returns {string|null} Length text or null
 */
function findLengthInYtData(data) {
  if (!data) return null;

  // Recursive search for lengthText
  function search(obj) {
    if (!obj || typeof obj !== 'object') return null;

    if (obj.lengthText?.simpleText) {
      return obj.lengthText.simpleText;
    }

    for (const key in obj) {
      const result = search(obj[key]);
      if (result) return result;
    }

    return null;
  }

  return search(data);
}

/**
 * Parse ISO 8601 duration (e.g., "PT3H11M11S")
 * @param {string} duration - ISO 8601 duration string
 * @returns {number|null} Duration in seconds or null
 */
function parseISO8601Duration(duration) {
  if (!duration) return null;

  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return null;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
  } catch (error) {
    console.error('[ISO8601 Parse] Error:', error);
    return null;
  }
}

/**
 * Parse YouTube time string (e.g., "3:11:11" or "45:30")
 * @param {string} timeString - Time string
 * @returns {number|null} Duration in seconds or null
 */
function parseYouTubeTimeString(timeString) {
  if (!timeString) return null;

  try {
    const parts = timeString.split(':').map(p => parseInt(p.trim()));
    
    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      // SS
      return parts[0];
    }

    return null;
  } catch (error) {
    console.error('[Time String Parse] Error:', error);
    return null;
  }
}
