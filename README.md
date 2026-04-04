# Clad — Always Covered. No Matter What.

**AI-Powered Parametric Income Insurance for Q-Commerce Delivery Partners**
Guidewire DEVTrails 2026 · *4AM_Club*

---

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![LightGBM](https://img.shields.io/badge/ML-LightGBM-9B59B6?style=flat-square)
![R2](https://img.shields.io/badge/Model_R%C2%B2-0.97-2ecc71?style=flat-square)
![MAE](https://img.shields.io/badge/Test_MAE-%E2%82%B92.5-2ecc71?style=flat-square)
![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/Frontend-GitHub_Pages-222?style=flat-square&logo=github&logoColor=white)

---

## Live Demo

| | Link |
|---|---|
| **App** | [pixelsout.github.io/Clad](https://pixelsout.github.io/Clad/) |
| **API** | [clad-production-531d.up.railway.app](https://clad-production-531d.up.railway.app) |
| **API Docs** | [clad-production-531d.up.railway.app/docs](https://clad-production-531d.up.railway.app/docs) |

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [System Workflow](#2-system-workflow)
3. [Weekly Premium Model](#3-weekly-premium-model)
4. [Parametric Triggers](#4-parametric-triggers)
5. [Exclusion Clauses](#5-exclusion-clauses)
6. [AI / ML Integration](#6-ai--ml-integration)
7. [Adversarial Defense](#7-adversarial-defense--anti-spoofing)
8. [Tech Stack](#8-tech-stack)
9. [What We Built — Phase 2](#9-what-we-built--phase-2)
10. [API Reference](#10-api-reference)

---

## 1. Problem Statement

India's Q-commerce delivery partners earn ₹600–₹900 per day with no safety net when they cannot work.

| Threat | Impact | Frequency |
|--------|--------|-----------|
| Monsoon rain | Zero deliveries, cannot ride | 6–10 days per month |
| Extreme heat (>42°C) | Dangerous outdoor conditions | 15+ days in summer |
| Hazardous AQI (>200) | Health advisory, riding unsafe | 30+ days/year in North India |
| Bandh or Curfew | Roads blocked, zero movement | Unpredictable |
| Platform outage | No orders despite availability | Unpredictable |

Workers lose up to **30% of monthly income** during monsoon months alone. Traditional insurance covers health or accidents — not lost wages. Manual claim processing takes up to a week.

**Clad uses parametric triggers.** When a disruption crosses a defined threshold — rainfall above 7.5 mm/hr, AQI above 200 — the system fires automatically and credits the worker's UPI account. No forms, no waiting, no agent calls.

### Core Differentiators

**Earning DNA** — Payouts are calculated from each worker's individual earning history, not city-wide averages. A worker earning ₹900 on Sunday evenings receives ₹900 as the payout baseline.

**Pincode Precision** — Triggers evaluate within a 3 km radius of the worker's registered zone. Rain in Koramangala does not trigger payouts in Whitefield.

**3-Layer Coverage** — Environmental signals, civic disruptions, and platform outages are all monitored and independently trigger payouts.

---

## 2. System Workflow

### Onboarding

```
Name + Phone
     |
     v
PAN OTP Verification  ──── Tax history tied to a real individual; cannot be batch-faked
     |
     v
Platform + Home Zone  ──── Pincode locked to 3 km monitoring radius
     |
     v
AI builds Earning DNA ──── From 8-week delivery history (day, hour, zone, season)
     |
     v
CladScore computed    ──── 0–100 trust and risk score
     |
     v
Plan activated        ──── UPI mandate; auto-renews every Monday
```

### Active Coverage

```
                  ┌─────────────┐
                  │  Monitoring │
                  │  (always on)│
                  └──────┬──────┘
                         |
         ┌───────────────┼───────────────┐
         |               |               |
         v               v               v
   Layer 1            Layer 2         Layer 3
 Environmental         Civic          Platform
 Rain / AQI /       Curfew /        Order volume
 Heat / Flood        Bandh           drop > 60%
         |               |               |
         └───────────────┼───────────────┘
                         |
                         v
              Threshold crossed in
              worker's pincode?
                        / \
                      YES   NO
                       |     |
                       v     v
             Fraud engine   Continue
             15 signals     monitoring
             < 3 seconds
                       |
             ┌─────────┼─────────┐
             |         |         |
             v         v         v
          CLEAN      HOLD      FLAG
         Grade A+   Grade B   Grade C/D
         Auto-pay   6hr hold  24hr review
         in 2hr     then pay  manual check
                       |
                       v
              UPI credited. Worker notified.
```

---

## 3. Weekly Premium Model

### CladScore — Trust and Risk Score (0–100)

```
CladScore = (C1 × 30%) + (C2 × 25%) + (C3 × 25%) + (C4 × 20%)
```

| Component | Weight | Signals |
|-----------|:------:|---------|
| C1 — Delivery Consistency | 30% | Active days, deliveries per day, streak length, platform tenure |
| C2 — Location Honesty | 25% | GPS consistency, zone adherence, cell tower match, PAN gate |
| C3 — Claim Integrity | 25% | Approval rate, fraud flags, claim-free streak bonus |
| C4 — Zone Risk Inverse | 20% | Flood frequency, historical disruption days per year |

### Grade to Payout Speed

```
Score  0 ────── 35 ────── 50 ────── 62 ────── 75 ────── 85 ──── 100
       |   D   |    C   |    B   |   B+   |    A   |   A+   |
Speed  | 24hr  |  24hr  |  6hr   |   2hr  |   2hr  | Instant |
       | review| review |  hold  |  auto  |  auto  |         |
```

| Grade | Score | Payout Speed | Premium Modifier |
|-------|:-----:|:------------:|:----------------:|
| A+    | 85–100 | Instant     | −12%             |
| A     | 75–84  | 2hr auto    | −8%              |
| B+    | 62–74  | 2hr auto    | −4%              |
| B     | 50–61  | 6hr hold    | Base             |
| C     | 35–49  | 24hr review | +10%             |
| D     | 0–34   | 24hr review | +20%             |

### ML Premium Breakdown (LightGBM)

```
Base premium (Plus plan)              ₹49.00
+ Flood risk — zone factor            +₹12.96
+ AQI annual average risk             + ₹2.60
+ Zone disruption frequency           + ₹1.35
+ Monsoon season surcharge            + ₹8.00   (active June–September)
− CladScore discount (Grade A)        − ₹5.60
− No-claim streak (8 weeks)           − ₹5.60
                                      ────────
Calibrated premium (× 0.7)            ₹43.87 / week
```

### Plan Tiers

|                     | Clad Basic | Clad Plus           | Clad Pro   |
|---------------------|:----------:|:-------------------:|:----------:|
| **Weekly cost**     | ₹29        | ₹49                 | ₹79        |
| **Weekly cap**      | ₹800       | ₹1,500              | ₹2,500     |
| **Payout speed**    | 24hr       | 2hr                 | Instant    |
| **Flood cap boost** | —          | +50% during alerts  | +50%       |
| **Best for**        | New workers | Most workers       | High earners |

---

## 4. Parametric Triggers

All triggers evaluate at **pincode level within a 3 km radius** — never city-wide.

### The 5 Automated Triggers

| # | Trigger | Condition | Payout Rate | Data Source |
|---|---------|-----------|:-----------:|-------------|
| 1 | Heavy Rain | Intensity > 7.5 mm/hr AND duration > 45 min | 60% | Open-Meteo |
| 2 | AQI Spike | AQI > 200 sustained for 3+ hours | 30–50% | AQICN |
| 3 | Waterlogging | Zone score > 0.65 AND rain > 6 mm/hr | 50% | IMD + zone database |
| 4 | Cyclone / High Wind | Wind speed > 60 km/h | 50% | Open-Meteo |
| 5 | Strike / Curfew | Civil alert active for registered pincode | 60–70% | data.gov.in + NLP |

### Payout Formula

```
Payout = Worker's Earning DNA (that day/hour) × Disruption Rate

Example
  Worker daily baseline   ₹720
  Trigger fired           Heavy Rain (60%)
  Plan                    Clad Plus (2hr payout)

  Payout = ₹720 × 60% = ₹432  →  credited via UPI within 2 hours
```

### Pincode Trigger Map

| Pincode | Zone | Triggers that fire |
|---------|------|--------------------|
| 560034 | Koramangala, Bangalore | Heavy Rain, Waterlogging |
| 560038 | Indiranagar, Bangalore | None (low-risk zone) |
| 110001 | Central Delhi | AQI Spike, Strike/Curfew |
| 400001 | Fort, Mumbai | Heavy Rain, Waterlogging, AQI |

### 3-Layer Trigger Architecture

```
┌─────────────────────────────────────────────────────┐
│  Layer 1 — Environmental                            │
│  Signals  : Rain intensity, heat index, AQI, floods │
│  APIs     : Open-Meteo, AQICN, Tomorrow.io          │
│  Threshold: 45+ min sustained rain / 3+ hr AQI      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Layer 2 — Civic Disruption                         │
│  Signals  : Curfew orders, bandh, zone closures     │
│  APIs     : data.gov.in + NLP headline scanner      │
│  Logic    : Disruption keywords matched to pincodes │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Layer 3 — Platform Signal  (unique to Clad)        │
│  Signals  : Zepto / Blinkit order volume            │
│  Condition: Drop > 60% vs. 7-day same-hour average  │
│             sustained for 90+ minutes               │
│  Rationale: A broken app is not the worker's fault  │
└─────────────────────────────────────────────────────┘
```

---

## 5. Exclusion Clauses

| # | Exclusion | Rationale |
|---|-----------|-----------|
| 1 | War or armed conflict | Systemic and uninsurable |
| 2 | WHO-declared pandemics or epidemics | Systemic and uninsurable |
| 3 | Nationwide government-mandated lockdowns | Systemic, government action |
| 4 | Terrorism or nuclear events | Force majeure |
| 5 | Disruptions caused or staged by the worker | Moral hazard |
| 6 | Platform deactivation due to policy violations | Worker's responsibility |
| 7 | Events below minimum duration thresholds | Data integrity |
| 8 | Events outside the worker's registered zone | Outside monitoring scope |
| 9 | Claims filed more than 6 hours after disruption | Data integrity |
| 10 | Weeks where the policy is paused | Policy inactive |

---

## 6. AI / ML Integration

### ML Pipeline

```
Worker profile + zone data
         |
         v
┌────────────────────────────┐
│      CladScore Engine      │
│  C1 Consistency   (30%)    │
│  C2 Location      (25%)    │
│  C3 Claim history (25%)    │
│  C4 Zone risk     (20%)    │
│                            │
│  Output: 0–100, grade,     │
│  payout speed, modifier    │
└────────────┬───────────────┘
             |
             v
┌────────────────────────────┐
│  LightGBM Premium Model    │
│  16 features               │
│  8,000 training samples    │
│  Test R²  = 0.97           │
│  Test MAE = ₹2.5           │
│  Calibration × 0.7         │
│                            │
│  Output: ₹20–₹120 / week  │
└────────────┬───────────────┘
             |
             v
┌────────────────────────────┐
│  Explainability Breakdown  │
│  Every rupee adjustment    │
│  shown to the worker       │
│  Flood / AQI / Monsoon /   │
│  CladScore / Streak        │
└────────────────────────────┘
```

### Model Card

| Property | Value |
|----------|-------|
| Algorithm | LightGBM Regressor |
| Training samples | 8,000 (synthetic + IMD-sourced zone data) |
| Features | 16 |
| Target | `optimal_premium` — ₹20 to ₹120 per week |
| Test R² | **0.97** |
| Test MAE | **₹2.50** |
| Calibration factor | 0.7 (conservative underwriting) |
| Fallback | Actuarial formula when model file is absent |

### Feature Importance (Top 8)

```
expected_weekly_payout       ████████████████████
weekly_disruption_prob       ████████████████
flood_frequency              █████████████
avg_daily_earning            ████████████
clad_score                   ██████████
waterlogging_score           ████████
is_monsoon                   ███████
disruption_days_per_year     ██████
```

---

## 7. Adversarial Defense & Anti-Spoofing

> "You can spoof your GPS. You cannot spoof your tax history, your delivery timestamps, or the sound of rain outside your window."

### The Threat Model

```
Coordinated attack scenario:
  500 accounts use GPS-spoofing apps to fake location inside a disruption zone.
  They wait for real rain, then simultaneously file claims.
  Simple GPS verification sees nothing unusual.
  Result: ₹2,10,000 drained in one weather event.

Clad's response: 15 independent signals across 3 layers.
Defeating one layer does not help the attacker.
```

### Layer 1 — Passive Environmental Checks

| Signal | What it catches | Friction for honest workers |
|--------|-----------------|-----------------------------|
| Ambient light sensor | Fraudster in a dry office fails silently | None — passive sampling |
| On-device audio classifier | Silence vs. rain ambience | None — runs in background |
| GPS jitter analysis | Spoofed GPS holds static ±0.0 m. Real hardware drifts ±3–8 m naturally | None |

### Layer 2 — Data Signals

| Signal | Detection Logic |
|--------|----------------|
| PAN verification | PAN carries real tax filing history. A fraud ring cannot batch-create 500 genuine PANs. |
| Delivery history gate | 8+ weeks of real delivery timestamps required before claim eligibility. |
| Claim timestamp clustering | Real workers file over 90–120 min. A scripted ring fires 500 claims in 3–5 min → batch held. |
| Account creation spike | Rolling 14-day registration rate per pincode. Surge cohort enters 24hr review probation. |
| Shared onboarding metadata | Same device model + OS version + IP subnet = batch-registered accounts → flagged. |
| Social graph isolation | Fake accounts have zero connections to the genuine worker ecosystem. |

### Layer 3 — Zone Consensus

```
If 40 or more nearby workers have clean signals during the same event:
  → Degraded-signal workers route to Yellow lane (not Red)

Real disruptions affect everyone in the zone simultaneously.
Honest workers are protected by their neighbours' clean data.
```

### Fraud Lane Routing

| Lane | Condition | Action | Worker message |
|------|-----------|--------|----------------|
| Green | CladScore ≥ 75, account > 60 days, all signals clean | Auto-payout in 2 hours | "Claim approved. ₹X on its way." |
| Yellow | 1–2 inconclusive signals, mid-range CladScore | 6hr hold → auto-approve | "Validating by [time]. You're covered." |
| Red | Hard anomaly, new account, device mismatch | 24hr manual review | "Security check in progress. Your claim is safe." |

### Honest Worker Protections

- False positives never count against CladScore. A Shield note is added instead.
- Claims approved after manual review earn CladScore +2 points (trust confirmed).
- Genuine network degradation during bad weather triggers a 20% signal tolerance adjustment across all Layer 1 checks.

---

## 8. Tech Stack

| Layer | Technology |
|-------|------------|
| Worker App | React PWA + Tailwind CSS |
| Ops Dashboard | React + Recharts |
| Backend API | FastAPI (Python) |
| Database | PostgreSQL + Redis |
| Async Jobs | Celery — payout processing, trigger monitoring |
| ML / AI | LightGBM, scikit-learn, networkx, Claude API |
| Weather Data | Open-Meteo, AQICN, Tomorrow.io |
| Civic Alerts | data.gov.in, NLP news headline scanner |
| Platform Signal | Custom JSON mock simulating Zepto/Blinkit order volumes |
| Payments | Razorpay sandbox (UPI mock) |
| Frontend Hosting | GitHub Pages |
| Backend Hosting | Railway |

---

## 9. What We Built — Phase 2

Phase 2 theme: **"Protect Your Worker"** (March 21 – April 4)

### Deliverable Status

| Deliverable | Status | Details |
|-------------|:------:|---------|
| Registration Process | Complete | Worker profile with zone, plan, earning data |
| Insurance Policy Management | Complete | Basic / Plus / Pro plan activation |
| Dynamic ML Premium Calculation | Complete | LightGBM inference + CladScore + line-item breakdown |
| Claims Management | Complete | 5 auto-triggers + zero-touch manual claim flow |
| 5 Automated Triggers | Complete | Rain, AQI, Waterlogging, Wind, Curfew |
| Frontend | Complete | Fully connected to all backend endpoints |
| AI Integration | Complete | LightGBM R²=0.97, 4-component CladScore, explainability output |

### Project Structure

```
clad/
├── index.html                      Frontend (single file, deployed on GitHub Pages)
├── app.py                          FastAPI — all 13 API routes
├── train_model.py                  LightGBM training script
│
├── core/
│   └── db.py                       In-memory store with JSON persistence
│
├── services/
│   ├── pricing_engine.py           ML pipeline: CladScore → LightGBM → breakdown
│   ├── pricing_service.py          Payout formula for trigger-created claims
│   ├── real_trigger_service.py     5 automated disruption triggers
│   └── claim_service.py            Manual claim creation and auto-approval routing
│
├── src/
│   └── predict.py                  LightGBM inference (lazy-loaded)
│
├── data/
│   ├── zone_risk.py                4-city zone risk profiles (IMD-sourced)
│   ├── clad_score.py               CladScore sub-model (4 components)
│   └── training_data.csv           8,000 training samples
│
└── models/
    ├── premium_model.pkl           Trained LightGBM model
    ├── scaler.pkl                  StandardScaler
    └── model_card.json             R², MAE, feature importance metadata
```

---

## 10. API Reference

Base URL: `https://clad-production-531d.up.railway.app`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with live counts |
| POST | `/register` | Register a gig worker |
| POST | `/policy/create` | Create or update an insurance policy |
| GET | `/policy` | List all policies |
| GET | `/policy/{name}` | Get one worker's policy |
| POST | `/premium` | ML-powered dynamic premium calculation |
| GET | `/trigger/check?pincode=` | Run all 5 disruption triggers |
| GET | `/claims` | List all claims |
| GET | `/claims/{user}` | Claims for one worker |
| POST | `/claims/create` | Zero-touch manual claim submission |
| GET | `/worker/{name}` | Full worker profile |
| GET | `/workers` | List all registered workers |
| POST | `/admin/reset?confirm=yes` | Reset database |
| GET | `/docs` | Interactive Swagger UI |

Full interactive documentation available at [clad-production-531d.up.railway.app/docs](https://clad-production-531d.up.railway.app/docs).

---

## Conclusion

Clad is not a feature extension of existing insurance — it is a fundamentally different product built for how gig workers live and earn. Weekly pricing matches their pay cycle. Earning DNA makes payouts personal and fair. Three trigger layers cover threats no competitor addresses. A 15-signal fraud defense protects the insurance pool without punishing honest workers.

The result: a delivery partner opens the app after a rain-soaked morning off, and ₹432 is already waiting. No claim filed. No agent called. Just covered.

---

*Clad — Always covered. No matter what.*
**4AM_Club · Guidewire DEVTrails 2026**
