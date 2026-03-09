# 🎯 JeeWallah — JEE Preparation Platform

A production-ready, scalable backend for a JEE (Main + Advanced) preparation platform supporting **1M+ users** with AI-powered explanations, ML-based weak topic detection, real-time mock tests, and comprehensive analytics.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (React/Next.js)                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Cloudflare CDN + WAF                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Node.js API (Express + Cluster)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐          │
│  │   Auth   │  │ Student  │  │  Admin   │  │    AI     │          │
│  │Controller│  │Controller│  │Controller│  │Controller │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘          │
│       │              │              │               │               │
│  ┌────▼──────────────▼──────────────▼───────────────▼──────────┐   │
│  │                    SERVICE LAYER                              │   │
│  │  OTP │ JWT │ Email │ Cache │ Gemini │ ML Client              │   │
│  └────┬──────────────┬──────────────┬───────────────┬──────────┘   │
└───────┼──────────────┼──────────────┼───────────────┼──────────────┘
        │              │              │               │
        ▼              ▼              ▼               ▼
   ┌─────────┐   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │ MongoDB │   │  Redis  │   │ Gemini   │   │  Flask   │
   │ Atlas   │   │ (Cache) │   │ 2.0 API  │   │ ML Svc   │
   └─────────┘   └─────────┘   └──────────┘   └──────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 22 + Express 5 | API Server |
| **Database** | MongoDB 7 (Mongoose 9) | Primary data store |
| **Cache** | Redis 7 (ioredis) | Caching, rate limiting, OTP storage |
| **Auth** | JWT + bcryptjs | Access/refresh tokens, password hashing |
| **AI** | Google Gemini 2.0 Flash | Step-by-step explanations, hints, doubt solving |
| **ML** | Python Flask + scikit-learn | Weak topic detection, score prediction |
| **Email** | Nodemailer (SMTP) | OTP delivery |
| **Security** | Helmet, CORS, express-mongo-sanitize | HTTP hardening, injection prevention |
| **DevOps** | Docker, PM2, Cloudflare | Containerization, process management, CDN |

---

## 📁 Project Structure

```
JeeWallah/
├── Server/                        # Node.js API
│   ├── config/
│   │   ├── index.js               # Centralized config loader
│   │   ├── db.js                  # MongoDB connection (retry + graceful shutdown)
│   │   └── redis.js               # Redis singleton client
│   │
│   ├── models/                    # 10 Mongoose models
│   │   ├── Users.js               # User identity, auth, profile, streaks
│   │   ├── SubNTopic.js           # Subject → Chapter → Topic hierarchy
│   │   ├── Question.js            # Questions (5 types, bilingual, solutions)
│   │   ├── MockTest.js            # Test blueprints (JEE Main/Advanced patterns)
│   │   ├── TestAttempt.js         # Student test sessions with evaluation
│   │   ├── PracticeAttempt.js     # Individual question practice tracking
│   │   ├── PerformanceAnalytics.js# Pre-computed student analytics
│   │   ├── Leaderboard.js         # Per-test and global rankings
│   │   ├── AIInteractionLog.js    # Gemini API call logging & caching
│   │   └── index.js               # Barrel export
│   │
│   ├── services/                  # Business logic
│   │   ├── auth.js                # JWT token generation & verification
│   │   ├── otp.js                 # OTP generation, storage, verification
│   │   ├── email.js               # Nodemailer email service
│   │   ├── cache.js               # Redis cache abstraction
│   │   ├── gemini.js              # Gemini AI integration
│   │   └── ml.js                  # Flask ML service client
│   │
│   ├── middleware/                 # Request pipeline
│   │   ├── auth.js                # JWT authentication
│   │   ├── roleGuard.js           # Role-based access control
│   │   ├── rateLimiter.js         # Redis-backed rate limiting
│   │   ├── validate.js            # Input validation (zero-dep)
│   │   ├── sanitize.js            # NoSQL injection + XSS protection
│   │   └── errorHandler.js        # Centralized error handling
│   │
│   ├── controller/                # Request handlers
│   │   ├── authController.js      # Register, Login, OTP, Refresh, Logout
│   │   ├── studentController.js   # Practice, Tests, Analytics, Leaderboard
│   │   ├── adminController.js     # CRUD Questions, Tests, Platform Stats
│   │   └── aiController.js        # Gemini explanations, ML predictions
│   │
│   ├── Routes/                    # API routing
│   │   ├── index.js               # Route aggregator (/api/v1/*)
│   │   ├── authRoutes.js          # /api/v1/auth/*
│   │   ├── studentRoutes.js       # /api/v1/student/*
│   │   ├── adminRoutes.js         # /api/v1/admin/*
│   │   └── aiRoutes.js            # /api/v1/ai/*
│   │
│   ├── utils/                     # Shared utilities
│   │   ├── ApiError.js            # Custom error class (400, 401, 403, etc.)
│   │   ├── ApiResponse.js         # Standardized JSON responses
│   │   ├── asyncHandler.js        # Async error wrapper
│   │   ├── logger.js              # Winston logger (console + file)
│   │   ├── pagination.js          # Reusable pagination helpers
│   │   └── constants.js           # App-wide enums & config values
│   │
│   ├── index.js                   # Entry point (clustering + Express)
│   ├── Dockerfile                 # Production container
│   ├── docker-compose.yml         # Full stack orchestration
│   ├── ecosystem.config.js        # PM2 cluster config
│   ├── .env.example               # Environment variable template
│   └── package.json
│
└── ml-service/                    # Python ML Microservice
    ├── app.py                     # Flask API (5 endpoints)
    ├── predictor.py               # Inference classes
    ├── trainer.py                 # Training pipeline (from MongoDB)
    ├── bootstrap_models.py        # Initial model training (synthetic data)
    ├── models/                    # Trained .joblib model files
    ├── requirements.txt
    └── Dockerfile
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.10
- **MongoDB** (local or Atlas free tier)
- **Redis** (local or Upstash free tier)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/JeeWallah.git
cd JeeWallah

# Backend
cd Server
npm install

# ML Service
cd ../ml-service
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Server
cd Server
cp .env.example .env
# Edit .env with your values (MongoDB URI, JWT secrets, SMTP, Gemini API key)

# ML Service
cd ../ml-service
cp .env.example .env
```

**Minimum required `.env` values:**
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/jeewallah
JWT_ACCESS_SECRET=your-super-secret-key-here-min-32-chars
JWT_REFRESH_SECRET=another-super-secret-key-here-min-32
GEMINI_API_KEY=your-gemini-api-key     # Get free at ai.google.dev
```

### 3. Start Services

```bash
# Terminal 1 — Backend
cd Server
npm run dev

# Terminal 2 — ML Service
cd ml-service
python bootstrap_models.py     # One-time: create initial ML models
python app.py                  # Start Flask server

# Terminal 3 — MongoDB (if local)
mongod

# Terminal 4 — Redis (if local)
redis-server
```

### 4. Verify

```bash
# Health check
curl http://localhost:3000/api/v1/health

# ML health
curl http://localhost:5000/health
```

---

## 📡 API Reference

Base URL: `http://localhost:3000/api/v1`

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Create new account | ❌ |
| POST | `/auth/login` | Login with email + password | ❌ |
| POST | `/auth/send-otp` | Send OTP to email | ❌ |
| POST | `/auth/verify-otp` | Verify OTP & login (passwordless) | ❌ |
| POST | `/auth/refresh-token` | Get new access token | ❌ |
| POST | `/auth/logout` | Revoke refresh token | ✅ |
| POST | `/auth/logout-all` | Logout all devices | ✅ |
| GET | `/auth/me` | Get current user profile | ✅ |
| PATCH | `/auth/profile` | Update profile | ✅ |

### Student

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/student/subjects` | List all subjects | ✅ |
| GET | `/student/chapters/:subjectId` | Chapters in a subject | ✅ |
| GET | `/student/topics/:chapterId` | Topics in a chapter | ✅ |
| GET | `/student/questions` | Browse questions (with filters) | ✅ |
| GET | `/student/questions/:id` | Get single question | ✅ |
| POST | `/student/practice/submit` | Submit practice attempt | ✅ |
| GET | `/student/practice/bookmarks` | Get bookmarked questions | ✅ |
| PATCH | `/student/practice/:id/bookmark` | Toggle bookmark | ✅ |
| GET | `/student/tests` | List available mock tests | ✅ |
| POST | `/student/tests/:testId/start` | Start/resume mock test | ✅ |
| PATCH | `/student/tests/attempt/:id/save` | Auto-save progress | ✅ |
| POST | `/student/tests/attempt/:id/submit` | Submit test for evaluation | ✅ |
| GET | `/student/tests/attempt/:id/review` | Review submitted test | ✅ |
| GET | `/student/test-history` | Past test results | ✅ |
| GET | `/student/analytics` | Performance analytics | ✅ |
| GET | `/student/analytics/weak-topics` | Weak topic analysis | ✅ |
| GET | `/student/leaderboard/:testId` | Test leaderboard | ✅ |

### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/admin/subjects` | Create subject | 🔐 Admin |
| POST | `/admin/chapters` | Create chapter | 🔐 Admin |
| POST | `/admin/topics` | Create topic | 🔐 Admin |
| POST | `/admin/questions` | Create question | 🔐 Admin |
| POST | `/admin/questions/bulk` | Bulk upload (JSON) | 🔐 Admin |
| PUT | `/admin/questions/:id` | Edit question | 🔐 Admin |
| DELETE | `/admin/questions/:id` | Soft-delete question | 🔐 Admin |
| POST | `/admin/tests` | Create mock test | 🔐 Admin |
| PUT | `/admin/tests/:id` | Edit mock test | 🔐 Admin |
| PATCH | `/admin/tests/:id/publish` | Publish mock test | 🔐 Admin |
| GET | `/admin/analytics/overview` | Platform statistics | 🔐 Admin |
| GET | `/admin/users` | List all users | 🔐 Admin |

### AI & ML

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/ai/explain` | Get AI explanation | ✅ |
| POST | `/ai/feedback` | Rate an explanation | ✅ |
| POST | `/ai/ml/weak-topics` | ML weak topic prediction | ✅ |
| POST | `/ai/ml/predict-score` | ML score prediction | ✅ |
| GET | `/ai/ml/health` | ML service status | ✅ |

---

## 🔒 Security Features

- **JWT Authentication** with access + refresh token rotation
- **Refresh token theft detection** — revokes all tokens on reuse
- **bcrypt (12 rounds)** password hashing
- **Redis-backed rate limiting** — 4 tiers (API, Auth, OTP, AI)
- **Helmet** — HTTP security headers
- **CORS** — configurable origin whitelist
- **express-mongo-sanitize** — prevents NoSQL injection (`$gt`, `$where`)
- **XSS protection** — HTML entity encoding (with whitelist for LaTeX)
- **Input validation** — schema-based, no external deps

---

## 📊 ML Models

| Model | Algorithm | Training Data | Use Case |
|-------|-----------|---------------|----------|
| **Weak Topic Detector** | Random Forest (100 trees) | PracticeAttempt history | Identifies struggling topics |
| **Score Predictor** | Gradient Boosting (150 trees) | MockTest score history | Predicts JEE score |

Both models include rule-based/statistical fallbacks for when the ML service is unavailable.

---

## 🐳 Docker Deployment

```bash
# Full stack — API + MongoDB + Redis + ML
cd Server
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f app
```

## ⚡ PM2 Deployment (VPS)

```bash
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 📝 License

ISC

---

Built with ❤️ for JEE aspirants.
