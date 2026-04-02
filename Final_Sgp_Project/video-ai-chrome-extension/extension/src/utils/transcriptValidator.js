/**
 * Transcript Validator
 * Checks if the transcript extracted from transcript.js is valid and displays it in text format
 */

import { extractTranscript, extractPageText } from './transcript.js';

/**
 * Validate transcript quality
 * @param {string} text - Transcript text
 * @returns {Object} Validation result
 */
function validateTranscript(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, reason: 'Transcript is null or not a string' };
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { valid: false, reason: 'Transcript is empty' };
  }

  if (trimmed.length < 100) {
    return { valid: false, reason: `Too short — only ${trimmed.length} characters (minimum 100 required)` };
  }

  const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 20) {
    return { valid: false, reason: `Too few words — only ${wordCount} words (minimum 20 required)` };
  }

  // Check for garbage/binary content
  const nonPrintable = (trimmed.match(/[^\x20-\x7E\n\r\t]/g) || []).length;
  const nonPrintableRatio = nonPrintable / trimmed.length;
  if (nonPrintableRatio > 0.3) {
    return { valid: false, reason: `Too many non-printable characters (${(nonPrintableRatio * 100).toFixed(1)}%)` };
  }

  // Check for repetitive content
  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
  if (sentences.length > 5 && uniqueSentences.size / sentences.length < 0.4) {
    return { valid: false, reason: 'Transcript appears repetitive — may be low quality captions' };
  }

  // All checks passed
  return {
    valid: true,
    reason: 'Transcript looks good',
    stats: {
      characters: trimmed.length,
      words: wordCount,
      sentences: sentences.length,
      uniqueSentences: uniqueSentences.size,
    }
  };
}

/**
 * Run transcript check on the current page video
 * Logs a full report to the browser console
 * @param {HTMLVideoElement} videoElement
 */
export async function checkTranscript(videoElement) {
  console.group('%c[Transcript Validator] Running check...', 'color: #7c3aed; font-weight: bold; font-size: 14px;');

  // ── Step 1: Extract ──
  console.log('%cStep 1: Extracting transcript...', 'color: #0ea5e9; font-weight: bold;');
  let transcript = null;
  let source = 'none';

  try {
    transcript = await extractTranscript(videoElement);
    if (transcript && transcript.length > 100) {
      source = 'YouTube captions / VTT track';
    } else {
      console.warn('Primary extraction failed or too short. Falling back to page text...');
      transcript = extractPageText();
      source = 'Page text (fallback)';
    }
  } catch (err) {
    console.error('Extraction error:', err.message);
    transcript = extractPageText();
    source = 'Page text (fallback after error)';
  }

  // ── Step 2: Validate ──
  console.log('%cStep 2: Validating transcript...', 'color: #0ea5e9; font-weight: bold;');
  const result = validateTranscript(transcript);

  // ── Step 3: Report ──
  console.log('%cStep 3: Report', 'color: #0ea5e9; font-weight: bold;');
  console.log('─'.repeat(60));
  console.log(`Source       : ${source}`);
  console.log(`Valid        : ${result.valid ? '✅ YES' : '❌ NO'}`);
  console.log(`Reason       : ${result.reason}`);

  if (result.stats) {
    console.log(`Characters   : ${result.stats.characters}`);
    console.log(`Words        : ${result.stats.words}`);
    console.log(`Sentences    : ${result.stats.sentences}`);
    console.log(`Unique Lines : ${result.stats.uniqueSentences}`);
  }

  console.log('─'.repeat(60));

  // ── Step 4: Show transcript text ──
  if (transcript) {
    console.log('%cTranscript Text (first 1000 chars):', 'color: #10b981; font-weight: bold;');
    console.log(transcript.substring(0, 1000));
    if (transcript.length > 1000) {
      console.log(`... [${transcript.length - 1000} more characters]`);
    }
    console.log('─'.repeat(60));
    console.log('%cFull Transcript Text:', 'color: #10b981; font-weight: bold;');
    console.log(transcript);
  } else {
    console.warn('No transcript text available.');
  }

  console.groupEnd();

  return { valid: result.valid, source, transcript, stats: result.stats || null };
}

/**
 * Quick test — call this from browser console on any YouTube page:
 *   window.__checkTranscript()
 */
export function registerConsoleHelper() {
  window.__checkTranscript = async () => {
    const video = document.querySelector('video');
    if (!video) {
      console.error('[Transcript Validator] No video element found on this page.');
      return;
    }
    return await checkTranscript(video);
  };
  console.log('%c[Transcript Validator] Ready! Run window.__checkTranscript() in console to test.', 'color: #7c3aed; font-weight: bold;');
}
