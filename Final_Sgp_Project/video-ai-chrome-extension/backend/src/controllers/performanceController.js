import UserPerformance from '../models/UserPerformance.js';
import GeneratedContent from '../models/GeneratedContent.js';

/**
 * Save a quiz/qa attempt result
 * POST /api/performance
 */
export async function savePerformance(req, res, next) {
  try {
    const { contentId, score, total, timeTakenSeconds } = req.body;
    const userId = req.userId || null;

    // Fetch content metadata
    const content = await GeneratedContent.findOne({ contentId });
    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });

    const accuracy = total > 0 && score !== null ? Math.round((score / total) * 100) : null;

    const perf = new UserPerformance({
      userId,
      contentId,
      contentType: content.contentType,
      pageTitle: content.pageTitle,
      domain: content.domain,
      pageUrl: content.pageUrl,
      score,
      total,
      accuracy,
      timeTakenSeconds: timeTakenSeconds || null,
    });

    await perf.save();
    res.status(201).json({ success: true, performance: perf });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all performance records for the user
 * GET /api/performance
 */
export async function getPerformance(req, res, next) {
  try {
    const userId = req.userId || null;
    const filter = userId ? { userId } : { userId: null };

    const records = await UserPerformance.find(filter)
      .sort({ attemptedAt: -1 })
      .limit(200);

    // Aggregate stats
    const quizRecords = records.filter(r => r.contentType === 'quiz' && r.accuracy !== null);
    const qaRecords = records.filter(r => r.contentType === 'qa');

    const avgAccuracy = quizRecords.length
      ? Math.round(quizRecords.reduce((s, r) => s + r.accuracy, 0) / quizRecords.length)
      : 0;

    const avgTime = records.filter(r => r.timeTakenSeconds).length
      ? Math.round(records.filter(r => r.timeTakenSeconds).reduce((s, r) => s + r.timeTakenSeconds, 0) / records.filter(r => r.timeTakenSeconds).length)
      : 0;

    const bestScore = quizRecords.length
      ? Math.max(...quizRecords.map(r => r.accuracy))
      : 0;

    const totalScreenTime = records.filter(r => r.timeTakenSeconds).reduce((s, r) => s + r.timeTakenSeconds, 0);

    res.json({
      records,
      stats: {
        totalAttempts: records.length,
        quizAttempts: quizRecords.length,
        qaAttempts: qaRecords.length,
        avgAccuracy,
        bestScore,
        avgTime,
        totalScreenTime,
      },
    });
  } catch (error) {
    next(error);
  }
}
