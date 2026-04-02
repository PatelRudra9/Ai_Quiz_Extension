import { v4 as uuidv4 } from 'uuid';
import { writeFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import GeneratedContent from '../models/GeneratedContent.js';
import { generateQuiz, generateQA } from '../services/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TRANSCRIPTS_DIR = join(__dirname, '..', '..', 'transcripts');

/**
 * Save transcript to a text file (non-blocking)
 */
function saveTranscriptToFile(pageTitle, pageUrl, transcript) {
  try {
    const sanitized = (pageTitle || 'untitled')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 80);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sanitized}_${timestamp}.txt`;
    const filepath = join(TRANSCRIPTS_DIR, filename);

    const content = [
      `Title: ${pageTitle}`,
      `URL: ${pageUrl}`,
      `Date: ${new Date().toISOString()}`,
      `Characters: ${transcript.length}`,
      '',
      '='.repeat(60),
      'TRANSCRIPT',
      '='.repeat(60),
      '',
      transcript,
    ].join('\n');

    writeFile(filepath, content, 'utf-8')
      .then(() => console.log(`[Transcript] Saved: ${filename}`))
      .catch(err => console.error('[Transcript] Save error:', err.message));
  } catch (err) {
    console.error('[Transcript] Save error:', err.message);
  }
}

/**
 * Generate content (Quiz or Q&A)
 * POST /api/generate
 */
export async function generate(req, res, next) {
  try {
    const {
      videoIdentifier,
      pageTitle,
      domain,
      pageUrl,
      videoSrc,
      contentType,
      transcript,
      videoDuration,
      isPartial,
      watchedDuration,
    } = req.body;

    const userId = req.userId || null;

    // Check cache (per-user or anonymous)
    const cacheQuery = { videoIdentifier, contentType };
    if (userId) {
      cacheQuery.userId = userId;
    } else {
      cacheQuery.userId = null; // Anonymous users
    }
    
    const existingContent = await GeneratedContent.findOne(cacheQuery);

    if (existingContent) {
      console.log('Cache hit:', contentType, videoIdentifier);
      return res.json({
        success: true,
        cached: true,
        ...existingContent.toObject(),
      });
    }

    // Save transcript to file
    if (transcript) {
      saveTranscriptToFile(pageTitle, pageUrl, transcript);
    }

    // Generate new content with AI
    console.log('Generating new content:', contentType, pageTitle);
    if (isPartial) {
      console.log(`Partial video - watched: ${watchedDuration}s`);
    }

    let generatedData;

    if (contentType === 'quiz') {
      generatedData = await generateQuiz(transcript, pageTitle, videoDuration, isPartial || false, watchedDuration);
    } else {
      generatedData = await generateQA(transcript, pageTitle, videoDuration, isPartial || false, watchedDuration);
    }

    // Save to database
    const contentId = uuidv4();

    const newContent = new GeneratedContent({
      contentId,
      videoIdentifier,
      userId: userId || null, // Allow null for anonymous users
      pageTitle,
      domain,
      pageUrl,
      videoSrc,
      contentType,
      generatedData,
      isPartial: isPartial || false,
      watchedDuration: watchedDuration || null,
    });

    await newContent.save();
    console.log('Content saved:', contentId);

    res.status(201).json({
      success: true,
      cached: false,
      ...newContent.toObject(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get history list (filtered by user)
 * GET /api/history?type=quiz|qa
 */
export async function getHistory(req, res, next) {
  try {
    const { type } = req.query;
    const userId = req.userId || null;

    // If logged in, show their content + anonymous content
    const filter = userId
      ? { userId: { $in: [userId, null] } }
      : { userId: null };

    if (type) {
      filter.contentType = type;
    }

    const history = await GeneratedContent.find(filter)
      .select('contentId pageTitle domain contentType isPartial watchedDuration createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(history);
  } catch (error) {
    next(error);
  }
}

/**
 * Get content by ID (only if owned by user)
 * GET /api/history/:contentId
 */
export async function getContentById(req, res, next) {
  try {
    const { contentId } = req.params;
    const userId = req.userId || null;

    const query = { contentId };
    if (userId) {
      query.userId = { $in: [userId, null] };
    } else {
      query.userId = null;
    }

    const content = await GeneratedContent.findOne(query);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }

    // Separate answers from questions for interactive mode
    const contentData = content.toObject();

    if (content.contentType === 'quiz') {
      contentData.answers = content.generatedData.questions?.map(q => ({
        answerIndex: q.answerIndex,
        explanation: q.explanation
      }));

      contentData.generatedData = {
        ...content.generatedData,
        questions: content.generatedData.questions?.map(q => ({
          question: q.question,
          options: q.options
        }))
      };
    } else if (content.contentType === 'qa') {
      contentData.answers = content.generatedData.qa?.map(item => ({
        answer: item.answer
      }));

      contentData.generatedData = {
        ...content.generatedData,
        qa: content.generatedData.qa?.map(item => ({
          question: item.question
        }))
      };
    }

    res.json(contentData);
  } catch (error) {
    next(error);
  }
}

/**
 * Validate user answers (only if owned by user)
 * POST /api/history/:contentId/validate
 */
export async function validateAnswers(req, res, next) {
  try {
    const { contentId } = req.params;
    const { userAnswers } = req.body;
    const userId = req.userId || null;

    const query = { contentId };
    if (userId) {
      query.userId = { $in: [userId, null] };
    } else {
      query.userId = null;
    }

    const content = await GeneratedContent.findOne(query);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }

    let results = [];

    if (content.contentType === 'quiz') {
      results = content.generatedData.questions?.map((q, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === q.answerIndex;

        return {
          questionIndex: index,
          isCorrect,
          userAnswer,
          correctAnswer: q.answerIndex,
          correctOption: q.options[q.answerIndex],
          explanation: q.explanation
        };
      });
    } else if (content.contentType === 'qa') {
      results = content.generatedData.qa?.map((item, index) => ({
        questionIndex: index,
        userAnswer: userAnswers[index],
        correctAnswer: item.answer
      }));
    }

    const score = content.contentType === 'quiz'
      ? results.filter(r => r.isCorrect).length
      : null;

    res.json({
      success: true,
      contentType: content.contentType,
      results,
      score,
      total: results.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List saved transcripts
 * GET /api/transcripts
 */
export async function listTranscripts(req, res, next) {
  try {
    const files = await readdir(TRANSCRIPTS_DIR).catch(() => []);
    const transcripts = files
      .filter(f => f.endsWith('.txt'))
      .map(f => ({ filename: f }));
    res.json({ success: true, transcripts });
  } catch (error) {
    next(error);
  }
}

/**
 * Download a saved transcript
 * GET /api/transcripts/:filename
 */
export async function downloadTranscript(req, res, next) {
  try {
    const { filename } = req.params;
    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }
    const filepath = join(TRANSCRIPTS_DIR, filename);
    res.download(filepath, filename, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ success: false, message: 'Transcript not found' });
      }
    });
  } catch (error) {
    next(error);
  }
}
