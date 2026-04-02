# Video AI Chrome Extension

A production-ready Chrome Extension that detects HTML5 videos across any website and generates AI-powered Quiz and Q&A content using Google Gemini API.

## 🎯 Features

- **Universal Video Detection**: Automatically detects HTML5 videos on any website
- **Dynamic Site Support**: Handles videos loaded via JavaScript/React using MutationObserver
- **AI Content Generation**:
  - Interactive MCQ Quizzes with scoring
  - Question & Answer sets for review
- **Smart Caching**: Saves generated content to MongoDB to avoid regeneration
- **History Module**: View and preview all generated content
- **Security First**: Gemini API key stored securely on backend only
- **Optional Dashboard**: Beautiful web UI for managing content

## 🏗️ Tech Stack

### Chrome Extension
- **Frontend**: React 18 + Vite
- **Manifest**: V3
- **Video Detection**: HTML5 Video API + MutationObserver
- **Rendering**: Shadow DOM for isolation

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (local or Atlas)
- **AI**: Google Gemini API (gemini-1.5-flash)
- **Security**: CORS, Rate Limiting, Input Validation

### Dashboard
- **Framework**: React + Vite
- **Styling**: CSS with responsive design

## 📁 Project Structure

```
video-ai-chrome-extension/
├── extension/               # Chrome Extension
│   ├── public/
│   │   ├── manifest.json
│   │   ├── background.js
│   │   └── icon*.png
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── content/         # Content scripts
│   │   ├── popup/           # Extension popup
│   │   └── utils/           # Utilities
│   ├── package.json
│   └── vite.config.js
├── backend/                 # Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── index.js
│   ├── .env.example
│   └── package.json
└── dashboard/              # Web Dashboard
    ├── src/
    │   ├── components/
    │   ├── services/
    │   └── App.jsx
    ├── package.json
    └── vite.config.js
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- MongoDB installed locally OR MongoDB Atlas account
- MongoDB Compass (for database management)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Step 1: Clone/Download Project

```bash
cd c:\Rudra\video-ai-chrome-extension
```

### Step 2: Setup MongoDB

#### Option A: Local MongoDB
1. Open MongoDB Compass
2. Connect to: `mongodb://127.0.0.1:27017`
3. Create database: `video_ai_extension`
4. Create collection: `generatedcontents`

#### Option B: MongoDB Atlas
1. Create cluster on MongoDB Atlas
2. Get connection string
3. Use it in backend `.env` file

### Step 3: Setup Backend

```bash
cd backend
npm install
```

Create `.env` file (copy from `.env.example`):
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
MONGO_URI=mongodb://127.0.0.1:27017/video_ai_extension
PORT=5000
NODE_ENV=development
```

**⚠️ Important**: Replace `your_actual_gemini_api_key_here` with your real Gemini API key!

Start backend server:
```bash
npm start
```

You should see:
```
✓ Connected to MongoDB
  Database: video_ai_extension
✓ Server running on http://localhost:5000
  Environment: development
```

### Step 4: Setup Chrome Extension

```bash
cd ..\extension
npm install
npm run build
```

This creates a `dist/` folder with the built extension.

### Step 5: Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `extension/dist` folder
5. Extension icon should appear in toolbar

### Step 6: Setup Dashboard (Optional)

```bash
cd ..\dashboard
npm install
npm run dev
```

Dashboard opens at: `http://localhost:3000`

## 🎮 Usage Guide

### Generating Content

1. **Navigate to any website with a video**
   - YouTube, Vimeo, educational sites, news sites, etc.
   - Any HTML5 `<video>` element is detected

2. **Play and finish the video**
   - Extension detects when video ends
   - Overlay appears with options

3. **Choose content type**
   - Click "Quiz (MCQs)" for interactive quiz
   - Click "Q&A" for question-answer pairs

4. **Wait for AI generation**
   - Content is generated using Gemini AI
   - Saved to MongoDB for future access

### Quiz Mode

- **Fullscreen interactive quiz**
- Answer all questions (mandatory)
- Submit to see score and correct answers
- Cannot close until submitted

### Q&A Mode

- **Readable overlay panel**
- View question-answer pairs
- Can close anytime

### Viewing History

#### Extension Popup
1. Click extension icon in toolbar
2. View list of generated content
3. Filter by: All / Quiz / Q&A
4. Click "View Content" to preview

#### Dashboard (Optional)
1. Open `http://localhost:3000`
2. Browse all content with beautiful UI
3. Click any card to view full content
4. Responsive design works on mobile/tablet

## 🔒 Security Features

### ✅ Implemented Security

1. **API Key Protection**
   - Gemini API key NEVER exposed to extension
   - Stored only in backend `.env` file
   - Not committed to version control

2. **CORS Protection**
   - Allowlist for Chrome extension origins
   - Localhost development origins allowed

3. **Rate Limiting**
   - Generate endpoint: 20 requests per 15 minutes
   - History endpoints: 100 requests per 15 minutes

4. **Input Validation**
   - All inputs validated with express-validator
   - Transcript limited to 50,000 characters
   - Sanitized text lengths

5. **Error Handling**
   - Comprehensive error middleware
   - No sensitive data in error responses

## 📊 Database Schema

### Collection: `generatedcontents`

```javascript
{
  contentId: String (UUID, unique),
  videoIdentifier: String (SHA-256 hash, indexed),
  pageTitle: String,
  domain: String,
  pageUrl: String,
  videoSrc: String,
  contentType: "quiz" | "qa",
  generatedData: {
    // For Quiz
    type: "quiz",
    title: String,
    questions: [{
      question: String,
      options: [String, String, String, String],
      answerIndex: Number (0-3),
      explanation: String
    }]
    
    // For Q&A
    type: "qa",
    title: String,
    qa: [{
      question: String,
      answer: String
    }]
  },
  createdAt: Date (indexed)
}
```

### Indexes

- Compound unique: `{ videoIdentifier, contentType }`
- Single: `videoIdentifier`, `createdAt`

## 🔧 API Endpoints

### POST `/api/generate`
Generate new content or retrieve from cache.

**Request:**
```json
{
  "videoIdentifier": "sha256_hash",
  "pageTitle": "Video Title",
  "domain": "example.com",
  "pageUrl": "https://example.com/video",
  "videoSrc": "https://cdn.example.com/video.mp4",
  "contentType": "quiz",
  "transcript": "Video content or page text..."
}
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "contentId": "uuid",
  "generatedData": { ... }
}
```

### GET `/api/history?type=quiz|qa`
Get content history (filtered or all).

**Response:**
```json
[
  {
    "contentId": "uuid",
    "pageTitle": "Video Title",
    "domain": "example.com",
    "contentType": "quiz",
    "createdAt": "2026-02-04T..."
  }
]
```

### GET `/api/history/:contentId`
Get full content by ID.

**Response:**
```json
{
  "contentId": "uuid",
  "videoIdentifier": "hash",
  "pageTitle": "Video Title",
  "domain": "example.com",
  "pageUrl": "https://...",
  "videoSrc": "https://...",
  "contentType": "quiz",
  "generatedData": { ... },
  "createdAt": "2026-02-04T..."
}
```

## 🐛 Troubleshooting

### Extension not detecting videos
- Refresh the page after installing extension
- Check browser console for errors
- Ensure video is HTML5 `<video>` element

### Backend connection errors
- Verify MongoDB is running (check Compass)
- Ensure backend server is running on port 5000
- Check CORS configuration allows extension origin

### Gemini API errors
- Verify API key is correct in `.env`
- Check API quota limits
- Ensure network connection

### Content not generating
- Check backend logs for errors
- Verify transcript/page content is not empty
- Check rate limit (20 requests per 15 min)

## 🎨 Customization

### Change AI Model
Edit `backend/src/services/gemini.js`:
```javascript
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro'  // or 'gemini-1.5-flash'
});
```

### Adjust Rate Limits
Edit `backend/src/middleware/rateLimiter.js`:
```javascript
max: 50, // Increase limit
windowMs: 15 * 60 * 1000, // Time window
```

### Change Extension Icons
Replace `extension/public/icon16.png`, `icon48.png`, `icon128.png`

## 📝 Development

### Extension Development Mode
```bash
cd extension
npm run dev
```
Watches for changes (manual reload in `chrome://extensions/` needed).

### Backend Development Mode
```bash
cd backend
npm run dev
```
Uses `--watch` flag for auto-restart.

### Dashboard Development Mode
```bash
cd dashboard
npm run dev
```
Hot reload enabled at `http://localhost:3000`.

## 🏗️ Building for Production

### Extension
```bash
cd extension
npm run build
```
Output: `extension/dist/`

### Dashboard
```bash
cd dashboard
npm run build
```
Output: `dashboard/dist/`

Deploy to static hosting (Vercel, Netlify, etc.)

## 📜 License

MIT License - Feel free to use in your projects!

## 🤝 Support

For issues or questions:
1. Check troubleshooting section
2. Review browser/server console logs
3. Verify all setup steps completed

## 🎉 Credits

- **AI**: Google Gemini API
- **Database**: MongoDB
- **Frontend**: React + Vite
- **Backend**: Node.js + Express

---

**Made with ❤️ for better learning experiences!**
