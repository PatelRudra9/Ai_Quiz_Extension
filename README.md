# Video AI Chrome Extension - SGP Project

## 📋 Project Overview

A Chrome Extension that generates AI-powered Quiz and Q&A content from YouTube videos using Google Gemini API.

**Student**: Pruthavi  
**Project Type**: SGP (Software Group Project)  
**Technology Stack**: React, Node.js, MongoDB, Google Gemini AI

---

## 🎯 Features

- ✅ Detects HTML5 videos on any website (optimized for YouTube)
- ✅ Generates interactive MCQ quizzes with AI
- ✅ Generates Q&A content for study
- ✅ Saves content to MongoDB (no regeneration needed)
- ✅ Web dashboard to view all generated content
- ✅ Secure backend with API key protection

---

## 📁 Project Structure

```
video-ai-chrome-extension/
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API routes
│   │   ├── services/     # Gemini AI integration
│   │   ├── middleware/   # Validation, auth, rate limiting
│   │   └── index.js      # Server entry point
│   ├── .env              # Environment variables (API keys)
│   └── package.json
│
├── extension/            # Chrome Extension
│   ├── public/
│   │   ├── manifest.json # Extension configuration
│   │   ├── background.js # Service worker
│   │   └── injected.js   # Page context script
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── content/      # Content scripts
│   │   ├── popup/        # Extension popup
│   │   └── utils/        # Helper functions
│   └── package.json
│
└── dashboard/            # Web UI for viewing content
    ├── src/
    │   ├── components/   # React components
    │   └── App.jsx       # Main app
    └── package.json
```

---

## 🚀 Quick Start Guide

### Prerequisites

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** - [Download MongoDB Compass](https://www.mongodb.com/try/download/compass)
3. **Google Gemini API Key** - [Get API Key](https://makersuite.google.com/app/apikey)

### Step 1: Setup MongoDB

1. Open MongoDB Compass
2. Connect to: `mongodb://127.0.0.1:27017`
3. Create database: `video_ai_extension`
4. Create collection: `generatedcontents`

### Step 2: Setup Backend

```powershell
cd video-ai-chrome-extension\backend
npm install
```

Edit `.env` file and add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
MONGO_URI=mongodb://127.0.0.1:27017/video_ai_extension
PORT=5000
NODE_ENV=development
```

Start backend:
```powershell
npm start
```

### Step 3: Setup Chrome Extension

```powershell
cd ..\extension
npm install
npm run build
```

Load in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension\dist` folder

### Step 4: Setup Dashboard (Optional)

```powershell
cd ..\dashboard
npm install
npm run dev
```

Dashboard opens at: http://localhost:3000

---

## 📖 How to Use

1. **Go to YouTube** and play any video
2. **Let the video play until the end** (or skip to end)
3. **Overlay appears** - Click "Quiz (MCQs)" or "Q&A"
4. **Wait 5-10 seconds** for AI generation
5. **View content** in the dashboard or extension popup

---

## 🔧 Technical Details

### Backend API Endpoints

- `POST /api/generate` - Generate quiz or Q&A content
- `GET /api/history` - Get all generated content
- `GET /api/history/:contentId` - Get specific content
- `POST /api/auth/register` - Register user (optional)
- `POST /api/auth/login` - Login user (optional)

### Database Schema

```javascript
{
  contentId: String (UUID),
  videoIdentifier: String (SHA-256 hash),
  userId: String (optional),
  pageTitle: String,
  domain: String,
  pageUrl: String,
  videoSrc: String,
  contentType: "quiz" | "qa",
  generatedData: {
    type: "quiz",
    title: String,
    questions: [{
      question: String,
      options: [String, String, String, String],
      answerIndex: Number,
      explanation: String
    }]
  },
  createdAt: Date
}
```

### Security Features

- ✅ API key stored only on backend
- ✅ CORS protection
- ✅ Rate limiting (20 requests per 15 minutes)
- ✅ Input validation
- ✅ Optional user authentication

---

## 🐛 Troubleshooting

### Extension not detecting videos
- Refresh the page after loading extension
- Ensure video is HTML5 `<video>` element

### Backend connection errors
- Verify MongoDB is running
- Check backend is running on port 5000
- Ensure `.env` file has correct API key

### Quiz not generating
- Check browser console (F12) for errors
- Verify backend logs for errors
- Ensure video has captions or sufficient content

---

## 📊 Project Statistics

- **Total Files**: 40+ source files
- **Total Code**: 2,500+ lines
- **Languages**: JavaScript, JSX, CSS
- **Frameworks**: React, Express.js, Vite
- **Database**: MongoDB
- **AI Model**: Google Gemini 1.5 Flash

---

## 🎓 Learning Outcomes

This project demonstrates:
- Chrome Extension development (Manifest V3)
- Full-stack web development
- RESTful API design
- MongoDB database integration
- AI/ML integration (Google Gemini)
- React component architecture
- Asynchronous JavaScript
- Security best practices

---

## 📝 Important Notes

### For Development:
- Backend must be running for extension to work
- MongoDB must be running locally
- Extension needs to be reloaded after code changes

### For Production:
- Deploy backend to cloud (AWS, GCP, Azure)
- Use MongoDB Atlas instead of local MongoDB
- Update extension to use production backend URL
- Publish extension to Chrome Web Store

---

## 🔗 Useful Links

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [React Documentation](https://react.dev/)

---

## 📧 Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser/server console logs
3. Verify all setup steps completed

---

**Made with ❤️ for SGP Project**

*Last Updated: March 3, 2026*
