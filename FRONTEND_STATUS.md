# 🎨 Frontend Status

Last updated: 2026-02-15 02:16 IST

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.0 | UI framework |
| Vite | 6.4 | Build tool + dev server |
| Tailwind CSS | 4.1 | Utility-first CSS (via `@tailwindcss/vite` plugin) |
| React Router DOM | 7.13 | Client-side routing |
| Axios | 1.13 | HTTP client with interceptors |
| React Hot Toast | 2.6 | Toast notifications |
| React Icons | 5.5 | Feather icons (Fi* prefix) |
| React KaTeX | 3.1 | LaTeX math rendering for JEE questions |
| Recharts | 3.7 | Charting library (available, SVG used currently) |
| Razorpay Checkout | CDN | Payment gateway (loaded via `<script>` in index.html) |

---

## ✅ WHAT'S FULLY BUILT

### Project Structure

```
client/src/
├── api/
│   ├── axios.js                    ← Axios instance + JWT interceptors + token refresh
│   └── services.js                 ← 34 API functions (auth, student, AI, payments)
├── context/
│   └── AuthContext.jsx             ← Auth state (login/register/OTP/logout/profile)
├── components/
│   ├── Navbar.jsx                  ← Responsive nav bar + profile dropdown
│   ├── ProtectedRoute.jsx          ← Route guard → redirects to /login
│   ├── test/
│   │   ├── MockTestInterface.jsx   ← ⭐ JEE NTA CBT exam interface (600+ lines)
│   │   └── TestReview.jsx          ← Post-test review + AI explanations
│   └── practice/
│       └── PracticeInterface.jsx   ← Topic-wise practice with filters
├── pages/
│   ├── Landing.jsx                 ← Hero + mini CBT preview + features + CTA
│   ├── Login.jsx                   ← Password + OTP login
│   ├── Register.jsx                ← Registration with JEE-specific fields
│   ├── Dashboard.jsx               ← Stats, quick actions, weak topics, AI prediction
│   ├── MockTestList.jsx            ← Test listing with search/filter/premium lock
│   ├── Analytics.jsx               ← Score chart, subject bars, weak topics, history
│   ├── Leaderboard.jsx             ← Podium top-3 + full rankings table
│   └── Pricing.jsx                 ← 3-tier plans + Razorpay checkout
├── index.css                       ← Design system (400+ lines)
├── main.jsx                        ← Entry point
└── App.jsx                         ← All routes (11 routes)
```

---

### API Layer (2 files)

| File | What It Does |
|------|-------------|
| `api/axios.js` | Creates Axios instance at `VITE_API_URL`. Interceptors: auto-attach JWT, auto-refresh expired tokens, handle 401 → redirect to login |
| `api/services.js` | 34 API functions organized into `authAPI` (9), `studentAPI` (16), `aiAPI` (5), `paymentAPI` (4) |

**API Functions:**

```
authAPI:      register, login, sendOTP, verifyOTP, refreshToken, logout, logoutAll, getMe, updateProfile
studentAPI:   getSubjects, getChapters, getTopics, getQuestions, getQuestionById, submitPractice,
              getBookmarks, toggleBookmark, getTests, startTest, saveProgress, submitTest,
              getTestReview, getTestHistory, getAnalytics, getWeakTopics, getLeaderboard
aiAPI:        getExplanation, submitFeedback, getWeakTopics, getScorePrediction, getMLHealth
paymentAPI:   getPlans, createOrder, verifyPayment, getSubscription
```

---

### Auth Context (1 file)

| Feature | How It Works |
|---------|-------------|
| State persistence | Stores `jw_user` + `jw_tokens` in `localStorage` |
| Login | Email + password → saves tokens → sets authenticated |
| Register | Full form → saves tokens → sets authenticated |
| OTP Login | Email + OTP → verifies → saves tokens |
| Logout | Calls API → clears storage → resets state |
| Profile update | Patches profile → updates stored user |
| Token refresh | `refreshUser()` re-fetches user from API |

---

### Components (5 components)

#### Navbar (`components/Navbar.jsx`)
- Sticky top bar, responsive (mobile hamburger menu)
- Logo "JW" + "JeeWallah" branding
- Nav links: Dashboard, Practice, Mock Tests, Analytics, Leaderboard
- Profile dropdown: Profile, Subscription, Settings, Logout
- Shows Login/Register buttons when not authenticated
- **Hides itself** during active mock tests (detects `/test/` in URL)
- Active link highlighting

#### ProtectedRoute (`components/ProtectedRoute.jsx`)
- Wraps protected routes
- Shows loader while auth loads
- Redirects to `/login` if not authenticated (saves return path in `location.state`)

#### MockTestInterface (`components/test/MockTestInterface.jsx`) — ⭐ CORE
The **exact NTA JEE Computer Based Test interface**:

| Feature | Implementation |
|---------|---------------|
| **Instructions Screen** | Shown before starting — exam rules, marking scheme |
| **Timer** | Countdown from test duration. Yellow at 10 min, red at 5 min |
| **Section Tabs** | Physics / Chemistry / Mathematics — click to switch |
| **Question Display** | Question text + image (if any), rendered with HTML |
| **Answer Types** | SCQ (radio), MCQ (checkbox), INTEGER (number input), NUMERICAL (decimal input) |
| **Question Palette** | Sidebar grid — color-coded per NTA standard |
| **Status Colors** | ⬜ Not Visited (gray), 🔴 Not Answered (red), 🟢 Answered (green), 🟣 Marked for Review (purple), 🟣🟢 Marked + Answered |
| **Navigation** | Save & Next, Mark for Review & Next, Clear Response, Back |
| **Auto-Save** | Every 30 seconds saves to `saveProgress()` API |
| **Tab Detection** | Counts tab switches, warns at 3, warns again at 5 |
| **Anti-Cheating** | Disables right-click, copy, cut, `Ctrl+S/U/P`, `Ctrl+Shift+I`, `F12`, `PrintScreen` |
| **Submit Modal** | Shows per-section summary (answered/not answered/marked/not visited) |
| **Auto-Submit** | When timer hits 0, auto-submits the test |
| **Full Screen** | No navbar — entire viewport is the CBT interface |

#### TestReview (`components/test/TestReview.jsx`)
- Score summary: total score, percentage, rank, percentile, time taken
- Subject-wise breakdown bars
- Question-by-question review: shows your answer vs correct answer
- Color highlighting: green for correct, red for incorrect
- "Get AI Explanation" button per question → calls Gemini AI
- Question overview palette (same colors as test)

#### PracticeInterface (`components/practice/PracticeInterface.jsx`)
- Filter panel: Subject → Chapter → Topic → Difficulty → Question Type
- Dynamic loading (chapters load when subject selected, etc.)
- JEE-style question display (same layout as mock test)
- Submit answer → instant correct/incorrect feedback
- Skip question button
- AI explanation integration
- Timer tracking
- Progress counter (X of Y questions)

---

### Pages (8 pages)

#### Landing Page (`pages/Landing.jsx`)
- Full-viewport hero with gradient background (`#0f172a → #1e3a8a → #3b82f6`)
- Headline: "Crack JEE with Smart Practice"
- Stats badges: 1M+ Students, 50K+ Questions, 99.5% Uptime, 4.8★ Rating
- **Mini CBT preview** in the right column — shows a sample question with palette
- 6 feature cards: NTA Interface, AI Explanations, Smart Analytics, Personalized Practice, Score Prediction, Anti-Cheating
- Call-to-action section with gradient
- Footer with navigation links

#### Login Page (`pages/Login.jsx`)
- Split layout: left branding + right form
- **Two modes:** Password login and OTP login (tab toggle)
- Password mode: email + password with show/hide toggle
- OTP mode: enter email → click "Send OTP" → enter 6-digit OTP → verify
- Branded gradient background
- Link to Register

#### Register Page (`pages/Register.jsx`)
- Split layout with branding
- Fields: Full Name, Phone, Email, Password (with strength hint)
- JEE-specific: Target Exam (Main/Advanced/Both), Target Year, Class (11/12/Dropper)
- Link to Login

#### Dashboard (`pages/Dashboard.jsx`)
- Welcome header with user name + streak indicator (🔥 X Day Streak)
- 4 stat cards: Tests Taken, Avg Score, Questions Practiced, Accuracy
- Quick Actions grid: Mock Test, Practice, Analytics, Leaderboard
- Recent Tests list with score and date
- Focus Areas (weak topics) with "Practice" button per topic
- AI Score Prediction card (click "Predict My Score" → ML prediction)

#### Mock Test List (`pages/MockTestList.jsx`)
- Header with gradient
- Filter tabs: All / JEE Main / JEE Advanced / Part Tests
- Search bar
- Test cards: title, type badge, premium badge, description, duration/marks/questions stats
- Locked indicator for premium tests (redirects to pricing)
- "Start Test" button → navigates to `/test/:testId`

#### Analytics (`pages/Analytics.jsx`)
- 5 overview stat cards
- **SVG line chart** showing score trend over time (hand-built, no external chart library)
- Subject-wise accuracy bars (color-coded: green >70%, yellow >40%, red <40%)
- Weak topics grid with accuracy percentages
- Test history table: test name, score, accuracy, percentile, date

#### Leaderboard (`pages/Leaderboard.jsx`)
- Gradient header with trophy emoji
- Test selector dropdown
- **Your Rank** card (purple gradient) — shows rank, score, percentile
- **Podium-style top 3** — gold/silver/bronze with emojis 🥇🥈🥉
- Full rankings list (alternating rows, "You" badge for current user)

#### Pricing (`pages/Pricing.jsx`)
- 3-tier cards: Basic (₹499/mo), Premium (₹999/3mo), Ultimate (₹1999/yr)
- "POPULAR" ribbon on Premium card
- Feature checklist per plan
- **Razorpay checkout integration:**
  1. Click "Subscribe" → `POST /payments/order` creates Razorpay order
  2. Opens Razorpay checkout modal
  3. On success, `POST /payments/verify` verifies signature
  4. Updates user subscription state
- "Current Plan" indicator for active subscription

---

### Design System (`index.css` — 400+ lines)

| Category | What's Defined |
|----------|---------------|
| **Fonts** | Inter (UI), JetBrains Mono (timer/code) — loaded from Google Fonts |
| **Colors** | Full palette: primary (blue), gray, success, warning, error, accent (purple) |
| **NTA CBT Colors** | `--nta-blue: #1a237e`, `--nta-answered: #4caf50`, `--nta-not-answered: #f44336`, `--nta-marked: #9c27b0`, `--nta-not-visited: #9e9e9e` |
| **Spacing** | CSS variables for consistent margins/padding |
| **Shadows** | 5 levels: sm, md, lg, xl, 2xl |
| **Animations** | `fadeIn`, `slideUp`, `slideDown`, `pulse`, `spin` |
| **Components** | `.btn` (primary/secondary/ghost + sizes), `.card`, `.input-field`, `.badge`, `.loader` |
| **JEE CBT** | `.cbt-header`, `.cbt-section-tabs`, `.cbt-question-panel`, `.cbt-sidebar`, `.cbt-timer`, `.cbt-palette` |
| **Responsive** | `.hide-mobile` class, scrollbar styling |

---

### Routing (App.jsx — 11 routes)

| Path | Page | Auth Required | Navbar |
|------|------|:------------:|:------:|
| `/` | Landing | No | Yes |
| `/login` | Login | No | No |
| `/register` | Register | No | No |
| `/pricing` | Pricing | No | Yes |
| `/dashboard` | Dashboard | ✅ | Yes |
| `/practice` | PracticeInterface | ✅ | Yes |
| `/mock-tests` | MockTestList | ✅ | Yes |
| `/analytics` | Analytics | ✅ | Yes |
| `/leaderboard` | Leaderboard | ✅ | Yes |
| `/test/:testId` | MockTestInterface | ✅ | **No** (full-screen CBT) |
| `/test-review/:attemptId` | TestReview | ✅ | Yes |

---

### File Count Summary

| Category | Files | Lines (approx.) |
|----------|-------|-----------------|
| Entry + Config | 3 | ~80 |
| Design System | 1 | ~400 |
| API Layer | 2 | ~220 |
| Auth Context | 1 | ~106 |
| Components | 5 | ~1,600 |
| Pages | 8 | ~1,700 |
| **Total** | **20 files** | **~4,106 lines** |

---

## 🖐️ WHAT YOU MUST DO MANUALLY (Frontend)

### Step 1: Create `client/.env` (1 minute)

```bash
cd client
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

| Variable | Where to Get |
|----------|-------------|
| `VITE_API_URL` | Your backend server URL. Default: `http://localhost:3000/api/v1` |
| `VITE_RAZORPAY_KEY_ID` | [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → API Keys → Key ID |

### Step 2: Install & Start (2 minutes)

```bash
cd client
npm install
npm run dev
# → Running at http://localhost:5173
```

### Step 3: Verify It Works

1. Open `http://localhost:5173` — Landing page should load
2. Click "Get Started" → Register page
3. Register → should redirect to Dashboard
4. Navigate: Dashboard → Mock Tests → Analytics → Leaderboard
5. Click a mock test → CBT interface should load full-screen

### Step 4: Test Payment Flow

1. Go to `/pricing` → click "Subscribe" on any plan
2. Razorpay modal should open
3. Use test card: `4111 1111 1111 1111`, any future expiry, any CVV
4. Complete payment → subscription should activate

---

## 🧪 HOW TO TEST (Frontend)

### Build Verification

```bash
cd client
npm run build
# Should output: ✓ built in ~2s, 0 errors
# Output: dist/index.html, dist/assets/index-*.css (~20KB), dist/assets/index-*.js (~406KB)
```

### Manual Test Checklist

```
AUTH FLOW:
  □  Landing page loads with hero + features
  □  Register → fills form → creates account → redirects to Dashboard
  □  Logout → redirects to Landing
  □  Login (password) → works
  □  Login (OTP) → sends OTP → verifies → works
  □  Protected routes redirect to /login when not authenticated

DASHBOARD:
  □  Stats cards show data (or zeros for new user)
  □  Quick action links work
  □  Recent tests list shows (or empty state)
  □  "Predict My Score" button calls ML API

MOCK TEST (Critical — JEE CBT Interface):
  □  Mock test list loads with test cards
  □  Click "Start Test" → Instructions screen shows
  □  Click "I am ready" → CBT interface loads full-screen
  □  Timer counts down
  □  Section tabs switch correctly
  □  Questions display with correct type (radio/checkbox/number)
  □  Clicking option marks answer, palette turns green
  □  "Mark for Review" works, palette turns purple
  □  "Clear Response" unselects answer
  □  "Save & Next" advances to next question
  □  Palette click jumps to question
  □  Tab switch shows warning
  □  Right-click disabled
  □  Submit modal shows per-section summary
  □  Submit → navigates to test review

TEST REVIEW:
  □  Score summary displays correctly
  □  Subject-wise bars show
  □  Question review shows your answer vs correct
  □  "Get AI Explanation" fetches from Gemini

PRACTICE:
  □  Filters load (subject → chapter → topic)
  □  Questions display in JEE style
  □  Submit answer → correct/incorrect feedback
  □  AI explanation works

OTHER PAGES:
  □  Analytics → charts and tables display
  □  Leaderboard → select test → rankings show
  □  Pricing → plans display → Razorpay checkout opens
  □  Navbar → profile dropdown works
  □  Navbar → mobile menu works
```

---

## 🚀 HOW TO DEPLOY (Frontend)

### Option A: Vercel (Easiest, Free)

```bash
cd client
npx -y vercel --prod

# Set env vars in Vercel dashboard:
#   VITE_API_URL = https://your-api.railway.app/api/v1
#   VITE_RAZORPAY_KEY_ID = rzp_live_xxxxxxxxxxxx
```

### Option B: Netlify (Free)

```bash
cd client
npm run build
# Upload dist/ folder to Netlify
# Or connect GitHub repo → set build command: npm run build, publish dir: dist
# Add _redirects file for SPA: /*  /index.html  200
```

### Option C: Nginx (VPS)

```bash
cd client
npm run build

# Copy dist/ to server:
scp -r dist/ user@server:/var/www/jeewallah/

# Nginx config:
server {
    listen 80;
    server_name jeewallah.com;
    root /var/www/jeewallah;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Option D: Serve Alongside Backend (Docker)

Build the frontend and serve static files from Express or add to docker-compose with an Nginx container.

---

## 🔲 REMAINING — Frontend Tasks Not Yet Built

### Priority 1: Before Launch

| # | Task | Difficulty | Time |
|---|------|-----------|------|
| 1 | **Profile page** — view/edit profile, avatar upload | Easy | 2-3 hrs |
| 2 | **Settings page** — change password, notification prefs | Easy | 1-2 hrs |
| 3 | **Error boundary** — catch React errors gracefully | Easy | 30 min |
| 4 | **Loading skeletons** — skeleton placeholders while data loads | Easy | 1-2 hrs |
| 5 | **404 Not Found page** | Easy | 30 min |

### Priority 2: Before Production

| # | Task | Difficulty | Time |
|---|------|-----------|------|
| 6 | **Admin dashboard** — manage questions, tests, users | Hard | 5-7 days |
| 7 | **PWA support** — offline access, install prompt | Medium | 3-4 hrs |
| 8 | **Dark mode toggle** | Easy | 2-3 hrs |
| 9 | **SEO** — dynamic meta tags per page | Easy | 1-2 hrs |
| 10 | **Performance** — image lazy loading, code splitting | Medium | 2-3 hrs |

### Priority 3: Nice-to-Have

| # | Task | Difficulty | Time |
|---|------|-----------|------|
| 11 | **Video solutions** (YouTube embeds) | Easy | 3-4 hrs |
| 12 | **Question bookmarks** UI | Easy | 1-2 hrs |
| 13 | **Study planner** | Medium | 2-3 days |
| 14 | **Notification center** | Medium | 1-2 days |
| 15 | **Mobile app** (React Native) | Hard | 2-3 weeks |

---

**Frontend is code-complete (20 files, ~4,106 lines, 11 routes). Create `.env` → `npm install` → `npm run dev` → open http://localhost:5173** 🚀
