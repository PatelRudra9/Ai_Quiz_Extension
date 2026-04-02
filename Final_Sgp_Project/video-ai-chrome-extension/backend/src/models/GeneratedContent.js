import mongoose from 'mongoose';

const generatedContentSchema = new mongoose.Schema({
  contentId: {
    type: String,
    required: true,
    unique: true,
  },
  videoIdentifier: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: false, // Optional for anonymous users
    default: null,
    index: true,
  },
  pageTitle: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
  },
  pageUrl: {
    type: String,
    required: true,
  },
  videoSrc: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    enum: ['quiz', 'qa'],
    required: true,
  },
  generatedData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  isPartial: {
    type: Boolean,
    default: false,
  },
  watchedDuration: {
    type: Number,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound unique index — include userId so different users can cache separately
generatedContentSchema.index({ videoIdentifier: 1, contentType: 1, userId: 1 }, { unique: true });

const GeneratedContent = mongoose.model('GeneratedContent', generatedContentSchema);

export default GeneratedContent;
