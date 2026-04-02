import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// ─── Groq Provider (Primary) ────────────────────────────────────────
const groqClient = process.env.GROQ_API_KEY
  ? new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    })
  : null;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// ─── Ollama Provider (Fallback) ─────────────────────────────────────────
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

/**
 * Generate content using Groq API
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} Generated text
 */
async function generateWithGroq(prompt) {
  if (!groqClient) {
    throw new Error('GROQ_API_KEY not configured');
  }

  console.log(`[AI Provider] Using Groq (${GROQ_MODEL})`);

  const response = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Always respond with valid JSON when asked for JSON output. Never wrap JSON in markdown code blocks.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 8192,
  });

  const text = response.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Groq returned empty response');
  }

  console.log(`[AI Provider] Groq response length: ${text.length} chars`);
  return text;
}

/**
 * Generate content using Ollama (local)
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} Generated text
 */
async function generateWithOllama(prompt) {
  console.log(`[AI Provider] Using Ollama (${OLLAMA_MODEL}) at ${OLLAMA_BASE_URL}`);

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Always respond with valid JSON when asked for JSON output. Never wrap JSON in markdown code blocks.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 8192,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.message?.content;

  if (!text) {
    throw new Error('Ollama returned empty response');
  }

  console.log(`[AI Provider] Ollama response length: ${text.length} chars`);
  return text;
}

/**
 * Generate content — tries Groq first, falls back to Ollama
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} Generated text
 */
export async function generateContent(prompt) {
  // Try Groq first
  if (groqClient) {
    try {
      return await generateWithGroq(prompt);
    } catch (error) {
      if (error.response) {
        console.error('[AI Provider] Groq API Response Error:', error.response.status, error.response.data);
      } else {
        console.error('[AI Provider] Groq Error:', error.message);
      }
      console.warn(`[AI Provider] Groq failed. Falling back to Ollama...`);
    }
  } else {
    console.log('[AI Provider] No Groq API key — trying Ollama directly');
  }

  // Fallback to Ollama
  try {
    return await generateWithOllama(prompt);
  } catch (error) {
    console.error(`[AI Provider] Ollama also failed: ${error.message}`);
    throw new Error(
      `All AI providers failed.\n` +
      `  Groq: ${groqClient ? 'configured but errored' : 'no API key'}\n` +
      `  Ollama: ${error.message}\n` +
      `Please ensure at least one provider is available.`
    );
  }
}

/**
 * Get the name of the currently active provider (for logging)
 */
export function getProviderInfo() {
  return {
    primary: groqClient ? `Groq (${GROQ_MODEL})` : 'Not configured',
    fallback: `Ollama (${OLLAMA_MODEL}) at ${OLLAMA_BASE_URL}`,
  };
}
