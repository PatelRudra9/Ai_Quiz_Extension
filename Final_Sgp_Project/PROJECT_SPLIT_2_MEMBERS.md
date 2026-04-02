# Project Split Plan (2 Members)

**Project:** Video AI Chrome Extension  
**Date:** 2 April 2026

This plan splits the project into 2 clear presentation parts so both members can explain separately.

---

## Member 1: Client Side + User Experience

### Part Scope
- Chrome Extension (`extension/`)
- Dashboard Frontend (`dashboard/`)
- User flow from video page to generated output

### What is done in this part
1. Detects video and collects page/video context.
2. Shows extension popup and in-page overlay.
3. Sends generation request to backend.
4. Displays quiz/Q&A and history in dashboard.

### How to explain (step-by-step)
1. Open architecture and say this part is **UI + browser integration**.
2. Show extension files:
   - `public/manifest.json`
   - `public/background.js`
   - `src/content/*`
   - `src/popup/*`
3. Show dashboard files:
   - `src/App.jsx`
   - `src/components/*`
4. Explain API calls from frontend to backend (`/api/generate`, `/api/history`).
5. Demo flow:
   - Play YouTube video -> click Quiz/Q&A -> output shown.

### What is used
- React + Vite
- Chrome Extension Manifest V3
- JavaScript, JSX, CSS
- Fetch/Axios style API calls

### Why it is used
- **React**: reusable UI components and fast state updates.
- **Vite**: faster development/build process.
- **Manifest V3**: required modern Chrome extension standard.
- **Content scripts**: interact with webpage/video directly.
- **Dashboard**: clean and larger view for history and analytics.

---

## Member 2: Backend + AI + Database + Security

### Part Scope
- Backend API (`backend/src/`)
- AI generation pipeline
- MongoDB storage and caching
- Auth, validation, rate limiting

### What is done in this part
1. Receives content generation request.
2. Builds AI prompt and gets response.
3. Validates JSON output (quiz/Q&A structure).
4. Stores/reuses generated content from MongoDB.
5. Handles auth, security checks, and performance tracking.

### How to explain (step-by-step)
1. Show backend folders:
   - `controllers/`
   - `routes/`
   - `services/`
   - `models/`
   - `middleware/`
2. Explain key APIs:
   - `POST /api/generate`
   - `GET /api/history`
   - `POST /api/auth/login`
   - `GET /api/performance`
3. Explain DB schema (`GeneratedContent`, `User`, `UserPerformance`).
4. Explain cache logic using `videoIdentifier`.
5. Explain security: JWT, rate limiter, input validation.

### What is used
- Node.js + Express.js
- MongoDB + Mongoose
- AI provider integration (Gemini/Groq/Ollama based on project config)
- JWT, bcrypt, express-validator, rate-limit middleware

### Why it is used
- **Express**: simple and scalable REST API handling.
- **MongoDB**: flexible schema for generated AI data.
- **Mongoose**: schema + validation + indexing support.
- **AI service layer**: centralized prompt and response control.
- **JWT/bcrypt**: secure authentication.
- **Rate limiting + validation**: protects API and improves reliability.

---

## Combined 2-Person Presentation Flow (Recommended)

1. **Member 1 (First 6-8 min):** Problem, UI flow, extension + dashboard demo.
2. **Member 2 (Next 6-8 min):** Backend architecture, AI generation logic, DB and security.
3. **Final (2 min together):** Results, challenges, and future improvements.

---

## Quick Viva Answers

### 1) How to do this project flow?
User watches video -> extension collects context -> backend generates quiz/Q&A using AI -> MongoDB stores output -> dashboard/popup shows result.

### 2) What is used to do this?
Chrome Extension (Manifest V3), React, Node.js/Express, MongoDB, AI API, JWT security.

### 3) Why are these technologies used?
They provide browser integration, fast UI, scalable APIs, flexible storage, automated question generation, and secure access.

### 4) What exactly is used where?
- Extension + dashboard: user interaction and display.
- Backend: business logic and API orchestration.
- AI service: quiz/Q&A generation.
- MongoDB: persistence and history.
- Middleware: validation and protection.

---

**End of split document**