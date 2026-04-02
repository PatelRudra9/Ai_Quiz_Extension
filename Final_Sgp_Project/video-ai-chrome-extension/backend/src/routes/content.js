import express from 'express';
import { generate, getHistory, getContentById, validateAnswers, listTranscripts, downloadTranscript } from '../controllers/contentController.js';
import { savePerformance, getPerformance } from '../controllers/performanceController.js';
import {
  validateGenerate,
  validateHistoryQuery,
  validateContentId,
  validateUserAnswers
} from '../middleware/validation.js';
import { generateRateLimiter, apiRateLimiter } from '../middleware/rateLimiter.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Optional authentication - if token provided, validate it
// This allows the extension to work without login for testing
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }
  // No auth provided, continue without userId
  req.userId = null;
  next();
};

router.use(optionalAuth);

// Root API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Video AI Generator API',
    endpoints: {
      generate: { method: 'POST', path: '/api/generate' },
      history: { method: 'GET', path: '/api/history' },
      contentById: { method: 'GET', path: '/api/history/:contentId' },
      validateAnswers: { method: 'POST', path: '/api/history/:contentId/validate' }
    }
  });
});

// Generate content (Quiz or Q&A)
router.post('/generate', generateRateLimiter, validateGenerate, generate);

// Get history
router.get('/history', apiRateLimiter, validateHistoryQuery, getHistory);

// Get content by ID
router.get('/history/:contentId', apiRateLimiter, validateContentId, getContentById);

// Validate user answers
router.post('/history/:contentId/validate', apiRateLimiter, validateContentId, validateUserAnswers, validateAnswers);

// Performance
router.get('/performance', apiRateLimiter, getPerformance);
router.post('/performance', apiRateLimiter, savePerformance);

// Transcripts
router.get('/transcripts', apiRateLimiter, listTranscripts);
router.get('/transcripts/:filename', apiRateLimiter, downloadTranscript);

export default router;
