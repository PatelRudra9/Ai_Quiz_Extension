import { generateContent } from './aiProvider.js';

/**
 * Validate a single quiz question structure
 * @param {Object} q - Question object
 * @returns {boolean} Whether the question is valid
 */
function isValidQuestion(q) {
  return (
    q &&
    typeof q.question === 'string' && q.question.trim().length > 0 &&
    Array.isArray(q.options) && q.options.length === 4 &&
    q.options.every(o => typeof o === 'string' && o.trim().length > 0) &&
    typeof q.answerIndex === 'number' && q.answerIndex >= 0 && q.answerIndex <= 3 &&
    typeof q.explanation === 'string' && q.explanation.trim().length > 0
  );
}

/**
 * Validate a single Q&A pair structure
 * @param {Object} item - Q&A pair
 * @returns {boolean} Whether the pair is valid
 */
function isValidQAPair(item) {
  return (
    item &&
    typeof item.question === 'string' && item.question.trim().length > 10 &&
    typeof item.answer === 'string' && item.answer.trim().length > 10
  );
}

/**
 * Parse and clean AI response text into JSON
 * @param {string} text - Raw response text
 * @returns {Object} Parsed JSON
 */
function parseAIJSON(text) {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  // Sometimes AI wraps in extra text before/after JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  return JSON.parse(cleaned);
}

/**
 * Calculate MCQ count based on video duration and transcript length
 */
function calculateMCQCount(durationInSeconds, transcriptLength) {
  const durationInHours = durationInSeconds / 3600;

  let idealCount;
  if (durationInHours < 1) idealCount = 10;
  else if (durationInHours < 2) idealCount = 15;
  else if (durationInHours < 3) idealCount = 20;
  else idealCount = 25;

  const transcriptBasedCount = Math.floor(transcriptLength / 200);
  const adjustedCount = Math.max(5, Math.min(idealCount, transcriptBasedCount));

  console.log(`[MCQ Count] Duration-based: ${idealCount}, Transcript-based: ${transcriptBasedCount}, Final: ${adjustedCount}`);
  return adjustedCount;
}

/**
 * Calculate Q&A count based on video duration and transcript length
 */
function calculateQACount(durationInSeconds, transcriptLength) {
  const durationInHours = durationInSeconds / 3600;

  let idealCount;
  if (durationInHours < 1) idealCount = 10;
  else if (durationInHours < 2) idealCount = 15;
  else if (durationInHours < 3) idealCount = 20;
  else idealCount = 25;

  const transcriptBasedCount = Math.floor(transcriptLength / 150);
  const adjustedCount = Math.max(5, Math.min(idealCount, transcriptBasedCount));

  console.log(`[Q&A Count] Duration-based: ${idealCount}, Transcript-based: ${transcriptBasedCount}, Final: ${adjustedCount}`);
  return adjustedCount;
}

/**
 * Build quiz generation prompt
 */
function buildQuizPrompt(transcript, pageTitle, mcqCount, durationInHours, isPartial, watchedDuration) {
  const partialContext = isPartial
    ? `\n⚠️ PARTIAL VIDEO: The user has only watched up to ${Math.floor(watchedDuration / 60)} minutes and ${watchedDuration % 60} seconds.
Generate questions ONLY about content covered in the FIRST ${Math.floor(watchedDuration / 60)} minutes. Do NOT ask about content after this point.\n`
    : '';

  return `You are an expert quiz generator. Your task is to create high-quality MCQ questions by deeply analyzing the video transcript below.

STEP-BY-STEP PROCESS (follow this exactly):
1. Read the entire transcript carefully.
2. Identify the KEY CONCEPTS, EXPLANATIONS, EXAMPLES, and INSIGHTS presented.
3. For each concept, formulate a question that tests deep comprehension.
4. Ensure each question REQUIRES having watched the video to answer correctly.
5. Create plausible distractors (wrong options) that test common misconceptions.
${partialContext}
========================
HARD RULES
========================

- Generate EXACTLY ${mcqCount} MCQs. Not more, not fewer.
- Every question MUST be derived from the SPOKEN CONTENT in the transcript.
- FORBIDDEN: Questions about video title, upload date, views, likes, channel name, video length, or any metadata.
- Each question must have exactly 4 options with one correct answer (answerIndex 0-3).
- Each explanation must reference what was actually said/shown in the video.

========================
QUESTION QUALITY GUIDELINES
========================

Prefer these types (in order of priority):
1. WHY questions — "Why does the speaker recommend X?"
2. HOW questions — "How does the speaker explain Y?"
3. APPLICATION questions — "What would happen if Z, according to the video?"
4. COMPARISON questions — "How did the speaker differentiate between A and B?"
5. MISCONCEPTION questions — "What common mistake did the speaker warn about?"

IMPORTANT PHRASING RULE: Every question MUST explicitly reference the video content using phrases like:
- "According to the speaker..."
- "In this video..."
- "What did the speaker/instructor explain about..."
- "In the example/demonstration shown..."
- "What analogy/comparison did the speaker use..."
- "What warning/mistake did the speaker mention..."
- "How did the speaker/instructor describe..."
Questions that do NOT reference the speaker, video, example, or demonstration are INVALID.

Avoid: trivial recall questions, yes/no reformulations, or questions answerable without the video.

========================
CONTENT
========================

Title (reference only, do NOT make questions about this): ${pageTitle}
Video Duration: ${durationInHours} hours

Transcript:
${transcript}

========================
OUTPUT (JSON only, no markdown wrapping)
========================

{
  "type": "quiz",
  "title": "Video Content Comprehension Quiz",
  "mcqCount": ${mcqCount},
  "questions": [
    {
      "question": "Clear, specific question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Brief explanation citing specific video content"
    }
  ]
}`;
}

/**
 * Build Q&A generation prompt
 */
function buildQAPrompt(transcript, pageTitle, qaCount, durationInHours, isPartial, watchedDuration) {
  const partialContext = isPartial
    ? `\n⚠️ PARTIAL VIDEO: The user has only watched up to ${Math.floor(watchedDuration / 60)} minutes and ${watchedDuration % 60} seconds.
Generate Q&A pairs ONLY about content covered in the FIRST ${Math.floor(watchedDuration / 60)} minutes. Do NOT reference content after this point.\n`
    : '';

  return `You are an expert Q&A generator. Create open-ended question-answer pairs by deeply analyzing the video transcript below.

STEP-BY-STEP PROCESS (follow this exactly):
1. Read the entire transcript carefully.
2. Identify the KEY CONCEPTS, EXPLANATIONS, EXAMPLES, and INSIGHTS presented.
3. For each concept, create a thoughtful open-ended question.
4. Write a comprehensive answer using ONLY information from the transcript.
${partialContext}
========================
HARD RULES
========================

- Generate EXACTLY ${qaCount} Q&A pairs. Not more, not fewer.
- Every question and answer MUST be derived from the SPOKEN CONTENT in the transcript.
- FORBIDDEN: Questions about video title, upload date, views, likes, channel name, video length, or any metadata.
- Answers must be 2-4 sentences, detailed and specific to the video content.
- NO multiple-choice questions — open-ended only.

========================
QUESTION QUALITY GUIDELINES
========================

Good patterns:
✔ "Why does the speaker recommend this approach?"
✔ "What problem does this technique solve according to the video?"
✔ "What mistake does the speaker warn beginners about?"
✔ "How does the speaker explain this concept using an example?"

Bad patterns (FORBIDDEN):
❌ "What is the title of the video?"
❌ "Who uploaded this video?"
❌ "How many views does it have?"

========================
CONTENT
========================

Title (reference only, do NOT make questions about this): ${pageTitle}
Video Duration: ${durationInHours} hours

Transcript:
${transcript}

========================
OUTPUT (JSON only, no markdown wrapping)
========================

{
  "type": "qa",
  "title": "Video Content Comprehension Q&A",
  "qaCount": ${qaCount},
  "qa": [
    {
      "question": "Clear, open-ended question?",
      "answer": "Detailed answer citing specific video content."
    }
  ]
}`;
}

/**
 * Generate quiz content using AI with retry logic
 * @param {string} transcript - Video transcript or page content
 * @param {string} pageTitle - Page title for context
 * @param {number} videoDuration - Video duration in seconds (optional)
 * @param {boolean} isPartial - Whether this is a partial video quiz
 * @param {number} watchedDuration - How many seconds the user watched (for partial)
 * @returns {Promise<Object>} Quiz data
 */
export async function generateQuiz(transcript, pageTitle, videoDuration = null, isPartial = false, watchedDuration = null) {
  const transcriptLength = transcript?.length || 0;
  if (transcriptLength < 100) {
    throw new Error('Transcript is too short or empty. Need at least 100 characters to generate quiz.');
  }

  // For partial videos, use watched duration for count calculation
  const effectiveDuration = isPartial && watchedDuration ? watchedDuration : videoDuration;
  const mcqCount = effectiveDuration ? calculateMCQCount(effectiveDuration, transcriptLength) : Math.max(5, Math.floor(transcriptLength / 200));
  const durationInHours = videoDuration ? (videoDuration / 3600).toFixed(2) : 'Unknown';

  console.log('='.repeat(60));
  console.log('[Quiz Generation] Parameters:');
  console.log(`  Video Duration: ${videoDuration ? `${videoDuration}s (${durationInHours}h)` : 'Not provided'}`);
  console.log(`  Partial: ${isPartial}, Watched: ${watchedDuration || 'N/A'}s`);
  console.log(`  Required MCQs: ${mcqCount}`);
  console.log(`  Transcript Length: ${transcriptLength} chars`);
  console.log('='.repeat(60));

  const prompt = buildQuizPrompt(transcript, pageTitle, mcqCount, durationInHours, isPartial, watchedDuration);

  const MAX_RETRIES = 2;
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const currentPrompt = attempt === 0 ? prompt :
        `Generate ${mcqCount} multiple-choice quiz questions based on this content.
Each question must have 4 options and one correct answerIndex (0-3) with an explanation.
Return ONLY JSON, no markdown.

Title: ${pageTitle}
Content: ${transcript}

JSON format: {"type":"quiz","title":"Quiz","mcqCount":${mcqCount},"questions":[{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]}`;

      console.log(`[Quiz Generation] Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
      const text = await generateContent(currentPrompt);

      console.log(`[Quiz Generation] Response length: ${text.length}`);

      const quizData = parseAIJSON(text);

      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        throw new Error('Invalid quiz structure — missing questions array');
      }

      // Filter out invalid questions
      const validQuestions = quizData.questions.filter(isValidQuestion);
      const invalidCount = quizData.questions.length - validQuestions.length;

      if (invalidCount > 0) {
        console.warn(`[Quiz Generation] Filtered out ${invalidCount} invalid questions`);
      }

      if (validQuestions.length < Math.min(5, mcqCount)) {
        throw new Error(`Only ${validQuestions.length} valid questions generated, need at least ${Math.min(5, mcqCount)}`);
      }

      quizData.questions = validQuestions;
      quizData.mcqCount = mcqCount;
      quizData.videoDuration = videoDuration;
      if (isPartial) {
        quizData.isPartial = true;
        quizData.watchedDuration = watchedDuration;
      }

      if (validQuestions.length !== mcqCount) {
        console.warn(`[Quiz Generation] Expected ${mcqCount} MCQs, got ${validQuestions.length}`);
      }

      console.log(`[Quiz Generation] ✓ Successfully generated ${validQuestions.length} MCQs`);
      return quizData;
    } catch (error) {
      lastError = error;
      console.error(`[Quiz Generation] Attempt ${attempt + 1} failed: ${error.message}`);
      if (attempt < MAX_RETRIES) {
        console.log('[Quiz Generation] Retrying with simplified prompt...');
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  throw new Error('Failed to generate quiz content after retries: ' + lastError.message);
}

/**
 * Generate Q&A content using AI with retry logic
 * @param {string} transcript - Video transcript or page content
 * @param {string} pageTitle - Page title for context
 * @param {number} videoDuration - Video duration in seconds (optional)
 * @param {boolean} isPartial - Whether this is a partial video Q&A
 * @param {number} watchedDuration - How many seconds the user watched (for partial)
 * @returns {Promise<Object>} Q&A data
 */
export async function generateQA(transcript, pageTitle, videoDuration = null, isPartial = false, watchedDuration = null) {
  const transcriptLength = transcript?.length || 0;
  if (transcriptLength < 100) {
    throw new Error('Transcript is too short or empty. Need at least 100 characters to generate Q&A.');
  }

  const effectiveDuration = isPartial && watchedDuration ? watchedDuration : videoDuration;
  const qaCount = effectiveDuration ? calculateQACount(effectiveDuration, transcriptLength) : Math.max(5, Math.floor(transcriptLength / 150));
  const durationInHours = videoDuration ? (videoDuration / 3600).toFixed(2) : 'Unknown';

  console.log('='.repeat(60));
  console.log('[Q&A Generation] Parameters:');
  console.log(`  Video Duration: ${videoDuration ? `${videoDuration}s (${durationInHours}h)` : 'Not provided'}`);
  console.log(`  Partial: ${isPartial}, Watched: ${watchedDuration || 'N/A'}s`);
  console.log(`  Required Q&A Pairs: ${qaCount}`);
  console.log(`  Transcript Length: ${transcriptLength} chars`);
  console.log('='.repeat(60));

  const prompt = buildQAPrompt(transcript, pageTitle, qaCount, durationInHours, isPartial, watchedDuration);

  const MAX_RETRIES = 2;
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const currentPrompt = attempt === 0 ? prompt :
        `Generate ${qaCount} open-ended question-answer pairs based on this content.
Return ONLY JSON, no markdown.

Title: ${pageTitle}
Content: ${transcript}

JSON format: {"type":"qa","title":"Q&A","qaCount":${qaCount},"qa":[{"question":"...","answer":"..."}]}`;

      console.log(`[Q&A Generation] Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
      const text = await generateContent(currentPrompt);

      console.log(`[Q&A Generation] Response length: ${text.length}`);

      const qaData = parseAIJSON(text);

      if (!qaData.qa || !Array.isArray(qaData.qa)) {
        throw new Error('Invalid Q&A structure — missing qa array');
      }

      // Filter out invalid pairs
      const validPairs = qaData.qa.filter(isValidQAPair);
      const invalidCount = qaData.qa.length - validPairs.length;

      if (invalidCount > 0) {
        console.warn(`[Q&A Generation] Filtered out ${invalidCount} invalid Q&A pairs`);
      }

      if (validPairs.length < Math.min(5, qaCount)) {
        throw new Error(`Only ${validPairs.length} valid Q&A pairs generated, need at least ${Math.min(5, qaCount)}`);
      }

      qaData.qa = validPairs;
      qaData.qaCount = qaCount;
      qaData.videoDuration = videoDuration;
      if (isPartial) {
        qaData.isPartial = true;
        qaData.watchedDuration = watchedDuration;
      }

      if (validPairs.length !== qaCount) {
        console.warn(`[Q&A Generation] Expected ${qaCount} Q&A pairs, got ${validPairs.length}`);
      }

      console.log(`[Q&A Generation] ✓ Successfully generated ${validPairs.length} Q&A pairs`);
      return qaData;
    } catch (error) {
      lastError = error;
      console.error(`[Q&A Generation] Attempt ${attempt + 1} failed: ${error.message}`);
      if (attempt < MAX_RETRIES) {
        console.log('[Q&A Generation] Retrying with simplified prompt...');
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  throw new Error('Failed to generate Q&A content after retries: ' + lastError.message);
}
