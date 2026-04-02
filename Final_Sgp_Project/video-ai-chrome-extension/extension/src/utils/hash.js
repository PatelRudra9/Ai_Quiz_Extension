/**
 * Generate SHA-256 hash
 * @param {string} message - Message to hash
 * @returns {Promise<string>} Hex string hash
 */
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generate unique video identifier
 * @param {string} domain - Video domain
 * @param {string} pageUrl - Page URL
 * @param {string} videoSrc - Video source URL
 * @returns {Promise<string>} Unique identifier
 */
export async function generateVideoIdentifier(domain, pageUrl, videoSrc) {
  const composite = `${domain}|${pageUrl}|${videoSrc}`;
  return await sha256(composite);
}
