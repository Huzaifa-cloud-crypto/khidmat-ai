# Khidmat.ai — Agentic AI Service Orchestrator

> **Hackathon:** Google AI Seekho Phase II — AI Service Orchestrator Challenge  
> **Team Name:** AgentOrchestrator  
> **Member:** Muhammad Huzaifa  
> **Live Backend:** https://khidmat-ai-514385561723.us-central1.run.app  
> **Mobile APK:** https://expo.dev/accounts/huzaifaned/projects/mobile/builds/5ed52229-3a8a-45b8-abce-4916f377b785  
> **Model:** Gemini 2.5 Flash via Google AI Studio (billing-enabled, `aiseekho-challenge2` project)

---

## Table of Contents
1. [Architecture Overview](#architecture)
2. [Provider Dataset Schema](#provider-schema)
3. [Matching Factors (10-Factor System)](#matching-factors)
4. [Antigravity Agent Workflow](#antigravity-workflow)
5. [APIs & Tools](#apis--tools)
6. [Assumptions](#assumptions)
7. [Cost & Latency Analysis](#cost--latency)
8. [Baseline Comparison](#baseline-comparison)
9. [Privacy Note](#privacy-note)
10. [Limitations](#limitations)
11. [How to Run](#how-to-run)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native / Expo)         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Chat    │  │  Map     │  │ Bookings │  │  Logs     │  │
│  │ (GPS ✓) │  │ (60 pins)│  │  Screen  │  │  Screen   │  │
│  └────┬─────┘  └──────────┘  └──────────┘  └───────────┘  │
└───────┼─────────────────────────────────────────────────────┘
        │ HTTPS REST (JSON)
        ▼
┌──────────────────────────────────────────────────────────────┐
│           Backend — Node.js / Express (Cloud Run)            │
│                                                              │
│  POST /api/service/request                                   │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────┐   logTrace() to SQLite + in-memory     │
│  │  Orchestrator   │◄──────────────────────────────────┐    │
│  │  Agent          │                                   │    │
│  └────┬────────────┘                                   │    │
│       │                                                │    │
│  ┌────▼────────┐  ┌──────────────┐  ┌──────────────┐  │    │
│  │Intent Agent │  │Matching Agent│  │Pricing Agent │  │    │
│  │(Gemini LLM) │  │(10 factors)  │  │(surge+loyalty│  │    │
│  └────┬────────┘  └──────┬───────┘  └──────┬───────┘  │    │
│       │                  │                  │          │    │
│       ▼                  ▼                  ▼          │    │
│  ┌─────────┐  ┌────────────────┐  ┌────────────────┐  │    │
│  │ Gemini  │  │ providers.json │  │  services.json │  │    │
│  │ 2.5 API │  │ (60 providers) │  │  (complexity)  │  │    │
│  └─────────┘  └────────────────┘  └────────────────┘  │    │
│                                                        │    │
│  ┌────────────────┐  ┌──────────────┐  ┌───────────┐  │    │
│  │  Booking Agent │  │FollowUp Agent│  │Dispute    │  │    │
│  │  (SQLite DB)   │  │(checklist,   │  │Agent      │  │    │
│  │  (waitlist)    │  │ photo, score)│  │(penalty,  │──┘    │
│  └────────────────┘  └──────────────┘  │ refund)   │       │
│                                        └───────────┘       │
│                                                            │
│  GET /api/data/workload ──► WorkloadAgent (demand forecast)│
└────────────────────────────────────────────────────────────┘
        │
        ▼ (data persisted)
┌───────────────────┐
│ SQLite (sql.js)   │
│  - bookings       │
│  - disputes       │
│  - booking_logs   │
└───────────────────┘
```

---

## Provider Dataset Schema

File: `backend/src/data/providers.json` — 60 providers across 12 service categories and 27 Islamabad/Rawalpindi sectors.

```jsonc
{
  "id": "P-0046",
  "name": "Farhan Ansari",
  "phone": "0341-7891520",
  "category": "ac-repair",           // Service category
  "sector": "G-11",                  // Home sector (for distance calc)
  "rating": "4.7",                   // Aggregate star rating (0–5)
  "reviewsCount": 210,               // Total reviews
  "reliabilityScore": 89,            // On-time completion rate (0–100)
  "cancellationRate": 3,             // % of bookings cancelled
  "baseRate": 871,                   // Base service rate in PKR
  "capacity": 5,                     // Max concurrent jobs
  "jobsToday": 2,                    // Jobs already booked today
  "photoUrl": "https://...",         // Provider avatar
  "latitude": 33.670,                // GPS coordinate
  "longitude": 73.040,               // GPS coordinate

  // ── Added in Phase 2 (stress-test hardening) ──────────────────
  "specializations": ["ac-repair", "appliance-repair"],  // Skill tags
  "lastReviewDate": "2026-05-01",    // For review recency scoring
  "riskScore": 19,                   // Composite risk (0=safest, 100=riskiest)
  "totalBookings": 310,              // Lifetime completed jobs
  "experienceYears": 5               // Derived from totalBookings
}
```

**Categories (12):** `ac-repair`, `electrical`, `plumbing`, `cleaning`, `carpentry`, `masonry`, `painting`, `pest-control`, `appliance-repair`, `mechanic`, `beauty`, `tutoring`

**Sectors (27):** F-6 through G-15, H-8, H-9, H-13, I-8 through I-11, E-7, E-11, DHA-1/2, PWD, Bahria Town, and 4 Karachi sectors.

---

## Matching Factors (10-Factor System)

`backend/src/agents/matchingAgent.js` scores every candidate provider using 10 factors:

| # | Factor | Max Points | Logic |
|---|--------|-----------|-------|
| 1 | **Distance** | +30 | `max(0, 30 - distanceKm × 2)` via Haversine formula |
| 2 | **Rating** | +25 | `(rating / 5) × 25` |
| 3 | **Reliability / On-Time Score** | +20 | `(reliabilityScore / 100) × 20` |
| 4 | **Cancellation Rate** | −15 | `(cancellationRate / 15) × 15` penalty |
| 5 | **Availability / Capacity** | +10 | `(availableSlots / capacity) × 10` |
| 6 | **Budget Sensitivity** | +10 | +10 if user is budget-sensitive AND `baseRate < 1000` |
| 7 | **Specialization Match** | +15 | +15 if provider's `specializations[]` includes requested category |
| 8 | **Review Recency** | +10 | ≤7 days=10, ≤30 days=7, ≤60 days=4, older=1 |
| 9 | **Risk Score** | −15 | `(riskScore / 100) × 15` penalty |
| 10 | **Complexity Fit** | +10 | Complex jobs: +10 if `experienceYears≥3` AND `totalBookings≥100`; +5 if `experienceYears≥2` |

**Example scoring trace** (from live request `sample-trace-001`):
```
Provider: Farhan Ansari (score: 99.5/115 max)
  +17.0  distance (6.5 km)
  +23.5  rating (4.7/5)
  +17.8  reliability (89%)
  -3.0   cancellation rate (3%)
  +5.0   availability (2/5 slots used)
  +10.0  budget-friendly rate (Rs.871)
  +15.0  specialization match (ac-repair, appliance-repair)
  +7.0   review recency (17 days ago)
  -2.9   risk score (19)
  +5.0   complexity fit (310 bookings, 5 years)
```

Why Farhan over a closer provider? **Specialization match (+15) + recency (+7) + low risk** outweigh the distance penalty, exactly as the requirements specify.

---

## Antigravity Agent Workflow

### System Prompt Design (`intentAgent.js`)
The Gemini model is called with a **structured JSON schema** enforced via `responseMimeType: "application/json"`. The prompt instructs it to:
- Handle **Urdu, Roman Urdu, English, code-switching, slang, misspellings**
- Output `confidence_score` (0.0–1.0)
- Set `clarification_needed: true` if confidence < 0.7 or if `location_sector` is missing
- Return `clarification_question` in **the same language as the user's input**
- Extract: `service_category`, `location_sector`, `time_preference`, `urgency`, `budget_sensitivity`, `complexity`

### Full Agent Pipeline

```
User Input (multilingual)
        │
        ▼
┌───────────────────────────────────────────────┐
│ 1. ORCHESTRATOR receives + creates requestId  │
└───────────────────────┬───────────────────────┘
                        │ logTrace → DB
                        ▼
┌───────────────────────────────────────────────┐
│ 2. INTENT AGENT (Gemini 2.5 Flash)           │
│    • Parses multilingual input                │
│    • Returns structured JSON + confidence     │
│    • If confidence < 0.7 → CLARIFICATION     │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ 3. MATCHING AGENT                             │
│    • Loads providers.json fresh each call    │
│    • Applies 10-factor scoring               │
│    • Returns top 3 ranked providers           │
│    • If no providers → ALTERNATE SLOTS        │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ 4. PRICING AGENT                              │
│    • Base rate × complexity multiplier        │
│    • + Urgency premium (Rs.200–500)           │
│    • + Distance surcharge (Rs.50/km >5km)     │
│    • × Surge multiplier (peak hours 1.2x)     │
│    • − Loyalty discount (3+ bookings: 5%)     │
│    • Budget alternative quote if requested    │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ 5. BOOKING AGENT                              │
│    • Checks capacity (double-booking guard)   │
│    • Adds travel-time buffer to slot          │
│    • Inserts to SQLite                        │
│    • Generates SMS/receipt/calendar entry     │
│    • If full → WAITLIST + alternate slots     │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
                    SUCCESS ✅
```

### Post-Booking Lifecycle (triggered via separate API calls)

```
FOLLOW-UP AGENT                    DISPUTE AGENT
─────────────────────────          ─────────────────────────────
EN_ROUTE  → ETA + SMS             NO_SHOW      → Rs.500 credit
                                               → reliability -8
IN_PROGRESS → 6-step checklist    QUALITY_ISSUE → 30% refund
                                               → reliability -4
COMPLETED → Photo evidence        PRICE_MISMATCH → human escalation
          → Rating prompt                      → reliability -2
          → Provider score +1     OVERRUN      → case escalated
          → Risk score updated
```

### Fallback Behaviors

| Situation | Response |
|-----------|----------|
| Gemini quota exceeded | `QUOTA_EXCEEDED` → user-friendly message |
| Model not found (404) | `MODEL_NOT_FOUND` → error message |
| Invalid API key | `INVALID_API_KEY` → error message |
| No providers found | `NO_PROVIDERS` + 3 alternate slots |
| Provider at capacity | `WAITLISTED` + alternate slots |
| Low confidence parse | `CLARIFICATION_NEEDED` + question in user's language |
| Missing location | Clarification asked in same language |

---

## APIs & Tools

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/service/request` | Main booking flow — accepts `{userInput, requestId}` |
| `GET` | `/api/data/providers` | List all 60 providers with GPS coordinates |
| `GET` | `/api/data/workload` | Provider utilization, demand forecast, recommended slots |
| `GET` | `/api/data/logs/:requestId` | Retrieve full agent trace for a request |
| `GET` | `/api/bookings` | All booking records |
| `POST` | `/api/bookings/:id/status` | Update status: `EN_ROUTE`, `IN_PROGRESS`, `COMPLETED` |
| `POST` | `/api/bookings/:id/dispute` | Raise dispute: `NO_SHOW`, `QUALITY_ISSUE`, `PRICE_MISMATCH`, `OVERRUN` |

### External Tools / SDKs

| Tool | Purpose |
|------|---------|
| `@google/genai` v2+ | Gemini 2.5 Flash API (structured JSON output) |
| `expo-location` | Real GPS coordinates in mobile app |
| `react-native-maps` | Google Maps with 60 provider pins |
| `sql.js` | In-memory SQLite (stateless Cloud Run compatible) |
| `uuid` | Unique request/booking IDs |
| `express` | REST API server |
| Google Cloud Run | Serverless hosting (auto-scaling) |
| EAS Build | Android APK compilation |

---

## Assumptions

1. **Mock Providers**: 60 procedurally generated providers across Islamabad/Rawalpindi sectors. Real deployment would source from a live provider registry or Google Sheets.
2. **Authentication**: Hardcoded `USER-123` for the demo. Production would use Firebase Auth or JWT.
3. **SMS/WhatsApp**: Notification text is simulated in the booking response. Production would use Twilio or Meta Cloud API.
4. **Calendar Integration**: `calendarEntry` object generated but not pushed to Google Calendar. Production would use the Google Calendar API.
5. **Payment**: No real payment processing. Pricing is quoted; payment integration would use JazzCash / EasyPaisa APIs.
6. **SQLite Persistence**: `sql.js` stores data in memory per Cloud Run instance (resets on cold start). Production would use Cloud SQL or Firestore.
7. **Surge Pricing**: Surge multipliers are based on simulated Pakistani service demand patterns, not live telemetry.

---

## Cost & Latency Analysis

### Per-Request Cost (Gemini 2.5 Flash)

| Component | Tokens | Cost (approx.) |
|-----------|--------|----------------|
| System prompt + schema | ~400 tokens input | $0.000030 |
| User input | ~50 tokens input | $0.000004 |
| Structured JSON output | ~150 tokens | $0.000015 |
| **Total per request** | ~600 tokens | **~$0.000050** |

At 1,000 daily requests: ~**$0.05/day** (well within free tier of 1,500 req/day)

### Latency Breakdown (measured locally)

| Stage | Time |
|-------|------|
| Intent extraction (Gemini API) | ~3,500–4,200 ms |
| Provider matching (in-memory) | <5 ms |
| Pricing calculation | <1 ms |
| Booking (SQLite insert) | <2 ms |
| **Total end-to-end** | **~3.5–4.5 seconds** |

> Bottleneck is the Gemini API round-trip. On Cloud Run with warm instances, this is consistent. Cold starts add ~800ms.

---

## Baseline Comparison

| Feature | Naive Approach | Khidmat.ai (Agentic) |
|---------|---------------|----------------------|
| Language | English keywords only | Urdu + Roman Urdu + English + code-switching + slang |
| Provider Selection | Nearest provider wins | 10-factor weighted scoring system |
| Pricing | Fixed flat rate | Dynamic: complexity × surge × distance − loyalty |
| Scheduling | First available | Travel-time buffer + double-booking guard + waitlist |
| Disputes | Manual ticket | Auto-resolved with compensation + provider penalty |
| Transparency | None | Full agent trace with per-factor reasoning |
| Fallbacks | Error message | Alternate slots / waitlist / clarification question |
| Provider Health | Static | Reputation updated after every job/dispute |

---

## Privacy Note

- No real user data is collected. The `userId` is hardcoded as `USER-123` for demo purposes.
- Provider data is entirely synthetic — no real names, phone numbers, or locations are from actual individuals.
- The Gemini API processes user input text only to extract structured intent. No input text is stored beyond the active request session.
- GPS coordinates captured from the mobile device are used **only** to find the nearest sector (Haversine formula). They are never sent to the server or stored.
- All SQLite data is ephemeral (resets on Cloud Run cold start).

---

## Limitations

1. **Single LLM Call Architecture**: Currently one Gemini call per request. Complex multi-turn conversations (follow-up questions) would need session state management.
2. **No Real-Time Provider Availability**: `jobsToday` is static per deployment. Real system needs live provider status updates.
3. **Geographic Coverage**: Only 27 Islamabad/Rawalpindi sectors + 4 Karachi sectors. Other Pakistani cities not covered.
4. **No Voice Input**: The microphone button in the UI is a placeholder. Full integration would use Whisper or Google Speech-to-Text.
5. **Concurrency at Scale**: `providers.json` file-level locking for reputation updates is not suitable for high concurrency. Production needs atomic DB updates.
6. **SQLite Ephemeral**: Booking history resets on each Cloud Run instance restart (cold start). Production would use Cloud SQL.
7. **Surge Pricing**: Based on simulated demand curves, not real market data.

---

## How to Run

### Prerequisites
- Node.js 18+, npm
- Google AI Studio API key (`GEMINI_API_KEY`)
- Android device or emulator (for APK)

### Backend (Local)
```bash
cd backend
cp .env.example .env          # Add your GEMINI_API_KEY
npm install
npm start                      # Runs on http://localhost:3000
```

### Mobile App (Android APK)
Download latest APK:
👉 https://expo.dev/accounts/huzaifaned/projects/mobile/builds/f01df0d9-2f74-4143-8d78-b4a941ebe7af

### Web Frontend
Open `http://localhost:3000` in browser (served by backend as static files from `mobile_web/`)

### Cloud Run (Production)
```bash
gcloud run deploy khidmat-ai --source . --region us-central1 --allow-unauthenticated
```
Live URL: https://khidmat-ai-514385561723.us-central1.run.app

---

## Evaluation Criteria Self-Assessment

| Criterion | Weight | Evidence |
|-----------|--------|----------|
| **Antigravity Integration** | 20% | 7-agent pipeline (Orchestrator → Intent → Matching → Pricing → Booking → FollowUp → Dispute → Workload). Full trace logged per request with `requestId`. |
| **Matching & Decision Quality** | 25% | 10-factor scoring with explicit per-factor reasoning logged. Specialization, recency, risk, complexity-fit added beyond basic 6. See `matchingAgent.js`. |
| **Multilingual Robustness** | 15% | Tested: Roman Urdu slang, heavy typos, code-switching, ambiguous inputs. Confidence scoring + same-language clarification. See stress test 3a/3b/3c. |
| **Scheduling, Pricing & Workflow** | 15% | Travel-time buffer, double-booking guard, waitlist, surge pricing, loyalty discount, budget alternative, SMS receipt, calendar entry. |
| **Dispute & Reliability** | 15% | 4 dispute types (NO_SHOW, QUALITY_ISSUE, PRICE_MISMATCH, OVERRUN). Provider reputation updated. Risk score persisted. Future matching affected. |
| **Innovation & UX** | 10% | GPS auto-detect → nearest sector. Dark-themed map. Live agent trace tab. Workload optimization endpoint. Budget alternative quote. |

---

*Built for the Google AI Seekho Phase II Hackathon — AI Service Orchestrator Challenge.*
