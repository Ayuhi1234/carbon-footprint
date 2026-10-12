# Carbon footprint — app code

The code behind the [design](../design/README.md), for the **KarmaVerse / KarmaCredits** React Native app (`Ayuhi1234/Karmaverse`, Expo 54, RN 0.81, web via react-native-web).

The files here mirror their paths in the Karmaverse repo, branch `claude/intelligent-johnson-lkdtci`. They are up to date with Karmaverse `main` at `b9e4695`, including its dark mode, shared notification router and lazy-loaded screens.

## Apply it to Karmaverse

The branch is already on GitHub: open a pull request from `claude/intelligent-johnson-lkdtci` into `main`. To apply the patch by hand instead, from a Karmaverse checkout on `main`:

```bash
git checkout -b carbon-footprint
git apply /path/to/carbon-footprint/code/karmaverse-carbon-footprint.patch
git add -A && git commit -m "Add Carbon footprint feature"
git push -u origin carbon-footprint
```

`karmaverse-carbon-footprint.patch` was checked against `main` (`b9e4695`): it applies cleanly, and the result is identical to the files in this folder.

## What's where

| File | Purpose |
|---|---|
| `src/screens/CarbonFootprintScreen.tsx` | **My carbon footprint**: latest footprint and band, change since last time, average and best, tip, "carry on" banner for an unfinished interview, Log activity / Set goal (Coming soon) / Insights, "Where it comes from" |
| `src/screens/CarbonAssessmentScreen.tsx` | **Chat assessment** on the server session: Carry on / Start over, six topics in the backend's order, each sent when complete; tap an option or type a number (spoken on web); result card |
| `src/screens/CarbonJourneyScreen.tsx` | **My carbon journey**: current vs previous, trend bars, read-only history |
| `src/screens/CarbonInsightsScreen.tsx` | **Carbon insights** dashboard: range filter, KPI tiles, footprint-over-time line chart + table view, category bars, per-category small multiples |
| `src/utils/carbonQuestions.ts` | What the chat asks per topic, one prompt per backend answer field; tap options with representative values; number parsing |
| `src/utils/carbon.ts` | Category icons, colours and tips; footprint band labels; formatting; "Coming soon!" helper |
| `src/services/carbon.ts` | API service for `/api/v1/carbon-footprint` (switched off by default — see below) |
| `src/navigation/RootNavigator.tsx` | Registers `CarbonFootprint`, `CarbonAssessment`, `CarbonJourney`, `CarbonInsights` as lazy-loaded screens (+ web URLs) |
| `src/utils/notificationRoute.ts` | Push taps open the carbon screens; honours `data.route` |
| `src/utils/deepLink.ts` | Carbon routes return logged-out users there after login, whatever the URL's case |
| `src/screens/DashboardScreen.tsx`, `DashboardScreen.web.tsx` | "Your impact" card + Discover features card; web: Alerts bell on Home |
| `src/navigation/TabNavigator.web.tsx` | Mobile-web bottom bar cut to 5 tabs |
| `src/screens/SplashScreen.web.tsx` | Logged-out landing-page teaser |
| `backend-email-service/templates/*.js` | `CARBON_FOOTPRINT_INVITE` and `CARBON_FOOTPRINT_CHECKIN` email + push templates |

All screens use `StyleSheet` via the app's `makeStyles` + theme tokens, so they follow light and dark mode.

## Backend — feature is off by default

The app follows the backend contract in "Carbon Footprint — API Integration Guide (Frontend)", base path `/api/v1/carbon-footprint`. Every call sends the user's JWT. The app never calculates CO₂ itself.

| Method | Path | Used for |
|---|---|---|
| POST | `/session/start` | Start a new interview, or resume the open one |
| POST | `/session/answer` | `{ category, answer }` for the topic the backend expects; the sixth returns the result |
| GET | `/session` | Offer "Carry on" for an unfinished interview |
| DELETE | `/session` | "Start over" |
| GET | `/result/latest` | Hub: latest result and change since the previous one |
| GET | `/result/history` | Journey and Insights (first 50, newest first) |
| GET | `/result/summary` | Hub and Insights: count, average, best |

The routes are not deployed to `api.karmaverse.earth` yet. Until they are, the screens show empty states and "Coming soon!". Turn the feature on with `EXPO_PUBLIC_CARBON_API=true` and restart Metro with a cleared cache (`npx expo start -c`).

## Still to do

- Backend: deploy the carbon-footprint routes.
- Backend: endpoints for logging green actions and monthly goals (the hub shows "Coming soon!"; Insights will draw a goal line once a goal exists).
- Confirm with the backend team: is water per person or per household, and is transport distance the daily round trip?
- Backend sends the new push + email templates (marketing opt-in, frequency cap).
- Test on iOS and Android (verified on web only).
- Optional: in-app voice on native (`expo-speech-recognition`).
