# Video AI Chrome Extension for Automated Quiz and Q&A Generation

Artificial Intelligence & Machine Learning Dept., Charotar University of Science & Technology, Changa, India  
Academic Year: 2025–2026

## Abstract:

The growth of video-first learning has created a practical need for systems that convert passive viewing into active comprehension. This paper presents a full-stack educational platform that automatically generates quiz and Q&A material from video content through a Chrome extension, a Node.js/Express backend, and a React dashboard. The system detects HTML5 videos, extracts transcript or page text, and forwards structured context for AI-based generation. To improve reliability, the backend uses a provider-fallback approach (Groq as primary and Ollama as fallback), strict JSON parsing, and schema-level filtering of generated outputs. Generated content is cached in MongoDB using video-level identifiers to avoid repeated regeneration and reduce latency.

The platform supports optional authentication, role-safe API usage, performance tracking, and history retrieval workflows. Additional safeguards include rate limiting, request validation, and centralized error handling. The resulting system demonstrates a scalable and user-friendly approach for turning educational video sessions into revision-ready learning artifacts.

Keywords: Chrome Extension, AI in Education, Quiz Generation, Q&A Generation, Express.js, MongoDB, React, Groq, Ollama, Transcript Processing

## Introduction:

Digital education platforms provide abundant video content, but most learners still revise manually by creating notes and question sets after watching lectures. This process is slow, inconsistent, and often skipped, reducing retention and engagement. A practical educational assistant should generate comprehension material immediately after a learning session and present it in a usable format.

The Video AI Chrome Extension addresses this problem by capturing video context and automatically producing MCQ quizzes and open-ended Q&A sets. The system is designed for real-world usage: if transcript quality is poor, page text is used as fallback; if the primary AI endpoint fails, a local provider can continue generation. This balance of usability and robustness makes the platform suitable for student workflows and project-scale deployment.

## ARCHITECTURE OVERVIEW

The system follows a modular full-stack architecture with clean separation of presentation, application logic, and persistence.

### System Components

### a. Frontend (Client-Side)

Technology: React.js, Vite, CSS (Extension + Dashboard)

Responsibilities:
- Renders extension popup and in-page overlay UI
- Provides dashboard pages for history, content preview, and performance analytics
- Handles user interaction and state transitions (auth, filters, content previews)
- Communicates with backend endpoints via authenticated and non-authenticated flows

### b. Backend (Server-Side)

Technology: Node.js, Express.js

Responsibilities:
- Exposes REST APIs for generation, history, validation, transcripts, auth, and performance
- Orchestrates AI generation prompts and output validation
- Applies caching logic to prevent duplicate generation for the same video/context
- Implements middleware for validation, rate limiting, authentication, and error handling

### c. Database

Technology: MongoDB with Mongoose ODM

Responsibilities:
- Stores generated content objects, user records, and attempt/performance records
- Supports user-aware caching through compound indexes
- Preserves transcript artifacts in file storage for traceability and debugging

### Key Architectural Patterns

### Model-Controller-Route Separation

The backend organizes persistence (`models`), business logic (`controllers`), and endpoints (`routes`) to maintain readability and extensibility.

### RESTful API Design

All client-server operations use stateless HTTP APIs, enabling extension and dashboard integration through a common contract.

### Optional Authentication Mode

The system supports both anonymous and authenticated users. This allows fast extension testing while still enabling secure user-specific history when tokens are present.

### Provider-Fallback AI Strategy

AI generation first uses Groq for cloud inference and falls back to Ollama for local continuity if the primary provider is unavailable.

### Security Considerations

- JWT-based authentication for protected resources
- Input validation for request safety
- API rate limiting for abuse prevention
- Password hashing with bcrypt
- Centralized error middleware for consistent responses

## FUNCTIONALITY AND FEATURES

### 1. Video Detection and Event Handling

- Detects HTML5 video elements on pages
- Listens to playback events (`play`, `pause`, `ended`)
- Supports full-watch and partial-watch generation contexts

### 2. Content Extraction Layer

- Attempts transcript extraction first
- Uses page text fallback when transcript is unavailable
- Captures metadata: title, domain, URL, source, duration, watched segment

### 3. Generation Module

- Provides user choice: Quiz (MCQs) or Q&A pairs
- Dynamically determines item counts using transcript length and duration
- Uses strict prompt constraints to avoid metadata-based or irrelevant questions
- Parses and validates JSON responses; removes malformed records

### 4. History and Retrieval

- Stores generated outputs with unique `contentId`
- Retrieves history with optional type filters (`all`, `quiz`, `qa`)
- Supports content fetch by ID for detailed preview

### 5. Assessment and Feedback

- Quiz answers can be validated through API
- Scores and correctness can be saved for analytics
- Dashboard visualizes attempts, accuracy trends, and aggregate statistics

### 6. Transcript Management

- Saves transcript text files with timestamped naming
- Provides transcript listing and file download endpoints

## Technical Implementation

### 1. System Architecture

#### 1.1 Multi-Tier Design

- Client Tier: Extension UI + Dashboard UI
- API Tier: Express controllers/routes + middleware chain
- Data Tier: MongoDB collections and transcript file storage

#### 1.2 Data Flow

1. User watches a video and triggers generation.  
2. Client builds payload (`videoIdentifier`, transcript/page text, metadata).  
3. Backend checks cache by `(videoIdentifier, contentType, userId)`.  
4. If missing, AI generation executes; response is parsed and validated.  
5. Valid output is stored and returned.  
6. User interactions (validation/performance) are persisted for analytics.

### 2. API and Endpoint Design

Core endpoints:
- `POST /api/generate`
- `GET /api/history`
- `GET /api/history/:contentId`
- `POST /api/history/:contentId/validate`
- `GET /api/performance`
- `POST /api/performance`
- `GET /api/transcripts`
- `GET /api/transcripts/:filename`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`

### 3. Database Schema Strategy

#### 3.1 `GeneratedContent`
- Stores identifiers, page metadata, content type, AI output, and timestamps
- Includes partial-watch markers (`isPartial`, `watchedDuration`)
- Uses compound unique indexing for duplicate prevention

#### 3.2 `User`
- Stores profile information and hashed credentials

#### 3.3 `UserPerformance`
- Stores score, total questions, accuracy, attempt time, and content linkage

### 4. Prompt and Validation Pipeline

- Prompt templates explicitly enforce content-derived questions
- Metadata-oriented questions are forbidden by design rules
- JSON parsing removes code fences and extra wrappers
- Invalid questions/pairs are filtered before final persistence

## Security Considerations

### 1. Authentication and Authorization

- JWT tokens secure protected API routes
- Optional auth middleware supports hybrid usage
- Authorization context is propagated through request middleware

### 2. Input and API Protection

- `express-validator` checks request shape and required fields
- Rate limiter controls generation and history endpoint pressure
- Error handler prevents stack trace leakage and normalizes responses

### 3. Data Security

- Passwords stored using bcrypt hashing
- Environment variables isolate secrets from source code
- Database constraints enforce content integrity and uniqueness

## Performance and Optimization Strategy

### 1. Caching and Reuse

- Reuses existing generated content when identifier matches
- Reduces AI cost and response latency for repeated videos

### 2. Reliability Through Fallback

- Automatic fallback to secondary AI provider improves uptime
- Retry and response validation logic reduce generation failure impact

### 3. UI Responsiveness

- Lightweight overlay-based workflows reduce navigation friction
- Dashboard supports filtered retrieval and focused rendering

## Challenges Faced

1. Ensuring strict and consistent JSON structure from LLM outputs  
2. Dealing with variable transcript quality across websites  
3. Managing long prompt context under provider limits  
4. Balancing anonymous usability with authenticated tracking  
5. Designing robust retry/fallback behavior without poor user experience

## Future Enhancements

- Multi-language generation and translation-aware prompts
- Difficulty-level tuning for beginner/intermediate/advanced learners
- Export to PDF, DOCX, and flashcard formats
- Personalized weak-topic suggestions from performance analytics
- Cloud deployment with observability, alerts, and production metrics

## Conclusion

The Video AI Chrome Extension delivers a practical end-to-end pipeline for automated educational content generation from videos. Its architecture combines extension-based capture, validated AI generation, persistent storage, and learner analytics in a unified platform. With fallback-ready AI integration, caching, and secure API workflows, the system provides both usability and technical reliability, making it well-suited for academic deployment and future expansion.

## References

1. Chrome Extensions Documentation (Manifest V3)  
2. Express.js Official Documentation  
3. MongoDB and Mongoose Documentation  
4. React + Vite Documentation  
5. Groq API Documentation  
6. Ollama Documentation  
7. JWT (RFC 7519) Authentication Standard

### Declaration

This technical paper is prepared using the implemented project codebase and structured in a format aligned with the provided reference document style for SGP academic submission (2025–2026).
