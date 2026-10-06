# Carbon Footprint Feature – Development Timeline

**Estimated timeline:** 10 working days
**Frontend:** Ayushi · **Backend:** Akash
**Target:** implement, integrate, test, and prepare the Carbon Footprint feature for release.

## Scope

The Carbon Footprint feature lets users see the environmental impact generated or saved through their sustainable activities. It includes activity-wise calculation, total CO₂ impact, category breakdown, and historical data.

## Development plan

| Day | Frontend – Ayushi | Backend – Akash |
|---|---|---|
| 1 | UI flow & screen structure | Calculation logic & DB design |
| 2–3 | Activity/input screens | Carbon-factor mapping & calculation APIs |
| 4–5 | Result & CO₂ impact screens | User footprint APIs & data storage |
| 6 | History & category breakdown | History & aggregation APIs |
| 7 | Charts & visualization | API validation & optimization |
| 8 | API integration | Backend testing & fixes |
| 9 | End-to-end testing | Bug fixing & edge cases |
| 10 | Final QA & release build | Production deployment & support |

## Estimated effort

| Track | Effort |
|---|---|
| Frontend – Ayushi | 5–7 working days |
| Backend – Akash | 6–8 working days |
| Integration & QA | 2–3 working days |
| **Overall delivery** | **10 working days** through parallel development |

## Key deliverables

- Carbon Footprint calculation engine
- Activity/category-wise CO₂ calculation
- Carbon Footprint APIs
- User-wise footprint storage
- Total and category-wise impact
- Footprint history
- Mobile UI and visualization
- Frontend–backend integration
- QA and bug fixing
- Production-ready release

## Dependency

The carbon calculation methodology and emission factors must be finalized before development. If they are not, an additional **2–3 working days** may be needed for validation and implementation.

**Target:** feature ready for QA and release by the end of Day 10, subject to timely completion of requirements, calculation factors, API dependencies, and testing.

---

## Current status (6 Oct 2026)

### Frontend – Ayushi

| Day | Item | Status | Where |
|---|---|---|---|
| 1 | UI flow & screen structure | ✅ Done | `docs/carbon-footprint-ux-spec.md`, design canvas |
| 2–3 | Activity/input screens | ✅ Built | Chat assessment (`CarbonAssessmentScreen`), Log activity sheet |
| 4–5 | Result & CO₂ impact screens | ✅ Built | Result card, My carbon footprint (`CarbonFootprintScreen`) |
| 6 | History & category breakdown | ✅ Built | My carbon journey (`CarbonJourneyScreen`), "Where it comes from" |
| 7 | Charts & visualization | ✅ Built | Carbon insights dashboard (`CarbonInsightsScreen`) |
| 8 | API integration | ⏳ Waiting on backend | Service ready in `src/services/carbon.ts`, switched off until the APIs exist |
| 9 | End-to-end testing | ⬜ Not started | Web tested with mock data only; iOS/Android pending |
| 10 | Final QA & release build | ⬜ Not started | — |

### Backend – Akash

| Day | Item | Status | Notes |
|---|---|---|---|
| 1 | Calculation logic & DB design | ⬜ Not started | Needs the methodology + factors (dependency) |
| 2–3 | Carbon-factor mapping & calculation APIs | ⬜ Not started | A factor is needed for every option id in `src/utils/carbonQuestions.ts` (question set `2026-10`) |
| 4–5 | User footprint APIs & data storage | ⬜ Not started | Proposed contract in `src/services/carbon.ts` |
| 6 | History & aggregation APIs | ⬜ Not started | Insights dashboard reads the assessment history + summary |
| 7 | API validation & optimization | ⬜ Not started | — |
| 8 | Backend testing & fixes | ⬜ Not started | — |
| 9 | Bug fixing & edge cases | ⬜ Not started | — |
| 10 | Production deployment & support | ⬜ Not started | Also: trigger the `CARBON_FOOTPRINT_INVITE` / `CHECKIN` push + email |

### API contract the frontend expects (proposed)

| Method | Endpoint | Used by |
|---|---|---|
| `POST` | `/api/v1/carbon/assessments` — body `{ questionSetVersion, answers }` | Chat assessment → result |
| `GET` | `/api/v1/carbon/assessments` — newest first | Hub, journey, insights charts |
| `GET` | `/api/v1/carbon/summary` — CO₂ saved, optional level and goal | Hub hero, insights KPIs |
| `GET` / `POST` | `/api/v1/carbon/activities` | Recent activity, Log activity |
| `POST` | `/api/v1/carbon/goal` — `{ reductionPercent }` | Set goal, goal line on the chart |

Each assessment result should include `_id`, `createdAt`, `totalKgPerMonth`, `categories: [{ key, kgCo2e }]` and `factorVersion`. Results are stored as new records and never overwritten.

### Open items

1. **Finalize methodology and emission factors** (blocks backend Days 1–3).
2. Product sign-off on the question list (25 questions, 7 topics, incl. Shopping).
3. Get the frontend code into Karmaverse: it's on the `karmaverse-handoff` branch and in `code/` (see `code/README.md`).
4. iOS and Android testing.
