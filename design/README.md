# KarmaVerse — Carbon footprint design

Live, clickable design canvas: **https://claude.ai/artifact/GTM22StLFpyCDe7hGTYaRU**
(page "Review round 2 (built)" is the latest; press **Play** to click through).

Every screenshot below is taken from the real KarmaCredits app build (React Native web, 390 px wide) with sample data. The app code lives in `Ayuhi1234/Karmaverse` on branch `claude/intelligent-johnson-lkdtci`. The carbon backend isn't live yet, so users currently see empty states and "Coming soon!".

## Folders

| Path | What it is |
|---|---|
| `screens/insights/` | Carbon insights dashboard (charts & visualization), light and dark |
| `screens/round-2/` | Screens after review feedback (chat assessment, discoverability, mailer) |
| `screens/v1/` | First built version (free-text questions), kept for comparison |
| `canvas/` | Source of the design canvas: one `.dc.html` per artboard plus `canvas.json` (layout, pages, notes). Images are referenced as canvas assets (`/_blob/…`), so these files render inside the canvas, not on GitHub. |
| `../docs/carbon-footprint-ux-spec.md` | Original UX specification |

---

## All screens — Manoj's review + charts, connected (latest)

29 screens, all the same phone size (**390 × 844**, exported at 2×). On the design canvas they're on the first page, **"All screens — Manoj's review + charts (connected)"**. Press Play and tap any screen to go to the next one.

| Manoj's point | Where it's answered |
|---|---|
| Q1 asked from user details | 06 — "How do you usually get to work in Gurugram?" (profile work/college + city) |
| Show it to logged-out users? | Yes — teaser on the landing page (01) |
| Use it logged out? | No — tapping asks them to log in first (02); after login they land back on Carbon footprint |
| Back button on Q1? | Removed — ✕ closes, "Change" undoes the last answer |
| Options instead of text | Every question has tap options (07, 09); type or speak is optional (08) |
| Make it discoverable | Home bell + 5 tabs (03), Discover features card (04), Home "Your impact" card (13), push + email (26–29) |
| Questions not sufficient | 25 questions in 7 topics: Transport 5, Home energy 5, Diet 4, Waste 3, Water 3, Flights 2, Shopping 3 |
| Mailer + notification | Invite and monthly check-in, push + email (26–29) |
| B2B | Not in the app today; proposed design is in the B2B note on the canvas |

### 1 · Discoverable — logged out → log in → Home → Discover

| 01 Logged-out teaser | 02 Log in first | 03 Home — bell, 5 tabs | 04 Discover features |
|---|---|---|---|
| ![01 Logged-out teaser](screens/all-connected/01-landing-logged-out.png) | ![02 Log in first](screens/all-connected/02-login.png) | ![03 Home — bell, 5 tabs](screens/all-connected/03-home.png) | ![04 Discover features](screens/all-connected/04-discover.png) |

### 2 · Chat assessment — tap, type or speak

| 05 Greeting | 06 Q1 from profile | 07 Tap options | 08 Type or speak |
|---|---|---|---|
| ![05 Greeting](screens/all-connected/05-chat-start.png) | ![06 Q1 from profile](screens/all-connected/06-q1-from-profile.png) | ![07 Tap options](screens/all-connected/07-tap-options.png) | ![08 Type or speak](screens/all-connected/08-type-or-speak.png) |

| 09 Pick all that apply | 10 All answered | 11 Calculating | 12 Result |
|---|---|---|---|
| ![09 Pick all that apply](screens/all-connected/09-multi-select.png) | ![10 All answered](screens/all-connected/10-all-done.png) | ![11 Calculating](screens/all-connected/11-calculating.png) | ![12 Result](screens/all-connected/12-result.png) |

### 3 · My carbon footprint → Charts & visualization

| 13 Home — Your impact | 14 Hub — tap Insights | 15 Journey — See all insights | 16 Carbon insights |
|---|---|---|---|
| ![13 Home — Your impact](screens/all-connected/13-home-your-impact.png) | ![14 Hub — tap Insights](screens/all-connected/14-hub-insights.png) | ![15 Journey — See all insights](screens/all-connected/15-journey.png) | ![16 Carbon insights](screens/all-connected/16-insights-top.png) |

| 17 Range: 3 months | 18 Footprint over time | 19 Tap a point | 20 View as table |
|---|---|---|---|
| ![17 Range: 3 months](screens/all-connected/17-range-3-months.png) | ![18 Footprint over time](screens/all-connected/18-chart.png) | ![19 Tap a point](screens/all-connected/19-tap-point.png) | ![20 View as table](screens/all-connected/20-table.png) |

| 21 Where it comes from | 22 Each area | 23 Dark — top | 24 Dark — charts |
|---|---|---|---|
| ![21 Where it comes from](screens/all-connected/21-sources.png) | ![22 Each area](screens/all-connected/22-areas.png) | ![23 Dark — top](screens/all-connected/23-dark-top.png) | ![24 Dark — charts](screens/all-connected/24-dark-chart.png) |

| 25 Empty state |
|---|
| ![25 Empty state](screens/all-connected/25-empty.png) |

### 4 · Mailer & push notifications

| 26 Push — invite | 27 Email — invite | 28 Push — check-in | 29 Email — check-in |
|---|---|---|---|
| ![26 Push — invite](screens/all-connected/26-push-invite.png) | ![27 Email — invite](screens/all-connected/27-email-invite.png) | ![28 Push — check-in](screens/all-connected/28-push-checkin.png) | ![29 Email — check-in](screens/all-connected/29-email-checkin.png) |

---

## Charts & visualization — Carbon insights dashboard (latest)

Every screen below is the same phone size: **390 × 844** (exported at 2×, 780 × 1688). Development plan and status: [`../docs/development-plan.md`](../docs/development-plan.md).

### Where it lives in the app

**Home → "Your impact" card → My carbon footprint → Insights button → Carbon insights.**
It can also be opened from My carbon journey ("See all insights →"). It is a stack screen (`CarbonInsights` in `RootNavigator`), not a new bottom tab, so the tab bar stays at 5.

| 1 · Home — tap "Your impact" | 2 · My carbon footprint — tap Insights | Or: My carbon journey — "See all insights" |
|---|---|---|
| ![Home](screens/insights/01-home.png) | ![Hub](screens/insights/02-hub.png) | ![Journey](screens/insights/03-journey.png) |

### Carbon insights — screen by screen

| Top: hero, range filter, tiles | Footprint over time | Tap a point for its value | View as table |
|---|---|---|---|
| ![Top](screens/insights/04-top.png) | ![Chart](screens/insights/05-chart.png) | ![Tap](screens/insights/06-tap.png) | ![Table](screens/insights/07-table.png) |

| Where it comes from | How each area is changing | Dark mode — top | Dark mode — charts |
|---|---|---|---|
| ![Sources](screens/insights/08-sources.png) | ![Areas](screens/insights/09-areas.png) | ![Dark top](screens/insights/10-dark-top.png) | ![Dark charts](screens/insights/11-dark-chart.png) |

| Empty state (no results yet) |
|---|
| ![Empty](screens/insights/12-empty.png) |

- **Hero:** current footprint vs last time.
- **One range filter** (3 months / 6 months / 1 year / All) above everything; tiles and charts update together.
- **Tiles:** average per month, lowest month, CO₂ saved.
- **Footprint over time:** line chart with the goal line; tap or tab to a point for its exact value; "View as table" shows the same numbers.
- **Where it comes from:** latest result, biggest source highlighted.
- **How each area is changing:** a small trend per category with ↓ / ↑ vs last time.
- One green hue (no colour legend to learn); light and dark mode.

---

## Round 2 — after review feedback

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
