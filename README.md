# 🚀 Ranklift AI — Next-Gen JEE Preparation Platform

> **Live Website:** [www.rankliftai.in](https://www.rankliftai.in)

Ranklift AI is a production-ready, scalable, and personalized AI-driven preparation platform for JEE (Main & Advanced) aspirants. Designed to handle large-scale user traffic, it provides AI-powered explanations, ML-based weak topic detection, real-time mock tests, and comprehensive analytics to supercharge students' learning experiences.

---

## ✨ Key Features

- **🤖 AI-Powered Doubt Resolution:** Integration with Google Gemini 2.0 Flash to provide step-by-step explanations, hints, and immediate doubt solving.
- **📈 ML-Driven Analytics:** Python Flask & scikit-learn microservice that automatically detects weak topics based on practice attempts and predicts JEE scores.
- **📝 Real-time Mock Tests:** Test blueprints matching actual JEE Main and Advanced exam patterns with dynamic, multi-format questions.
- **📊 Comprehensive Dashboards:** Actionable, granular insights into performance, per-subject mastery, and test-by-test progression.
- **🏆 Global Leaderboards:** Competitive global and test-specific rankings.
- **🔐 Premium Security:** Role-Based Access Control (RBAC), robust authentication (JWT + OTP), rate limiting, and NoSQL injection protection.

---

## 📐 Architecture Overview

```text
┌───────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                           │
│                     [ Hosted on Netlify ]                         │
└──────────────────────────────┬────────────────────────────────────┘
                               │ HTTPS (REST API)
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                   │
│                       [ Hosted on Render ]                        │
│                                                                   │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐          │
│  │  Auth   │   │ Student │   │  Admin  │   │   AI    │          │
│  └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘          │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ 
  │ MongoDB  │  │  Redis   │  │ Gemini   │  │ Flask ML │ 
  │  Atlas   │  │ (Cache)  │  │ 2.0 API  │  │ (Render) │ 
  └──────────┘  └──────────┘  └──────────┘  └──────────┘ 
```

---

## 🛠️ Tech Stack & Infrastructure

| Component | Technology | Hosting / Deployment | Purpose |
|-----------|-----------|----------------------|---------|
| **Frontend** | React / JavaScript | **Netlify** | User interface & student dashboard |
| **Backend API** | Node.js 22 + Express 5 | **Render** | Primary API Server |
| **ML Microservice**| Python Flask + scikit-learn | **Render** | Weak topic & score prediction |
| **Database** | MongoDB 7 (Mongoose 9) | MongoDB Atlas | Primary data store |
| **Cache** | Redis 7 | Upstash / Redis Labs | Caching, rate limiting, OTP storage |
| **AI** | Google Gemini 2.0 Flash | Google AI Studio | Live hints, step-by-step solutions |

### 🔒 Security & Optimization
- **Auth:** JWT + bcryptjs (Access/refresh tokens, password hashing)
- **Email:** Nodemailer (SMTP) for OTPs
- **Security:** Helmet, CORS, express-mongo-sanitize (HTTP hardening, injection prevention)
- **DevOps:** Docker support for local development

---

## 📁 Project Structure

```text
RankliftAI/
├── Client/                        # React Frontend (Netlify)
│   ├── src/                       # UI components, pages, hooks, state
│   └── public/                    # Static assets
│
├── server/                        # Node.js Express API (Render)
│   ├── config/                    # DB, Redis, and global configs
│   ├── models/                    # Mongoose Models (Users, Questions, Tests, etc.)
│   ├── services/                  # Business logic (Auth, OTP, AI, ML Client)
│   ├── middleware/                # Rate limiting, Auth guards, Error handling
│   ├── controller/                # Request handlers (Auth, Student, Admin, AI)
│   ├── Routes/                    # API Routing definitions
│   └── utils/                     # Helpers (Errors, Responses, Loggers)
│
└── ml-service/                    # Python ML Microservice (Render)
    ├── app.py                     # Flask API endpoints
    ├── predictor.py               # Inference algorithms
    ├── trainer.py                 # Training pipeline
    └── models/                    # Serialized .joblib model files
```

---

## 🚀 Local Development Guide

### Prerequisites
- **Node.js** ≥ 20
- **Python** ≥ 3.10
- **MongoDB** (Local or Atlas)
- **Redis** (Local or Upstash)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/RankliftAI.git
cd RankliftAI
```

### 2. Frontend Setup (Client)
```bash
cd Client
npm install
npm run dev
```

### 3. Backend API Setup (Server)
```bash
cd ../server
npm install
cp .env.example .env
# Fill in your MONGODB_URI, REDIS_URL, GEMINI_API_KEY, and JWT_SECRETS in .env
npm run dev
```

### 4. ML Service Setup (ml-service)
```bash
cd ../ml-service
pip install -r requirements.txt
cp .env.example .env
python bootstrap_models.py  # Create initial synthetic models
python app.py               # Start Flask server
```

---

## 📡 API Reference Overview

*(Base URL: `http://localhost:3000/api/v1` or `https://api.rankliftai.in/api/v1`)*

### Authentication & Users
- `POST /auth/register` - Register a new account
- `POST /auth/login` - Authenticate via credentials
- `POST /auth/send-otp` / `verify-otp` - Passwordless login capabilities
- `GET  /auth/me` - Retrieve current user profile

### Student Dashboard
- `GET  /student/subjects` & `chapters` - Fetch curriculum mapping
- `GET  /student/tests` - Browse mock tests
- `POST /student/tests/:id/start` - Initiate test sessions
- `GET  /student/analytics` - View performance insights and ML-generated weak subjects

### Admin Panel
- `POST /admin/questions` - Create / Manage question banks (incl. Bulk Upload)
- `POST /admin/tests` - Design and publish Mock Tests
- `GET  /admin/analytics/overview` - Platform-wide statistics

### AI & Machine Learning
- `POST /ai/explain` - Interact with Gemini 2.0 for step-by-step problem-solving
- `POST /ai/ml/weak-topics` - Trigger Python microservice for weakness detection
- `POST /ai/ml/predict-score` - Forecast targeted JEE scores

---

## ☁️ Deployment Strategy

Ranklift AI is optimized for cloud-native deployment:

1. **Frontend (`/Client`)**
   - Automatically deployed to **Netlify** configured with CD from main branch.
   - Pointed to `www.rankliftai.in`.
   
2. **Backend API (`/server`)**
   - Deployed as a Web Service on **Render**.
   - Connected to internal/external Redis for rate limiting and MongoDB Atlas for database persistence.
   - Set up custom domains for API (e.g., `api.rankliftai.in`).
   
3. **ML Microservice (`/ml-service`)**
   - Also deployed as a Web Service/Background Worker on **Render**.
   - Communicates securely with the Node Backend over authenticated REST.

---

Built to empower JEE aspirants with cutting-edge technology. 💡
