import { body, query, param, validationResult } from 'express-validator';

export const validateGenerate = [
  body('videoIdentifier')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Video identifier is required'),
  body('pageTitle')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Page title is required')
    .isLength({ max: 500 })
    .withMessage('Page title too long'),
  body('domain')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Domain is required'),
  body('pageUrl')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Page URL is required'),
  body('videoSrc')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Video source is required'),
  body('contentType')
    .isIn(['quiz', 'qa'])
    .withMessage('Content type must be quiz or qa'),
  body('transcript')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Transcript or page content is required')
    .isLength({ min: 100, max: 50000 })
    .withMessage('Transcript must be between 100 and 50,000 characters'),
  body('videoDuration')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Video duration must be a positive integer (seconds)'),
  body('isPartial')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('isPartial must be a boolean'),
  body('watchedDuration')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('watchedDuration must be a positive integer (seconds)'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Validation Error] Request body:', JSON.stringify(req.body, null, 2));
      console.log('[Validation Error] Errors:', JSON.stringify(errors.array(), null, 2));
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        receivedFields: Object.keys(req.body)
      });
    }
    next();
  },
];

export const validateHistoryQuery = [
  query('type')
    .optional()
    .isIn(['quiz', 'qa'])
    .withMessage('Type must be quiz or qa'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  },
];

export const validateContentId = [
  param('contentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Content ID is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  },
];

export const validateUserAnswers = [
  body('userAnswers')
    .isObject()
    .withMessage('User answers must be an object'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  },
];
