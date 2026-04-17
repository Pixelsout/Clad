<div align="center">

<img src="https://img.shields.io/badge/Always_Covered-No_Matter_What-111110?style=for-the-badge&labelColor=1A6B3A&color=111110" />

# 🛡 Clad
### AI-Powered Parametric Income Insurance for Gig Delivery Workers

**[🚀 Live App](https://clad-frontend-six.vercel.app)**

<br/>

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![LightGBM](https://img.shields.io/badge/ML-LightGBM-9B59B6?style=flat-square)
![R2](https://img.shields.io/badge/Model_R%C2%B2-0.92-2ecc71?style=flat-square)
![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Claude](https://img.shields.io/badge/Claude_Vision-Anthropic-D4A574?style=flat-square)
![Razorpay](https://img.shields.io/badge/Payments-Razorpay-3395FF?style=flat-square)

<br/>

> *"Every Monday morning, 15 million gig workers open their apps.*
> *On rainy days, they see zero orders. Zero earnings. No safety net.*
> *Clad changes that — automatically, in under 4 seconds."*

<br/>

**Guidewire DEVTrails 2026 · Team 4AM Club · Phase 3 Final Submission**

</div>

---

## 📍 Live Deployment

| | URL | Status |
|---|---|---|
| 🌐 **Frontend App** | [clad-frontend-six.vercel.app](https://clad-frontend-six.vercel.app) | ![Live](https://img.shields.io/badge/status-live-22C55E?style=flat-square) |

## 📊 Pitch Deck

| | Link |
|---|---|
| 📑 **Pitch Deck (PDF)** | [View on Google Drive](https://drive.google.com/file/d/1o2BD7xN3iwY-1bLCTZNB5x4Bo6FC6PsE/view?usp=sharing) |

---

## 🎯 The Problem

India has **15 million** gig delivery workers. On their worst days — rain, storms, AQI spikes — they earn **₹0**. Traditional insurance doesn't cover lost wages. Manual claims take 3 weeks. No product exists for this gap.

```
A typical delivery worker faces:

  🌧  Monsoon rain        →  6–10 zero-earning days/month
  😷  Hazardous AQI       →  30+ unsafe days/year
  🌊  Waterlogging        →  Roads impassable, no orders
  🌪  Cyclonic wind       →  Delivery halted by platform
  ⚠️  Strike / Curfew    →  Movement restricted

  Result: Up to 30% of monthly income lost
  Workers insured today: < 1%
  Total addressable market: ₹8,400 Cr/year
```

---

## ✅ The Solution

**Clad is parametric income insurance.** Objective weather data triggers automatic UPI payouts. No paperwork. No adjuster. No waiting.

```
Traditional Insurance          Clad
──────────────────────         ──────────────────────
File a claim manually    →     Trigger fires automatically
Wait 3 weeks             →     Approved in < 4 seconds
Adjuster reviews         →     5-layer AI fraud engine
Generic payout           →     Personalised via Earning DNA
Annual premium           →     Weekly ₹29–₹79 (pay-cycle match)
City-wide trigger        →     3km pincode precision
```

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLAD FULL SYSTEM                             │
├──────────────────┬──────────────────────┬───────────────────────────┤
│   REACT FRONTEND │   FASTAPI BACKEND    │   EXTERNAL SERVICES       │
│   (Vercel)       │   (Railway)          │                           │
│                  │                      │                           │
│  Splash Screen   │   17 REST endpoints  │  🌦 Open-Meteo            │
│  Onboarding x4   │   FastAPI v3.2       │     Rain + Wind + Weather │
│  Building Screen │   Python 3.11        │                           │
│  Home + Alerts   │                      │  😷 AQICN                 │
│  Claim + Camera  │   ┌──────────────┐   │     Real-time AQI         │
│  Payout (UPI)    │   │  LightGBM    │   │     150+ Indian cities    │
│  Admin Dashboard │   │  ML Engine   │   │                           │
│                  │   │  400 trees   │   │  🌊 Tomorrow.io           │
│  Framer Motion   │   │  R² = 0.92   │   │     Flood + Wind alerts   │
│  Zustand State   │   └──────────────┘   │                           │
│  Bricolage Font  │                      │  💳 Razorpay              │
│                  │   ┌──────────────┐   │     Contact → Fund → UPI  │
│                  │   │  5-Layer     │   │     Test sandbox mode     │
│                  │   │  Fraud Engine│   │                           │
│                  │   └──────────────┘   │  👁 Claude Vision         │
│                  │                      │     Photo fraud detect    │
│                  │   db_state.json      │     claude-opus-4-5       │
│                  │   (JSON persistence) │                           │
└──────────────────┴──────────────────────┴───────────────────────────┘
```

---

## ⚡ The 5 Parametric Triggers

All triggers evaluate at **pincode level within a 3km radius** — never city-wide.

| # | Trigger | Threshold | Payout Rate | Data Source |
|---|---------|-----------|:-----------:|-------------|
| 🌧 | **Heavy Rain** | >7.5 mm/hr sustained 45+ min | 60% daily | Open-Meteo |
| 😷 | **AQI Spike** | AQI >200 for 3+ hours | 30–50% | AQICN |
| 🌊 | **Waterlogging** | Zone score >0.65 + rain >6mm/hr | 50% | IMD + Zone DB |
| 🌪 | **Cyclone/Wind** | Wind speed >60 km/h | 50% | Tomorrow.io |
| ⚠️ | **Strike/Curfew** | Civil alert active in pincode | 60–70% | Internal signal |

### Payout Formula

```
Payout = Worker Earning DNA (that day/hour) × Disruption Rate

Example:
  Worker daily baseline:  ₹720  (Koramangala, Monday 3pm)
  Trigger:                Heavy Rain (60%)
  Plan:                   Clad Plus

  Payout = ₹720 × 60% = ₹432  →  UPI in 2 hours  ✓
```

---

## 🤖 ML Premium Engine

### LightGBM Model

```
Input: 16 features per worker
       ↓
┌─────────────────────────────────────┐
│         LightGBM Regressor          │
│  400 estimators · max_depth 6       │
│  Training samples: 8,000            │
│  Test R²:  0.92                     │
│  Test MAE: ₹2.50                    │
│  Calibration factor: 0.7            │
└─────────────────────────────────────┘
       ↓
Output: Personalised weekly premium (₹20 – ₹120)
```

### Feature Importance (Top 8)

```
expected_weekly_payout      ████████████████████  32%
weekly_disruption_prob      ████████████████      25%
flood_frequency             █████████████         20%
avg_daily_earning           ████████████          18%
clad_score                  ██████████            15%
waterlogging_score          ████████              12%
is_monsoon                  ███████               11%
disruption_days_per_year    ██████                 9%
```

### Premium Breakdown (live example)

```
Base premium (Plus plan)              ₹49.00
+ Flood risk — zone factor            +₹12.96
+ AQI annual average risk             + ₹2.60
+ Zone disruption frequency           + ₹1.35
+ Monsoon season surcharge            + ₹8.00
− CladScore discount (Grade A)        − ₹5.60
− No-claim streak bonus (8 weeks)     − ₹5.60
                                      ────────
Final weekly premium                  ₹43.87
```

---

## 🏆 CladScore — Trust & Risk Engine

```
CladScore = (C1 × 30%) + (C2 × 25%) + (C3 × 25%) + (C4 × 20%)
```

| Component | Weight | What it measures |
|-----------|:------:|-----------------|
| **C1** Delivery Consistency | 30% | Active days, streak length, platform tenure |
| **C2** Location Honesty | 25% | GPS consistency, zone adherence, PAN gate |
| **C3** Claim Integrity | 25% | Approval rate, fraud flags, claim-free streak |
| **C4** Zone Risk Inverse | 20% | Flood frequency, historical disruption days |

### Grade → Payout Speed

```
Score   0 ──── 35 ──── 50 ──── 62 ──── 75 ──── 85 ──── 100
        │  D  │   C  │   B  │  B+  │   A  │  A+  │
Speed   │24hr │ 24hr │  6hr │  2hr │  2hr │Instant│
        │rvw  │ rvw  │ hold │ auto │ auto │       │
Mod     │+20% │ +10% │ base │  −4% │  −8% │  −12% │
```

---

## 🛡 5-Layer Fraud Engine

> *"You can spoof your GPS. You cannot spoof your tax history, your delivery timestamps, or the sound of rain outside your window."*

```
CLAIM SUBMITTED
      │
      ▼
┌─────────────────────────────────────────────────┐
│  LAYER 0  🔐  Account Integrity                 │
│  PAN format + NSDL verify                       │
│  Account age < 3 days → REJECT                  │
│  No delivery history → REJECT                   │
│  Platform link verification                     │
└──────────────────────┬──────────────────────────┘
                       │ PASS
                       ▼
┌─────────────────────────────────────────────────┐
│  LAYER 1  📏  10-Signal Rules Engine             │
│  Amount > 90% daily avg      → FLAG             │
│  Filing at 3am               → FLAG             │
│  Round number amount         → FLAG             │
│  GPS velocity impossible     → FLAG             │
│  Reason ≠ active trigger     → FLAG             │
└──────────────────────┬──────────────────────────┘
                       │ PASS
                       ▼
┌─────────────────────────────────────────────────┐
│  LAYER 2  🕸  NetworkX Graph Analysis            │
│  >8 claims/hr from same zone → FRAUD RING       │
│  Worker in 3+ zones          → FLAG             │
│  Device shared across accts  → FLAG             │
│  Social graph isolation      → FLAG             │
└──────────────────────┬──────────────────────────┘
                       │ PASS
                       ▼
┌─────────────────────────────────────────────────┐
│  LAYER 3  🌲  Isolation Forest ML               │
│  6 features: amount_ratio, hour, DOW,           │
│  claim_freq, clad_score, account_age            │
│  scikit-learn anomaly detection                 │
└──────────────────────┬──────────────────────────┘
                       │ PASS
                       ▼
┌─────────────────────────────────────────────────┐
│  LAYER 4  👁  Claude Vision API                 │
│  Real photo vs stock image    → DETECT          │
│  AI-generated image           → REJECT          │
│  Weather evidence present     → VERIFY          │
│  EXIF timing cross-check      → VALIDATE        │
│  Scene = Indian street scene  → CONFIRM         │
└──────────────────────┬──────────────────────────┘
                       │ ALL CLEAR
                       ▼
                CLAIM APPROVED ✓
              CladScore updated +2
```

### Fraud Routing Lanes

| Lane | Condition | Action | Speed |
|------|-----------|--------|-------|
| 🟢 **Green** | Score ≥75, account >60 days, all signals clean | Auto-payout | 2hr |
| 🟡 **Yellow** | 1–2 inconclusive signals | 6hr hold → auto-approve | 6hr |
| 🔴 **Red** | Hard anomaly or new account | 24hr manual review | 24hr |

---

## 💳 Razorpay Payout Flow

```
Worker taps "Send to UPI"
         │
         ▼
Step 1: POST /v1/contacts
        { name, email, contact, type: "employee" }
         │
         ▼
Step 2: POST /v1/fund_accounts
        { contact_id, account_type: "vpa", vpa: "worker@upi" }
         │
         ▼
Step 3: POST /v1/payouts
        { fund_account_id, amount, currency: "INR",
          mode: "UPI", purpose: "payout" }
         │
         ▼
    ₹432 credited to worker's GPay/PhonePe
    Reference ID returned and stored
    Worker notified on screen
```

---

## 📱 Frontend Screens

| Screen | Purpose | Key Feature |
|--------|---------|-------------|
| **Splash** | Role selection | Worker 🛵 or Admin 🏢 |
| **OB1–OB4** | Onboarding | Name → PAN → Zone → Plan |
| **Building** | ML engine running | LightGBM inference live |
| **Home** | Coverage overview | Live trigger notification banner |
| **ManualClaim** | File a claim | Camera + Claude Vision verify |
| **Analyzing** | AI photo check | Real-time fraud detection |
| **Claiming** | Processing animation | 4-step pipeline visual |
| **Payout** | Receive money | UPI or Bank transfer |
| **ClaimRejected** | Fraud blocked | CladScore penalty applied |
| **Policy** | Coverage details | Active policy + plan info |
| **Profile** | Worker profile | Score, grade, history |
| **AdminLogin** | Insurer access | Password protected |
| **AdminDash** | Full analytics | 7-tab live dashboard |

---

## 🏢 Admin Dashboard — 7 Tabs

The insurer dashboard pulls live data from 4 backend endpoints simultaneously, auto-refreshing every 8 seconds.

| Tab | Data Source | What it shows |
|-----|-------------|---------------|
| 📊 **Overview** | `/dashboard/insurer` | KPIs, loss ratio bar, trigger breakdown, CladScore distribution |
| 👥 **Workers** | `/workers` | Full searchable registry, fraud flags, scores, earnings |
| 📋 **Claims** | `/claims` | Complete ledger, filter by status, payout reference IDs |
| 🛡 **Fraud** | `/workers` + `/claims` | 5-layer engine, fraud rate %, savings, flagged workers |
| 🔮 **Forecast** | `/dashboard/insurer` | 7-day ML forecast bars, plan distribution, TAM analysis |
| 🌦 **Live** | `/trigger/check` | Real-time zone scan, live weather readings, active alerts |
| ⚡ **APIs** | `/api/health` | All 9 integration statuses, HTTP codes, backend specs |

**Admin password:** `clad2026`

---

## 🔌 API Reference

Base URL: `https://clad-production-531d.up.railway.app`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check with live counts |
| `GET` | `/api/health` | All 9 integration statuses |
| `POST` | `/register` | Register a gig worker |
| `POST` | `/policy/create` | Create insurance policy |
| `POST` | `/premium` | ML-powered premium calculation |
| `GET` | `/trigger/check?pincode=` | Run all 5 disruption triggers |
| `GET` | `/trigger/simulate?pincode=&trigger=` | Simulate a specific trigger |
| `GET` | `/claims` | List all claims |
| `GET` | `/claims/{user}` | Claims for one worker |
| `POST` | `/claims/create` | Submit a manual claim |
| `POST` | `/vision/verify` | Claude Vision photo fraud check |
| `POST` | `/payout` | Razorpay UPI payout (3-step) |
| `GET` | `/dashboard/worker/{name}` | Worker analytics dashboard |
| `GET` | `/dashboard/insurer` | Full insurer analytics |
| `GET` | `/workers` | All registered workers |
| `POST` | `/admin/reset?confirm=yes` | Reset database |
| `GET` | `/docs` | Interactive Swagger UI |

---

## 🗂 Project Structure

```
clad/
├── clad-backend/
│   ├── app.py                      FastAPI — all 17 routes
│   ├── Procfile                    Railway deployment config
│   ├── requirements.txt            Python dependencies
│   ├── db_state.json               JSON persistence (workers/policies/claims)
│   │
│   ├── core/
│   │   └── db.py                   In-memory store + JSON read/write
│   │
│   ├── services/
│   │   ├── pricing_engine.py       CladScore → LightGBM → premium breakdown
│   │   ├── real_trigger_service.py 5 live weather/civic triggers
│   │   ├── claim_service.py        Claim creation + auto-routing
│   │   ├── fraud_engine.py         5-layer fraud pipeline
│   │   ├── vision_fraud.py         Claude Vision photo analysis
│   │   └── pricing_service.py      Payout formula calculator
│   │
│   ├── data/
│   │   ├── zone_risk.py            7 Bangalore pincode risk profiles
│   │   ├── clad_score.py           CladScore 4-component model
│   │   └── training_data.csv       8,000 training samples
│   │
│   └── src/
│       ├── predict.py              LightGBM inference (lazy-loaded)
│       ├── train_model.py          Model training script
│       ├── premium_model.pkl       Trained LightGBM model
│       └── scaler.pkl              StandardScaler
│
└── clad-frontend/
    ├── src/
    │   ├── api/
    │   │   └── clad.js             All API calls (VITE_API_URL aware)
    │   ├── store/
    │   │   └── useStore.js         Zustand global state
    │   ├── screens/
    │   │   ├── Splash.jsx          Role selection screen
    │   │   ├── Onboarding.jsx      OB1–OB4 registration
    │   │   ├── Building.jsx        ML engine + API calls
    │   │   ├── Home.jsx            Dashboard + trigger notifications
    │   │   ├── Claim.jsx           Full claim flow + vision
    │   │   ├── PolicyProfile.jsx   Policy + profile screens
    │   │   └── Admin.jsx           Full insurer dashboard
    │   └── components/
    │       └── UI.jsx              SBar, BNav, ScoreRing, icons
    ├── package.json
    └── vite.config.js
```

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | Mobile-first PWA |
| **Animations** | Framer Motion | Screen transitions |
| **State** | Zustand | Global app state |
| **Typography** | Bricolage Grotesque | Brand font |
| **Backend** | FastAPI (Python 3.11) | REST API, 17 endpoints |
| **ML Model** | LightGBM | Dynamic premium pricing |
| **Anomaly Detection** | scikit-learn IsolationForest | Fraud Layer 3 |
| **Graph Analysis** | NetworkX | Fraud Layer 2 |
| **AI Vision** | Claude Vision (claude-opus-4-5) | Photo fraud Layer 4 |
| **Payments** | Razorpay (test mode) | UPI/NEFT payouts |
| **Weather** | Open-Meteo | Rain, wind, weather code |
| **Air Quality** | AQICN | Real-time AQI, 150+ cities |
| **Flood/Wind** | Tomorrow.io | Cyclone and flood alerts |
| **Frontend Deploy** | Vercel | Auto-deploy from GitHub |
| **Backend Deploy** | Railway | Python + Procfile |
| **Persistence** | JSON file (db_state.json) | Demo-grade data store |

---

## 📦 Plan Tiers

| | Clad Basic | Clad Plus | Clad Pro |
|---|:---:|:---:|:---:|
| **Weekly cost** | ₹29 | ₹49 | ₹79 |
| **Weekly cap** | ₹800 | ₹1,500 | ₹2,500 |
| **Payout speed** | 24hr | 2hr | Instant |
| **Flood cap boost** | — | +50% during alerts | +50% |
| **Best for** | New workers | Most workers | High earners |

---

## 🔒 Exclusion Clauses

| # | Exclusion | Rationale |
|---|-----------|-----------|
| 1 | War or armed conflict | Systemic and uninsurable |
| 2 | WHO-declared pandemics | Systemic and uninsurable |
| 3 | Nationwide lockdowns | Government action, systemic |
| 4 | Terrorism or nuclear events | Force majeure |
| 5 | Worker-caused disruptions | Moral hazard |
| 6 | Platform deactivation (policy violation) | Worker's responsibility |
| 7 | Events below minimum duration | Data integrity |
| 8 | Events outside registered zone | Outside monitoring scope |
| 9 | Claims filed 6+ hours after event | Data integrity |
| 10 | Weeks where policy is paused | Policy inactive |

---

## 🚀 Running Locally

### Backend

```bash
cd clad-backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in: AQICN_TOKEN, TOMORROW_IO_KEY, RAZORPAY_KEY_ID,
#          RAZORPAY_KEY_SECRET, ANTHROPIC_API_KEY

# Start server
uvicorn app:app --reload --port 8000

# API docs available at:
# http://localhost:8000/docs
```

### Frontend

```bash
cd clad-frontend

# Install dependencies
npm install

# Create local env
echo "VITE_API_URL=http://127.0.0.1:8000" > .env.local

# Start dev server
npm run dev

# Opens at http://localhost:5173
```

---

## 🌍 Deployment

### Backend → Railway

```
1. Push clad-backend/ to GitHub
2. Railway → New Project → Deploy from GitHub
3. Settings → Root Directory: /clad-backend
4. Add environment variables (Railway dashboard → Variables):
   AQICN_TOKEN, TOMORROW_IO_KEY, RAZORPAY_KEY_ID,
   RAZORPAY_KEY_SECRET, ANTHROPIC_API_KEY, ALLOWED_ORIGINS
5. Procfile handles the start command automatically
```

### Frontend → Vercel

```
1. Push clad-frontend/ to GitHub
2. Vercel → New Project → Import repo
3. Settings → Root Directory: clad-frontend
4. Add environment variable:
   VITE_API_URL = https://your-railway-url.up.railway.app
5. Deploy — live in ~60 seconds
```

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| ML Model R² | **0.92** |
| Training samples | **8,000** |
| Live APIs | **9** |
| Backend endpoints | **17** |
| Fraud detection layers | **5** |
| Payout speed (Plus plan) | **< 2 hours** |
| End-to-end trigger → approval | **< 4 seconds** |
| Demo loss ratio | **48.3%** (target <55%) |
| India gig workforce | **15 million** |
| Currently insured | **< 1%** |
| Addressable market | **₹8,400 Cr/year** |

---

## 🗺 Roadmap

```
NOW ✅                    6 MONTHS                  12 MONTHS
─────────────────         ──────────────────         ──────────────────
React frontend            PostgreSQL 15              Aadhaar eKYC
FastAPI backend           Redis + Celery             IRDAI sandbox
LightGBM ML engine        Real Razorpay prod         License filing
5-layer fraud engine      Platform webhooks          Reinsurance deal
Claude Vision             PWA push notifications     Series A raise
Razorpay sandbox          IRDAI consultation         50K workers pilot
5 live trigger APIs       500-worker Zepto pilot
CladScore system
Vercel + Railway deploy
```

---

## 👨‍💻 Team

**4AM Club**

Built by Biswajeet Rout — full-stack implementation across 6 weeks covering FastAPI backend, LightGBM ML engine, 5-layer fraud detection, Claude Vision integration, Razorpay payout flow, and React mobile frontend.

> *"We're called 4AM Club because that's when Ravi starts his shift. That's when we started building too."*

---

<div align="center">

**Guidewire DEVTrails 2026 · Phase 3 Final Submission**

<br/>

[![Live App](https://img.shields.io/badge/🚀_Live_App-clad--frontend--six.vercel.app-1A6B3A?style=for-the-badge)](https://clad-frontend-six.vercel.app)

<br/>

*Clad — Always covered. No matter what.*

</div>
