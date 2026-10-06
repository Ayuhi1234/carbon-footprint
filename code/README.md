# Carbon footprint — app code

The code behind the [design](../design/README.md), for the **KarmaVerse / KarmaCredits** React Native app (`Ayuhi1234/Karmaverse`, Expo 54, RN 0.81, web via react-native-web).

The files here mirror their paths in the Karmaverse repo. They are up to date with Karmaverse `main` at `dd03ed7`, including its dark mode and shared notification router.

## Apply it to Karmaverse

From a Karmaverse checkout on `main`:

```bash
git checkout -b carbon-footprint
git apply /path/to/carbon-footprint/code/karmaverse-carbon-footprint.patch
git add -A && git commit -m "Add Carbon footprint feature"
git push -u origin carbon-footprint
```

`karmaverse-carbon-footprint.patch` was checked against `main` (`dd03ed7`): it applies cleanly, and the result is identical to the files in this folder.

## What's where

| File | Purpose |
|---|---|
| `src/screens/CarbonFootprintScreen.tsx` | **My carbon footprint**: CO₂ saved, latest footprint, tip, Log activity / Set goal / Insights, "Where it comes from", recent activity, level / log / goal sheets |
| `src/screens/CarbonAssessmentScreen.tsx` | **Chat assessment**: tap an option, or type / speak; Q1 worded from the profile; calculating and result |
| `src/screens/CarbonJourneyScreen.tsx` | **My carbon journey**: current vs previous, trend bars, read-only history |
| `src/screens/CarbonInsightsScreen.tsx` | **Carbon insights** dashboard: range filter, KPI tiles, footprint-over-time line chart with goal line + table view, category bars, per-category small multiples |
| `src/utils/carbonQuestions.ts` | Question bank: 25 questions, 7 topics, follow-up rules, `QUESTION_SET_VERSION` |
| `src/utils/carbon.ts` | Category icons, colours and tips; log options; formatting; "Coming soon!" helper |
| `src/services/carbon.ts` | API service (proposed endpoints, switched off by default — see below) |
| `src/navigation/RootNavigator.tsx` | Registers `CarbonFootprint`, `CarbonAssessment`, `CarbonJourney`, `CarbonInsights` (+ web URLs) |
| `src/utils/notificationRoute.ts` | Push taps open the carbon screens; also honours `data.route` |
| `src/utils/deepLink.ts` | Carbon routes return logged-out users there after login |
| `src/screens/DashboardScreen.tsx`, `DashboardScreen.web.tsx` | "Your impact" card + Discover features card; web: Alerts bell on Home |
| `src/navigation/TabNavigator.web.tsx` | Mobile-web bottom bar cut to 5 tabs |
| `src/screens/SplashScreen.web.tsx` | Logged-out landing-page teaser |
| `backend-email-service/templates/*.js` | `CARBON_FOOTPRINT_INVITE` and `CARBON_FOOTPRINT_CHECKIN` email + push templates |

All screens use `StyleSheet` via the app's `makeStyles` + theme tokens, so they follow light and dark mode.

## Backend needed — feature is off by default

The carbon API doesn't exist yet. Until it does, the screens show empty states and "Coming soon!"; nothing is faked, and the app never calculates CO₂ itself. Proposed endpoints (marked TODO in `src/services/carbon.ts`):

- `GET/POST /api/v1/carbon/assessments` — POST `{ questionSetVersion, answers }`, answers keyed by question id: `{ optionIds?: string[], text?: string }`
- `GET /api/v1/carbon/summary`
- `GET/POST /api/v1/carbon/activities`
- `POST /api/v1/carbon/goal`

Turn it on with `EXPO_PUBLIC_CARBON_API=true` and restart Metro with a cleared cache (`npx expo start -c`).

## Still to do

- Backend endpoints, and a conversion factor for every option id in `carbonQuestions.ts` (product sign-off on the question list first).
- Backend sends the new push + email templates (marketing opt-in, frequency cap).
- Test on iOS and Android (verified on web only).
- Optional: save answers as you go, in-app voice on native (`expo-speech-recognition`), carbon levels and rewards.
