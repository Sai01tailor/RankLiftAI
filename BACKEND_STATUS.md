# 🔧 Backend + ML Service Status

Last updated: 2026-02-15 02:16 IST

---

## ✅ WHAT'S FULLY BUILT

### Server — `Server/` (Node.js + Express 5)

#### Infrastructure (100%)
| Component | File(s) | What It Does |
|-----------|---------|-------------|
| MongoDB connection | `config/db.js` | Auto-retry + graceful shutdown |
| Redis connection | `config/redis.js` | Graceful degradation (works without Redis) |
| Config loader | `config/index.js` | Reads `.env` — includes Razorpay + Cloudinary config |
| Logger | `utils/logger.js` | Winston — console + file rotation |
| Error handling | `utils/ApiError.js`, `middleware/errorHandler.js` | Centralized error responses |
| Response format | `utils/ApiResponse.js` | Consistent `{ success, data, message }` format |
| Pagination | `utils/pagination.js` | Page/limit/skip utility |
| Constants | `utils/constants.js` | Roles, question types, difficulty levels, plans |
| Async handler | `utils/asyncHandler.js` | Wraps async route handlers |

#### Models (9 models)
| Model | File | Key Fields |
|-------|------|-----------|
| User | `models/Users.js` | Auth, profile, streaks, subscription (Razorpay fields) |
| Subject / Chapter / Topic | `models/SubNTopic.js` | Academic hierarchy (slug-based) |
| Question | `models/Question.js` | 5 types (SCQ/MCQ/INTEGER/NUMERICAL/COMPREHENSION), bilingual, solutions |
| MockTest | `models/MockTest.js` | Sections, blueprints, JEE Main/Advanced patterns |
| TestAttempt | `models/TestAttempt.js` | Responses, scoring, evaluation, percentiles |
| PracticeAttempt | `models/PracticeAttempt.js` | Per-question tracking |
| PerformanceAnalytics | `models/PerformanceAnalytics.js` | Pre-computed snapshots |
| Leaderboard | `models/Leaderboard.js` | Test + global rankings with `rebuildForTest()` |
| AIInteractionLog | `models/AIInteractionLog.js` | Gemini usage logs |

#### Services (9 services)
| Service | File | What It Does |
|---------|------|-------------|
| JWT auth | `services/auth.js` | Token generation, verification, rotation |
| OTP | `services/otp.js` | Generate, store (Redis), verify, cooldown |
| Email | `services/email.js` | Nodemailer — sends OTP emails |
| Cache | `services/cache.js` | Redis get/set/delete, cache-aside pattern |
| Gemini AI | `services/gemini.js` | Step-by-step explanations, hints, doubts |
| ML client | `services/ml.js` | Flask API calls + fallback if ML is down |
| Razorpay | `services/payment.js` | Order creation, signature verification, plan config |
| Cloudinary | `services/fileUpload.js` | Upload/delete — avatar crop, question images |
| Cron Jobs | `services/cronJobs.js` | Hourly cleanup, daily leaderboard, weekly ML retrain |

#### Middleware (6 middleware)
| Middleware | File | What It Does |
|-----------|------|-------------|
| JWT auth | `middleware/auth.js` | Token verification + optional auth mode |
| Role guard | `middleware/roleGuard.js` | RBAC — admin / student / owner |
| Rate limiter | `middleware/rateLimiter.js` | 4 tiers: API (100/15m), Auth (20/15m), OTP (5/15m), AI (30/15m) |
| Validation | `middleware/validate.js` | Schema-based input validation |
| Sanitization | `middleware/sanitize.js` | NoSQL injection + XSS prevention |
| Error handler | `middleware/errorHandler.js` | Centralized error formatting |

#### Controllers & Endpoints (47 total endpoints)
| Controller | File | Endpoints |
|-----------|------|-----------|
| Auth | `controller/authController.js` | 9 EP — register, login, OTP send/verify, refresh, logout, logout-all, me, profile update |
| Student | `controller/studentController.js` | 17 EP — curriculum, practice, mock tests, analytics, leaderboard |
| Admin | `controller/adminController.js` | 11 EP — CRUD subjects/chapters/topics/questions/tests + stats |
| AI/ML | `controller/aiController.js` | 5 EP — explain, feedback, weak topics, score predict, health |
| Payment | `controller/paymentController.js` | 5 EP — plans, create order, verify, webhook, subscription status |

#### Routes
| Route Group | File | Base URL |
|------------|------|----------|
| Auth | `Routes/authRoutes.js` | `/api/v1/auth` |
| Student | `Routes/studentRoutes.js` | `/api/v1/student` |
| Admin | `Routes/adminRoutes.js` | `/api/v1/admin` |
| AI | `Routes/aiRoutes.js` | `/api/v1/ai` |
| Payment | `Routes/paymentRoutes.js` | `/api/v1/payments` |
| Health | `Routes/index.js` | `/api/v1/health` |

#### Scripts & DevOps
| Item | File | Purpose |
|------|------|---------|
| Question Seeder | `scripts/seedQuestions.js` | Bulk question import from JSON — validates all 5 types, resolves slugs → ObjectIds |
| Sample Questions | `scripts/questions.json` | 5 sample questions across Physics/Chemistry/Math |
| Sync Verifier | `scripts/verifySyncAll.js` | Tests every import chain across all files |
| Dockerfile | `Dockerfile` | Production Node.js container |
| Docker Compose | `docker-compose.yml` | Full stack — API + Mongo + Redis + ML |
| PM2 Config | `ecosystem.config.js` | Cluster mode config |
| Env Template | `.env.example` | All 30+ env vars documented |

#### Automated Background Tasks (Cron)
| Schedule | Task | What It Does |
|----------|------|-------------|
| Every hour (xx:00) | Token Cleanup | Removes expired refresh tokens + deactivates expired subscriptions |
| Daily (00:00 IST) | Leaderboard Rebuild | Rebuilds test + global rankings (daily/weekly/monthly/all-time) + clears Redis |
| Sunday (2 AM IST) | ML Retrain | Sends retrain requests to Flask service |

---

### ML Service — `ml-service/` (Python + Flask)

| Component | File | What It Does |
|-----------|------|-------------|
| Flask API | `app.py` | 5 endpoints: health, predict weak topics, predict score, retrain weak topics, retrain score |
| Weak Topic Predictor | `predictor.py → WeakTopicPredictor` | Random Forest classifier — identifies weak study areas |
| Score Predictor | `predictor.py → ScorePredictor` | Gradient Boosting regressor — predicts JEE score |
| Weak Topic Trainer | `trainer.py → WeakTopicTrainer` | MongoDB pipeline + synthetic data for training |
| Score Trainer | `trainer.py → ScoreTrainer` | MongoDB pipeline + synthetic data for training |
| Bootstrap | `bootstrap_models.py` | Creates initial model files from synthetic data (run once) |
| Pre-trained Models | `models/*.joblib` | 4 model files — ready to use |
| Test Script | `test_predict.py` | Prediction validation |
| Dockerfile | `Dockerfile` | Production container |
| Env Template | `.env.example` | `FLASK_PORT`, `MONGODB_URI`, `MODEL_DIR` |

#### ML API Endpoints
| Method | Path | Input | Output |
|--------|------|-------|--------|
| `GET` | `/health` | — | Model load status |
| `POST` | `/predict/weak-topics` | `{ topicAccuracy, recentAttempts, overallStats }` | Ranked weak topics |
| `POST` | `/predict/score` | `{ mockTestHistory, topicAccuracy }` | Predicted JEE score + percentile |
| `POST` | `/train/weak-topics` | — | Retrain from MongoDB, returns metrics |
| `POST` | `/train/score` | — | Retrain from MongoDB, returns metrics |

---

### File Count Summary

| Category | Files | Lines (approx.) |
|----------|-------|-----------------|
| Server — Config | 3 | ~235 |
| Server — Models | 10 | ~2,200 |
| Server — Services | 9 | ~1,350 |
| Server — Middleware | 6 | ~400 |
| Server — Controllers | 5 | ~1,320 |
| Server — Routes | 6 | ~165 |
| Server — Utils | 6 | ~300 |
| Server — Scripts | 3 | ~370 |
| Server — Entry + DevOps | 5 | ~200 |
| ML Service | 10 | ~750 |
| **Total Backend + ML** | **63 files** | **~7,290 lines** |

---

## 🖐️ WHAT YOU MUST DO MANUALLY (Backend + ML)

### Step 1: Create `Server/.env` (10 minutes)

```bash
cd Server
cp .env.example .env
```

Fill in every value. Here's where to get each credential:

| Variable | Where to Get | Cost |
|----------|-------------|------|
| `MONGODB_URI` | [MongoDB Atlas](https://cloud.mongodb.com) → Free cluster → Connection string | Free (512MB) |
| `JWT_ACCESS_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | — |
| `JWT_REFRESH_SECRET` | Run the same command again (use a DIFFERENT value) | — |
| `GEMINI_API_KEY` | [Google AI Studio](https://ai.google.dev) → Get API Key | Free |
| `SMTP_USER` | Your Gmail address | Free |
| `SMTP_PASS` | [Gmail App Passwords](https://myaccount.google.com/apppasswords) → Generate one | Free |
| `RAZORPAY_KEY_ID` | [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → API Keys | Free (test) |
| `RAZORPAY_KEY_SECRET` | Same page (shown once when generated) | Free (test) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay → Settings → Webhooks → Add endpoint → get secret | Free (test) |
| `CLOUDINARY_CLOUD_NAME` | [Cloudinary Console](https://cloudinary.com/console) → Dashboard | Free (25GB) |
| `CLOUDINARY_API_KEY` | Same page | Free |
| `CLOUDINARY_API_SECRET` | Same page | Free |
| `REDIS_HOST` | Local: `127.0.0.1` / Cloud: [Upstash](https://upstash.com) | Free |

### Step 2: Create `ml-service/.env` (1 minute)

```bash
cd ml-service
cp .env.example .env
```

Set `MONGODB_URI` to the same value as in `Server/.env`.

### Step 3: Install & Start (5 minutes)

```bash
# Terminal 1 — Backend API
cd Server
npm install
npm run dev
# → Running at http://localhost:3000
# → Verify: curl http://localhost:3000/api/v1/health

# Terminal 2 — ML Service
cd ml-service
pip install -r requirements.txt
python bootstrap_models.py     # First time only — creates model files
python app.py
# → Running at http://localhost:5000
# → Verify: curl http://localhost:5000/health
```

### Step 4: Create Admin User (2 minutes)

```bash
# 1. Register via API:
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"Admin","email":"admin@jeewallah.com","password":"Admin@1234"}'

# 2. Upgrade to admin in MongoDB:
mongosh "your-mongodb-uri"
use jeewallah
db.users.updateOne({ email: "admin@jeewallah.com" }, { $set: { role: "admin" } })
```

### Step 5: Seed Academic Data (30 minutes)

You must create Subjects → Chapters → Topics using admin API calls. Use the admin JWT token from login:

```bash
# Login as admin to get token:
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jeewallah.com","password":"Admin@1234"}'
# → Copy the accessToken from response

# Create subjects:
curl -X POST http://localhost:3000/api/v1/admin/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Physics","slug":"physics","displayOrder":1}'

curl -X POST http://localhost:3000/api/v1/admin/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Chemistry","slug":"chemistry","displayOrder":2}'

curl -X POST http://localhost:3000/api/v1/admin/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Mathematics","slug":"mathematics","displayOrder":3}'

# Then create chapters under each subject (use ID from response above):
curl -X POST http://localhost:3000/api/v1/admin/chapters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Mechanics","slug":"mechanics","subjectId":"PHYSICS_ID","displayOrder":1}'

# Then create topics under each chapter:
curl -X POST http://localhost:3000/api/v1/admin/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Newton Laws","slug":"newton-laws","chapterId":"CHAPTER_ID","displayOrder":1}'
```

### Step 6: Add Questions (10 minutes)

```bash
cd Server

# 1. Edit scripts/questions.json with real JEE questions
# 2. Validate (no DB changes):
npm run seed:dry-run

# 3. Import for real:
npm run seed
```

### Step 7: Create Mock Tests (1-2 hours)

After questions are seeded, create mock tests linking question IDs:

```bash
curl -X POST http://localhost:3000/api/v1/admin/tests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "JEE Main Mock Test 1",
    "examType": "JEE Main",
    "duration": 180,
    "totalMarks": 300,
    "sections": [
      { "name": "Physics", "questions": ["Q_ID_1","Q_ID_2"], "maxQuestions": 25 },
      { "name": "Chemistry", "questions": ["Q_ID_3","Q_ID_4"], "maxQuestions": 25 },
      { "name": "Mathematics", "questions": ["Q_ID_5","Q_ID_6"], "maxQuestions": 25 }
    ]
  }'
```

---

## 🧪 HOW TO TEST (Backend)

```bash
# 1. Health check
curl http://localhost:3000/api/v1/health

# 2. Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"Test","email":"test@email.com","password":"Test@1234","targetExam":"Both","targetYear":2027}'

# 3. Login → save the accessToken
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@email.com","password":"Test@1234"}'

# 4. Browse subjects
curl http://localhost:3000/api/v1/student/subjects \
  -H "Authorization: Bearer TOKEN"

# 5. Get mock tests
curl http://localhost:3000/api/v1/student/tests \
  -H "Authorization: Bearer TOKEN"

# 6. Start a test
curl -X POST http://localhost:3000/api/v1/student/tests/TEST_ID/start \
  -H "Authorization: Bearer TOKEN"

# 7. AI explanation
curl -X POST http://localhost:3000/api/v1/ai/explain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"questionId":"QUESTION_ID","type":"step-by-step"}'

# 8. ML health
curl http://localhost:5000/health

# 9. Payment plans
curl http://localhost:3000/api/v1/payments/plans
```

---

## 🚀 HOW TO DEPLOY (Backend)

### Option A: Docker (Easiest)

```bash
cd Server
cp .env.example .env   # Fill all values
docker-compose up -d --build

# Starts: API (:3000), MongoDB (:27017), Redis (:6379), ML (:5000)
```

### Option B: Railway / Render (Cloud)

1. Connect GitHub repo
2. Set root directory to `Server/`
3. Set start command: `node index.js`
4. Add all env vars from `.env.example`
5. Deploy ML service separately: root `ml-service/`, command `gunicorn app:app --bind 0.0.0.0:5000`

### Option C: VPS + PM2 (Manual)

```bash
cd Server
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

---

## 🔲 REMAINING — Backend Tasks Not Yet Built

| # | Task | Difficulty | Time |
|---|------|-----------|------|
| 1 | Forgot password flow (OTP → reset) | Easy | 1-2 hrs |
| 2 | Email verification after registration | Easy | 1 hr |
| 3 | Automated tests (Jest) | Medium | 2-3 days |
| 4 | Monitoring (Sentry + UptimeRobot) | Easy | 1 hr |
| 5 | CI/CD pipeline (GitHub Actions) | Medium | 2-3 hrs |
| 6 | SSL certificate (Cloudflare / Let's Encrypt) | Easy | Free |
| 7 | Previous Year Questions module | Medium | 1-2 days |
| 8 | Discussion forum / doubt threads | Hard | 3-5 days |
| 9 | Push notifications (Firebase) | Medium | 1-2 days |
| 10 | Social login (Google/Apple) | Medium | 4-6 hrs |

---

**Backend + ML is code-complete (63 files, ~7,290 lines, 47 API endpoints). Fill `.env` → seed data → deploy.** 🚀
