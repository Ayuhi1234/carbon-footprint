# KarmaVerse — Carbon footprint design

Live, clickable design canvas: **https://claude.ai/artifact/GTM22StLFpyCDe7hGTYaRU**
(page "Review round 2 (built)" is the latest; press **Play** to click through).

Every screenshot below is taken from the real KarmaCredits app build (React Native web, 390 px wide) with sample data. The app code lives in `Ayuhi1234/Karmaverse` on branch `claude/intelligent-johnson-lkdtci`. The carbon backend isn't live yet, so users currently see empty states and "Coming soon!".

## Folders

| Path | What it is |
|---|---|
| `screens/round-2/` | Latest screens, after review feedback (chat assessment, discoverability, mailer) |
| `screens/v1/` | First built version (free-text questions), kept for comparison |
| `canvas/` | Source of the design canvas: one `.dc.html` per artboard plus `canvas.json` (layout, pages, notes). Images are referenced as canvas assets (`/_blob/…`), so these files render inside the canvas, not on GitHub. |
| `../docs/carbon-footprint-ux-spec.md` | Original UX specification |

---

## Round 2 — after review feedback (latest)

### 1 · Discoverability

| Home: bell in header, 5 tabs | Discover features card | Logged-out landing teaser |
|---|---|---|
| ![Home](screens/round-2/n01-dashboard.png) | ![Discover features](screens/round-2/n02-discover.png) | ![Landing mobile](screens/round-2/n11-landing-mobile.png) |

Landing teaser on desktop:

![Landing desktop](screens/round-2/n12-landing-desktop.png)

### 2 · Chat assessment — tap, type or speak

| Greeting | Q1 from profile | Tap + follow-ups | Type or speak |
|---|---|---|---|
| ![Start](screens/round-2/n03-chat-start.png) | ![Q1](screens/round-2/n04-q1-contextual.png) | ![Transport](screens/round-2/n05-transport.png) | ![Typed](screens/round-2/n06-typed.png) |

| Pick all that apply | All answered | Calculating | Result |
|---|---|---|---|
| ![Multi-select](screens/round-2/n07-multi.png) | ![All done](screens/round-2/n08-all-done.png) | ![Calculating](screens/round-2/n09-calculating.png) | ![Result](screens/round-2/n10-result.png) |

### 3 · Mailer and push notifications

Invite (users who have never calculated a footprint):

![Invite push and email](screens/round-2/n13-mail-invite.png)

Monthly check-in (latest result is 30+ days old):

![Check-in push and email](screens/round-2/n14-mail-checkin.png)

### Review feedback → what changed

- Bottom navigation on mobile web cut from 6 tabs to 5; Alerts moved to a bell on Home (native already had 4).
- Carbon footprint added to Discover features (native and web).
- Q1 is worded from the user's profile: work / college / everyday travel, plus city.
- No Back button: the ✕ closes, and "Change" undoes the last answer.
- Every question has tap options; typing and voice are optional.
- 25 questions across 7 topics (Shopping added), with follow-ups only when relevant.
- Logged-out users see a landing-page teaser; using the feature requires login, and they return to it afterwards.
- New invite and monthly check-in push + email; tapping a push now opens its screen.

**B2B:** not in the app today. A B2B version would need organisation accounts and roles, a site-level assessment (electricity, diesel generators, fleet, business travel, waste) mapped to Scope 1/2/3, an org dashboard with per-employee footprint, opt-in anonymous roll-up of members' results, team challenges, and a downloadable ESG / BRSR-ready report.

---

## v1 — first built version

### Entry and assessment

| Home | Your impact card | First visit | Intro |
|---|---|---|---|
| ![](screens/v1/01-dashboard.png) | ![](screens/v1/02-dashboard-impact.png) | ![](screens/v1/03-hub-new.png) | ![](screens/v1/04-intro.png) |

| Q1 Transport | Q2 Electricity | Q3 Diet | Q4 Waste |
|---|---|---|---|
| ![](screens/v1/05-q1.png) | ![](screens/v1/06-q2.png) | ![](screens/v1/07-q3.png) | ![](screens/v1/08-q4.png) |

| Q5 Water | Q6 Flights | Calculating | Result |
|---|---|---|---|
| ![](screens/v1/09-q5.png) | ![](screens/v1/10-q6.png) | ![](screens/v1/11-calculating.png) | ![](screens/v1/12-result.png) |

### My carbon footprint and sheets

| Returning user | Level | Log activity | Activity logged | Set goal |
|---|---|---|---|---|
| ![](screens/v1/13-hub.png) | ![](screens/v1/15-level.png) | ![](screens/v1/16-log.png) | ![](screens/v1/17-log-success.png) | ![](screens/v1/18-goal.png) |

Full page:

<img src="screens/v1/14-hub-full.png" width="390" alt="My carbon footprint full page">

### My carbon journey and states

| Journey | Journey empty | Coming soon | Leave assessment? |
|---|---|---|---|
| ![](screens/v1/19-journey.png) | ![](screens/v1/22-journey-empty.png) | ![](screens/v1/21-coming-soon.png) | ![](screens/v1/23-leave-confirm.png) |

<img src="screens/v1/20-journey-full.png" width="390" alt="My carbon journey full page">

Desktop web:

![Desktop](screens/v1/24-hub-desktop.png)
