# 📘 JeeWallah API — Example Usage Guide

This file contains copy-paste-ready API examples using **cURL** and **JavaScript (Axios)**.

Base URL: `http://localhost:3000/api/v1`

---

## Table of Contents

1. [Health Check](#1-health-check)
2. [Register a Student](#2-register-a-student)
3. [Login with Password](#3-login-with-password)
4. [OTP-Based Passwordless Login](#4-otp-based-passwordless-login)
5. [Refresh Access Token](#5-refresh-access-token)
6. [Browse Subjects & Topics](#6-browse-subjects--topics)
7. [Get Questions with Filters](#7-get-questions-with-filters)
8. [Submit Practice Attempt](#8-submit-practice-attempt)
9. [Start a Mock Test](#9-start-a-mock-test)
10. [Save Test Progress (Auto-Save)](#10-save-test-progress-auto-save)
11. [Submit Mock Test](#11-submit-mock-test)
12. [Get Test Review](#12-get-test-review)
13. [Get Leaderboard](#13-get-leaderboard)
14. [Get Analytics](#14-get-analytics)
15. [Get AI Explanation](#15-get-ai-explanation)
16. [Get Weak Topics (ML)](#16-get-weak-topics-ml)
17. [Admin: Create a Question](#17-admin-create-a-question)
18. [Admin: Bulk Upload Questions](#18-admin-bulk-upload-questions)
19. [Admin: Create a Mock Test](#19-admin-create-a-mock-test)
20. [Admin: Platform Analytics](#20-admin-platform-analytics)

---

## 1. Health Check

```bash
curl http://localhost:3000/api/v1/health
```

**Response:**
```json
{
  "success": true,
  "message": "JeeWallah API is running",
  "timestamp": "2026-02-14T01:30:00.000Z",
  "uptime": 3600,
  "worker": 12345
}
```

---

## 2. Register a Student

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "rahul_sharma",
    "email": "rahul@example.com",
    "password": "Rahul@2026jee",
    "phone": "9876543210",
    "targetExam": "Both",
    "targetYear": 2027,
    "class": "12"
  }'
```

**JavaScript (Axios):**
```javascript
const axios = require("axios");
const API = "http://localhost:3000/api/v1";

const register = async () => {
    const { data } = await axios.post(`${API}/auth/register`, {
        username: "rahul_sharma",
        email: "rahul@example.com",
        password: "Rahul@2026jee",
        phone: "9876543210",
        targetExam: "Both",
        targetYear: 2027
    });

    console.log("User ID:", data.data.user.id);
    console.log("Access Token:", data.data.tokens.accessToken);
    console.log("Refresh Token:", data.data.tokens.refreshToken);
    return data;
};
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "username": "rahul_sharma",
      "email": "rahul@example.com",
      "role": "student",
      "profile": { "targetExam": "Both", "targetYear": 2027, "class": "12" }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

---

## 3. Login with Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rahul@example.com",
    "password": "Rahul@2026jee"
  }'
```

---

## 4. OTP-Based Passwordless Login

**Step 1: Send OTP**
```bash
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{ "email": "rahul@example.com", "purpose": "LOGIN" }'
```

**Step 2: Verify OTP**
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{ "email": "rahul@example.com", "otp": "482917" }'
```

**JavaScript (Axios):**
```javascript
const otpLogin = async (email) => {
    // Step 1: Request OTP
    await axios.post(`${API}/auth/send-otp`, { email, purpose: "LOGIN" });
    console.log("OTP sent! Check your email.");

    // Step 2: User enters OTP from email
    const otp = "482917"; // From email

    // Step 3: Verify and get tokens
    const { data } = await axios.post(`${API}/auth/verify-otp`, { email, otp });
    console.log("Login successful:", data.data.tokens.accessToken);
    return data;
};
```

---

## 5. Refresh Access Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }'
```

---

## 6. Browse Subjects & Topics

```bash
# Get all subjects
curl http://localhost:3000/api/v1/student/subjects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get chapters for a subject
curl http://localhost:3000/api/v1/student/chapters/SUBJECT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get topics for a chapter
curl http://localhost:3000/api/v1/student/topics/CHAPTER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**JavaScript:**
```javascript
const TOKEN = "eyJhbGciOiJIUzI1NiIs...";
const headers = { Authorization: `Bearer ${TOKEN}` };

const browseContent = async () => {
    const { data: subjects } = await axios.get(`${API}/student/subjects`, { headers });
    console.log("Subjects:", subjects.data.subjects);

    const physicsId = subjects.data.subjects[0].id;
    const { data: chapters } = await axios.get(`${API}/student/chapters/${physicsId}`, { headers });
    console.log("Chapters:", chapters.data.chapters);
};
```

---

## 7. Get Questions with Filters

```bash
# All questions for a topic
curl "http://localhost:3000/api/v1/student/questions?topicId=TOPIC_ID&difficulty=Medium&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Unattempted questions only
curl "http://localhost:3000/api/v1/student/questions?topicId=TOPIC_ID&excludeAttempted=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter by type and exam category
curl "http://localhost:3000/api/v1/student/questions?type=SCQ&examCategory=JEE%20Main&difficulty=Easy" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 8. Submit Practice Attempt

```bash
# Single Choice Question (SCQ)
curl -X POST http://localhost:3000/api/v1/student/practice/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "questionId": "QUESTION_ID",
    "selectedOptions": ["B"],
    "isAttempted": true,
    "timeSpent": 45
  }'

# Numerical answer
curl -X POST http://localhost:3000/api/v1/student/practice/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "questionId": "QUESTION_ID",
    "numericAnswer": 42.5,
    "isAttempted": true,
    "timeSpent": 120
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Practice attempt recorded",
  "data": {
    "attempt": {
      "id": "65f1a2b3...",
      "isCorrect": true,
      "marksAwarded": 4,
      "correctAnswer": { "optionKeys": ["B"] },
      "solution": {
        "text": "Using Newton's second law F=ma...",
        "method": "Direct application"
      }
    }
  }
}
```

---

## 9. Start a Mock Test

```bash
curl -X POST http://localhost:3000/api/v1/student/tests/TEST_ID/start \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Test started",
  "data": {
    "attempt": {
      "id": "ATTEMPT_ID",
      "startedAt": "2026-02-14T01:00:00.000Z",
      "expiresAt": "2026-02-14T04:00:00.000Z",
      "remainingTime": 10800,
      "responses": [
        {
          "questionId": { "_id": "...", "content": { "en": { "text": "..." } } },
          "status": "NOT_VISITED",
          "selectedOptions": [],
          "timeSpent": 0
        }
      ]
    },
    "mockTest": {
      "title": "JEE Main Mock Test #1",
      "duration": 180,
      "totalMarks": 300,
      "sections": [ ... ]
    }
  }
}
```

---

## 10. Save Test Progress (Auto-Save)

```bash
curl -X PATCH http://localhost:3000/api/v1/student/tests/attempt/ATTEMPT_ID/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "responses": [
      {
        "questionId": "Q_ID_1",
        "selectedOptions": ["A"],
        "isAttempted": true,
        "status": "ANSWERED",
        "timeSpent": 90
      },
      {
        "questionId": "Q_ID_2",
        "selectedOptions": [],
        "isAttempted": false,
        "status": "MARKED_FOR_REVIEW",
        "timeSpent": 30
      }
    ]
  }'
```

---

## 11. Submit Mock Test

```bash
curl -X POST http://localhost:3000/api/v1/student/tests/attempt/ATTEMPT_ID/submit \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Test submitted and evaluated",
  "data": {
    "result": {
      "totalScore": 156,
      "maxScore": 300,
      "percentage": 52,
      "stats": {
        "totalAttempted": 60,
        "totalCorrect": 42,
        "totalIncorrect": 18,
        "totalUnattempted": 15,
        "accuracy": 70
      },
      "subjectScores": [
        { "subjectId": "...", "scored": 56, "total": 100 },
        { "subjectId": "...", "scored": 48, "total": 100 },
        { "subjectId": "...", "scored": 52, "total": 100 }
      ],
      "timeTaken": 9200
    }
  }
}
```

---

## 12. Get Test Review

```bash
curl http://localhost:3000/api/v1/student/tests/attempt/ATTEMPT_ID/review \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Returns every question with your answer, correct answer, solution, and time spent.

---

## 13. Get Leaderboard

```bash
curl "http://localhost:3000/api/v1/student/leaderboard/TEST_ID?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 14. Get Analytics

```bash
curl http://localhost:3000/api/v1/student/analytics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Weak topics
curl http://localhost:3000/api/v1/student/analytics/weak-topics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 15. Get AI Explanation

```bash
# Step-by-step solution
curl -X POST http://localhost:3000/api/v1/ai/explain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "questionId": "QUESTION_ID",
    "interactionType": "EXPLAIN_SOLUTION"
  }'

# Hint (without revealing answer)
curl -X POST http://localhost:3000/api/v1/ai/explain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "questionId": "QUESTION_ID",
    "interactionType": "HINT"
  }'

# Ask a specific doubt
curl -X POST http://localhost:3000/api/v1/ai/explain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "questionId": "QUESTION_ID",
    "interactionType": "DOUBT",
    "studentDoubt": "Why do we use integration here instead of differentiation?",
    "language": "hi"
  }'
```

**Interaction types:** `EXPLAIN_SOLUTION`, `EXPLAIN_CONCEPT`, `HINT`, `DOUBT`, `ALTERNATIVE_METHOD`

---

## 16. Get Weak Topics (ML)

```bash
curl -X POST http://localhost:3000/api/v1/ai/ml/weak-topics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "weakTopics": [
      {
        "topicId": "...",
        "topicName": "Thermodynamics",
        "chapterName": "Heat & Thermodynamics",
        "subjectName": "Physics",
        "accuracy": 28.5,
        "severity": "severe",
        "recommendedAction": "Revise fundamentals. Start with NCERT-level questions."
      },
      {
        "topicId": "...",
        "topicName": "Differential Equations",
        "accuracy": 42.0,
        "severity": "moderate",
        "recommendedAction": "Focus on medium-difficulty problems."
      }
    ],
    "source": "ml_model",
    "totalTopicsAnalyzed": 45
  }
}
```

---

## 17. Admin: Create a Question

```bash
curl -X POST http://localhost:3000/api/v1/admin/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "subjectId": "PHYSICS_ID",
    "chapterId": "CHAPTER_ID",
    "topicId": "TOPIC_ID",
    "type": "SCQ",
    "difficulty": "Medium",
    "examCategory": "JEE Main",
    "content": {
      "en": { "text": "A ball is thrown vertically upward with velocity 20 m/s. The maximum height reached is: (g = 10 m/s²)" },
      "hi": { "text": "एक गेंद को 20 m/s के वेग से ऊर्ध्वाधर ऊपर की ओर फेंका जाता है। अधिकतम ऊँचाई है: (g = 10 m/s²)" }
    },
    "options": [
      { "key": "A", "text": { "en": "10 m" }, "isCorrect": false },
      { "key": "B", "text": { "en": "20 m" }, "isCorrect": true },
      { "key": "C", "text": { "en": "30 m" }, "isCorrect": false },
      { "key": "D", "text": { "en": "40 m" }, "isCorrect": false }
    ],
    "correctAnswer": { "optionKeys": ["B"] },
    "solution": {
      "en": { "text": "Using v² = u² - 2gh, at max height v=0: h = u²/2g = 400/20 = 20m" }
    },
    "marks": { "correct": 4, "incorrect": -1 }
  }'
```

---

## 18. Admin: Bulk Upload Questions

```bash
curl -X POST http://localhost:3000/api/v1/admin/questions/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "questions": [
      {
        "subjectId": "...", "chapterId": "...", "topicId": "...",
        "type": "SCQ", "difficulty": "Easy", "examCategory": "JEE Main",
        "content": { "en": { "text": "Question 1 text..." } },
        "options": [ ... ],
        "correctAnswer": { "optionKeys": ["A"] }
      },
      {
        "subjectId": "...", "chapterId": "...", "topicId": "...",
        "type": "INTEGER", "difficulty": "Hard", "examCategory": "JEE Advanced",
        "content": { "en": { "text": "Find the value of x..." } },
        "correctAnswer": { "numericValue": 42 }
      }
    ]
  }'
```

---

## 19. Admin: Create a Mock Test

```bash
curl -X POST http://localhost:3000/api/v1/admin/tests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "title": "JEE Main Mock Test #1",
    "examType": "JEE Main",
    "testType": "Full Length",
    "duration": 180,
    "accessLevel": "free",
    "sections": [
      {
        "name": "Physics",
        "type": "PHYSICS",
        "totalQuestions": 30,
        "maxQuestions": 25,
        "markingScheme": { "correct": 4, "incorrect": -1, "unattempted": 0 },
        "questions": [
          { "questionId": "Q_ID_1", "order": 1 },
          { "questionId": "Q_ID_2", "order": 2 }
        ]
      },
      {
        "name": "Chemistry",
        "type": "CHEMISTRY",
        "totalQuestions": 30,
        "maxQuestions": 25,
        "markingScheme": { "correct": 4, "incorrect": -1, "unattempted": 0 },
        "questions": [ ... ]
      },
      {
        "name": "Mathematics",
        "type": "MATHEMATICS",
        "totalQuestions": 30,
        "maxQuestions": 25,
        "markingScheme": { "correct": 4, "incorrect": -1, "unattempted": 0 },
        "questions": [ ... ]
      }
    ],
    "instructions": {
      "en": "This test follows the JEE Main pattern. Total time: 3 hours.",
      "hi": "यह टेस्ट JEE Main पैटर्न पर आधारित है। कुल समय: 3 घंटे।"
    }
  }'
```

---

## 20. Admin: Platform Analytics

```bash
curl http://localhost:3000/api/v1/admin/analytics/overview \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": { "total": 15432, "students": 15200, "recentSignups": 342, "dailyActive": 2100 },
    "content": { "questions": 8500, "mockTests": 45 },
    "activity": { "testAttempts": 28000, "practiceAttempts": 450000 }
  }
}
```

---

## 🔧 JavaScript SDK Pattern

```javascript
const axios = require("axios");

class JeeWallahAPI {
    constructor(baseURL = "http://localhost:3000/api/v1") {
        this.client = axios.create({ baseURL });
        this.accessToken = null;
    }

    setToken(token) {
        this.accessToken = token;
        this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    // Auth
    async register(data) { return (await this.client.post("/auth/register", data)).data; }
    async login(email, password) {
        const res = await this.client.post("/auth/login", { email, password });
        this.setToken(res.data.data.tokens.accessToken);
        return res.data;
    }

    // Student
    async getSubjects() { return (await this.client.get("/student/subjects")).data; }
    async getQuestions(filters) { return (await this.client.get("/student/questions", { params: filters })).data; }
    async submitPractice(data) { return (await this.client.post("/student/practice/submit", data)).data; }
    async startTest(testId) { return (await this.client.post(`/student/tests/${testId}/start`)).data; }
    async submitTest(attemptId) { return (await this.client.post(`/student/tests/attempt/${attemptId}/submit`)).data; }

    // AI
    async explain(questionId, type = "EXPLAIN_SOLUTION") {
        return (await this.client.post("/ai/explain", { questionId, interactionType: type })).data;
    }
}

// Usage
const api = new JeeWallahAPI();
await api.login("rahul@example.com", "Rahul@2026jee");
const subjects = await api.getSubjects();
const questions = await api.getQuestions({ topicId: "...", difficulty: "Medium" });
const result = await api.submitPractice({ questionId: "...", selectedOptions: ["B"], isAttempted: true });
const explanation = await api.explain(result.data.attempt.questionId);
```

---

**Happy Building! 🚀**
