# Clad  
## Always covered. No matter what.  
### AI-Powered Parametric Income Insurance for Q-Commerce Delivery Partners  
> **Guidewire DEVTrails 2026 · Phase 1 Submission**

---

## 1. Problem Statement

India's Q-commerce delivery partners earn between ₹600 and ₹900 per day, but they lack a safety net when they cannot work.

- **The Vulnerability:** During severe rain, extreme heat, poor air quality, floods, or civil unrest, work stops—and so does income.  
- **The Impact:** Workers miss 6–10 days during monsoon periods, losing up to 30% of their monthly income.  
- **The Gap:** Traditional insurance covers health or accidents—not lost wages. Claim processing can take up to a week.

💡 **Clad solves this.**

Clad doesn't employ slow, manual claims. Instead, it uses parametric triggers. When a disturbance goes over a certain level like rainfall >7.5mm/hour or temperature > 45 Celsius, the automated coverage system is triggered and the worker's UPI automatically gets paid. There are no documents to fill out and no waiting.

### What sets it apart:

- **Earning DNA:** Compensation is based on individual earning patterns, not averages.  
- **3-Layer Triggers:** Covers weather, civic disruptions, and platform outages.  
- **Pincode Precision:** Triggers are evaluated within a **3 km radius** of a worker’s home zone—not city-wide.  
  - Example: Rain in Koramangala does not trigger payouts in Whitefield.  
  - Only affected workers are compensated.

---

## 2. System Workflow
```
ONBOARDING (2 minutes)
Name → Phone → PAN CARD OTP → Platform → Home zone pincode
        ↓
AI builds Earning DNA from 8-week delivery history
CladScore calculated → Weekly plan assigned
UPI mandate activated (auto-renews every Monday)

ACTIVE COVERAGE (continuous)
Real-time monitoring: weather + AQI + civic alerts + platform signals
        ↓
Trigger threshold crossed in worker's pincode
        ↓
Fraud engine runs (15 signals, under 3 seconds)
        ↓
🟢 Green → Auto-payout in 2 hours
🟡 Yellow → 6-hour hold → auto-approve
🔴 Red   → 24-hour manual review
        ↓
UPI credit. Worker notified instantly.
```

---

## 3. Weekly Premium Model

### Earning DNA Engine
A regression model (scikit-learn) estimates a worker's anticipated pay depending on:
$$E_{predicted} = f(Day, Hour, Zone, Season, Historical Weather)$$
This makes sure that payouts are based on real earning potential. For example, a worker who normally makes ₹900 on Sunday nights will get paid that amount.

###  CladScore (0 to 100)
CladScore is recalculated every week and uses the following to figure out premiums and payout speed:
* Dependability (30%)
* Integrity of location (25%)
* History of claims (25%)
* Risk exposure in the zone (20%)

The formula for payouts is the worker's earnings DNA (for that day) times the disruption rate.
| Rate of Disruption | Condition |
| :--- | :--- |
| **60%** | Heavy rain of more than 7.5 mm/hr for more than 45 minutes |
| **40%** | Heat index over 42°C from 11 a.m. to 4 p.m. |
| **50%** | AQI > 300 for more than 3 hours |
| **80%** | Flood zone alerts |
| **40%** | Platform down > 60% drop · 90 minutes or more |
| **70%** | Curfew or civil unrest |

* Flood Shield Boost: When there is a flood alarm, the weekly payout limit goes up by 50%. For example, Shield Plus ₹1,500 becomes ₹2,250.
---

## 4. Parametric Triggers
Triggers are evaluated at **pincode level In 3km radius**, not city-wide.

**Layer 1 — Environmental**
- Rain intensity, heat index, AQI, flood zone alerts via Open-Meteo and AQICN APIs. Thresholds require sustained duration of 45+ min for rain, 3+ hrs for AQI to prevent single-reading false triggers.

**Layer 2 — Civic Disruption**
- Unplanned curfews, bandh, and zone closures detected via government alert APIs and a lightweight NLP scanner monitoring news headlines for disruption keywords matched to pincodes.

**Layer 3 — Platform Signal *(unique to Clad)***
- Simulated Zepto/Blinkit order volume API. If order volume in a zone drops >60% versus the 7-day same-hour average and sustains for 90+ minutes, workers in that zone are triggered. A broken app is not the worker's fault. Clad covers it.

---

## 5. AI/ML Integration

### Earning DNA Engine
A regression model trained on each worker's 8-week delivery history. 
Features: day of week, hour, zone, season, past weather correlation. 
Output: expected earnings for any given day/hour the personal payout baseline.

### CladScore Engine
Weighted multi-factor score recalculated every Sunday. 
Inputs: delivery consistency, GPS honesty, claim history, zone disruption exposure. Drives plan tier, payout speed, and fraud lane routing.
This score decides who can get a plan, how quickly they can get their money, and how to route fraud.

### Dynamic Premium Calculation
Premium adjusts within each tier based on zone historical disruption frequency and CladScore trajectory.

### Fraud Detection (detailed in Section 8)
Employs many methodologies, including anomaly detection (Isolation Forest), photo proofs of weather condition, graph-based network, and NLP-driven civic signal verification.

### Support Chatbot
Claude API-powered assistant handles worker queries in plain language policy details, claim status, payout timelines. Available 24/7 in-app.

---

## 6. Adversarial Defense & Anti-Spoofing Strategy.

> *"You can spoof your GPS. You cannot spoof a photo, your footsteps, the sound of rain outside your window, or the referral chain that brought you here."*

### The Threat
A coordinated ring of 500 accounts uses free GPS-spoofing apps to fake locations inside a disruption zone. They wait for real rain, then simultaneously file claims. Simple GPS verification sees nothing wrong. Result: ₹2,10,000 drained in one event.

Clad's defense runs **15 independent signals across 3 layers**. Defeating one layer does not help.

---

### 1. The Differentiation
*How we tell a genuinely stranded worker from a GPS spoofer*
- **Passive Environmental Check** At claim time, the app silently samples for 3 seconds. Ambient light sensor + on-device audio classifier confirm whether the environment is consistent with being indoors during rain. A fraudster in a dry office fails silently. Zero friction for honest users.

- **Delivery History Verification** — A real worker has 8+ weeks of delivery timestamps, earnings, zone activity, and order logs. A fake account created to game the system has none of this. Clad requires a minimum activity threshold before any claim is eligible real gig history cannot be faked across 500 accounts simultaneously. No history = no payout eligibility, regardless of other signals.

- **GPS Variance Analysis** — a spoofed GPS holds a perfectly static coordinate. A real phone shows natural jitter of 3–8 meters due to satellite drift. A coordinate stable within ±0.5m for 40+ minutes is a physical impossibility on real hardware.
---

### 2. The Data
*What we analyze beyond GPS to catch a coordinated ring*

- **PAN Verification at Onboarding** Unlike Aadhaar which can be forged or bought, PAN has a real tax filing history tied to a living individual. Clad mandates PAN verification during onboarding. A fraud ring cannot batch-create 500 PANs with genuine income histories. This closes the door before any fraud attempt begins.

- **Claim Timestamp Clustering** Real workers file over a 90–120-minute rolling window. A fraud ring scripts all 500 claims within 3–5 minutes. Burst of 50+ claims from the same pin code in 5 minutes → entire batch held for review.

- **Account Creation Spike Detection** Fake accounts are batch-registered 1–2 weeks before the attack. Rolling 14-day registration rate per pin code.  spike above baseline, entire surge cohort enters probation, 24hr review required.

- **Shared Onboarding Metadata** Fraud rings use the same tools. Clustering on device model, OS version, app version, and registration IP subnet exposes accounts created in the same batch environment.

- **Social Graph Isolation** Real workers overlap in delivery zones, pickup locations, and order pools. Fraudulent accounts are isolated with zero connections to the genuine worker ecosystem. Graph analysis detects accounts that exist in a vacuum.

---

### 3. The UX Balance
*Protecting honest workers caught in the net*

Claims flow into one of three lanes — never a binary block:

| Lane | When | Action | Worker Message |
|---|---|---|---|
| 🟢 Green | CladScore > 70, account > 60 days, all signals clean | Auto-payout in 2 hours | *"Claim approved. ₹X on its way."* |
| 🟡 Yellow | 1–2 inconclusive signals, medium CladScore | 6hr hold → auto-approve | *"Validating payout by [time]. You're covered."* |
| 🔴 Red | Hard anomaly, new account, device mismatch | 24hr manual review | *"Security check in progress. Your claim is safe."* |

**Honest Worker Protection:**
- False positives never count against CladScore. A Clad Shield note is added instead
- Approved-after-review claims earn CladScore +2 points (trust confirmed)
- Genuine network drops in bad weather get 20% signal tolerance adjustment across all Layer 1 checks
- If 40+ nearby workers have clean signals during the same event, degraded-signal workers route to yellow (not red) as real disruptions affect everyone, and honest workers are protected by their neighbours' clean data

---

## 7. Platform Justification

**Choice: Mobile-first Progressive Web App (PWA) for workers + Web dashboard for operations**

* **Choice:** Progressive Web App (PWA) for workers and a web dashboard for operations.
* **Device Profile:** Most workers use Android phones (₹6,000–₹12,000) and are reluctant to install new apps.
* **PWA Benefits:** Works in browser, easy install, offline use, no Play Store dependency, and perfect UPI integration.
* **Timeline:** PWA takes ~6 weeks; native apps take 10+ weeks.

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Worker App | React PWA + Tailwind CSS |
| Ops Dashboard | React + Recharts |
| Backend API | FastAPI (Python) |
| Database | PostgreSQL + Redis |
| Async Jobs | Celery (payout processing, trigger monitoring) |
| ML / AI | scikit-learn · networkx · TensorFlow Lite · Claude API |
| Weather | Open-Meteo (free) · AQICN (free) · Tomorrow.io (free tier) |
| Civic Alerts | data.gov.in · News NLP scanner |
| Platform Signal | Custom JSON mock server (simulates Zepto order volumes) |
| Payments | Razorpay sandbox (UPI mock) |
| Hosting | Vercel (frontend) + Railway (backend) |

---

## 9. Development Plan

| Week | Focus | Key Deliverables |
|---|---|---|
| 1 | Foundation | Data models, Earning DNA schema, mock API server |
| 2 | Onboarding + Policy | KYC flow, CladScore engine, weekly plan activation |
| 3 | Trigger Engine | 3-layer stack, pin code mesh, real-time monitoring |
| 4 | Claims + Payout | Fraud engine, lane routing, UPI mock payout |
| 5 | Dashboard | Analytics, CladScore visualisation, premium calculator |
| 6 | Polish | Demo script, stress testing, pitch deck |

---

## Conclusion

Clad is not a feature extension of existing insurance, it is a fundamentally different product built for how gig workers live and earn. Weekly pricing matches their pay cycle. Earning DNA makes payouts personal and fair. Three trigger layers cover threats no competitor addresses. And a 15-signal fraud defense protects the pool without punishing honest workers.

The result: a delivery partner opens the app after a rain-soaked morning off, and ₹420 is already waiting. No claim filed. No agent called. Just covered.

---

*Clad: Always covered. No matter what.*
**4AM_Club · Guidewire DEVTrails 2026**
