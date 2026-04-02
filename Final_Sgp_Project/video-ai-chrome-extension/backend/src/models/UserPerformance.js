import mongoose from 'mongoose';

const userPerformanceSchema = new mongoose.Schema({
  userId: { type: String, required: false, default: null, index: true },
  contentId: { type: String, required: true },
  contentType: { type: String, enum: ['quiz', 'qa'], required: true },
  pageTitle: { type: String, required: true },
  domain: { type: String, required: true },
  pageUrl: { type: String, default: '' },
  score: { type: Number, default: null },       // correct answers count
  total: { type: Number, required: true },       // total questions
  accuracy: { type: Number, default: null },     // percentage 0-100
  timeTakenSeconds: { type: Number, default: null }, // seconds to complete
  attemptedAt: { type: Date, default: Date.now, index: true },
});

const UserPerformance = mongoose.model('UserPerformance', userPerformanceSchema);
export default UserPerformance;
