// Push notification templates (FCM) for KarmaVerse — same functional shape as the
// email templates: one function per key → { title, body, data }.
//
// These are the NON-TRANSACTIONAL (engagement / marketing) pushes. Unlike the
// transactional pushes (booking accepted, coins credited, etc., which fire off a
// real event), the backend sends these on a schedule or to a targeted segment, so:
//   • send ONLY to users opted in to marketing notifications, and
//   • respect a frequency cap (e.g. max 1 non-transactional push/day).
//
// `data.route` is the in-app screen to open when the user taps the push — it maps
// to the app's navigation routes (Wallet / Quiz / Referral / SchedulePickup /
// OrderTracking / CarbonFootprint), the same targets the email CTAs deep-link to. `data.type` lets
// the client/analytics identify the campaign.
//
// Keys + their variable sets are a FIXED contract with the backend — don't rename.
// Every value falls back so a missing field never renders "undefined"/"null".

const CURRENCY = 'KarmaCoins XP';
const s = (v, f = '') => (v == null || String(v).trim() === '' ? f : String(v));
// Big numbers scan faster with a thousands separator (4055 -> 4,055); '' if none.
const fmt = (v) => { const n = Number(String(v).replace(/[^\d.]/g, '')); return Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US') : ''; };

const pushTemplates = {
  // Streak about to reset — the single most important retention nudge.
  STREAK_AT_RISK: ({ tier }) => ({
    title: 'Your streak is at risk!',
    body: `A pickup, quiz, or referral today keeps your ${s(tier, '')} streak — and your reward rate.`.replace('  ', ' '),
    data: { route: 'Wallet', type: 'STREAK_AT_RISK' },
  }),

  // Daily reminder to play the quiz. "Resets tonight" (not "5:30 AM" — that IST
  // time is midnight UTC leaking through, and it reads like there's all night left).
  DAILY_QUIZ_REMINDER: () => ({
    title: "Today's eco quiz is live",
    body: `3 quick questions, instant ${CURRENCY}. Resets tonight.`,
    data: { route: 'Quiz', type: 'DAILY_QUIZ_REMINDER' },
  }),

  // Re-activation: remind users sitting on a balance to redeem.
  REDEMPTION_READY: ({ balance }) => {
    const b = fmt(balance);
    return {
      title: 'Your coins are ready to cash out',
      body: b ? `${b} ${CURRENCY} waiting to become real rewards.` : `Redeem your ${CURRENCY} for real rewards.`,
      data: { route: 'Wallet', type: 'REDEMPTION_READY' },
    };
  },

  // Celebration when the user moves up a streak tier (better reward rate).
  TIER_UPGRADE: ({ tier }) => ({
    title: `You reached ${s(tier, 'a new')} tier!`,
    body: 'Each of your reward coins is now worth more. Keep the streak alive!',
    data: { route: 'Wallet', type: 'TIER_UPGRADE' },
  }),

  // Win-back for lapsed users (e.g. inactive 14+ days).
  WIN_BACK: ({ name }) => ({
    title: `We miss you${name && String(name).trim() ? ', ' + s(name) : ''}!`,
    body: `Your next pickup is one tap away — turn everyday materials into ${CURRENCY}.`,
    data: { route: 'SchedulePickup', type: 'WIN_BACK' },
  }),

  // Growth nudge for users who've never referred anyone. "each" (not "both") is
  // unambiguous that every party gets 1,000.
  REFERRAL_NUDGE: () => ({
    title: 'Invite a friend, both earn',
    body: `Share your code — you each get 1,000 ${CURRENCY}.`,
    data: { route: 'Referral', type: 'REFERRAL_NUDGE' },
  }),

  // Celebration when the user hits a streak milestone.
  STREAK_MILESTONE: ({ streak }) => ({
    title: `${s(streak, 'A new')}-day streak! 🔥`,
    body: `You're on a roll — each reward coin is worth more the longer your streak runs.`,
    data: { route: 'Wallet', type: 'STREAK_MILESTONE' },
  }),

  // Coins nearing expiry — only when an expiry policy is enabled.
  COINS_EXPIRING: ({ coins, date }) => {
    const c = fmt(coins);
    return {
      title: 'Coins expiring soon',
      body: c ? `${c} ${CURRENCY} expire on ${s(date, 'soon')}. Redeem before they're gone.` : `Some ${CURRENCY} are expiring soon — redeem before they're gone.`,
      data: { route: 'Wallet', type: 'COINS_EXPIRING' },
    };
  },

  // One-time celebration after the user's first completed pickup.
  FIRST_PICKUP_DONE: () => ({
    title: 'Your first pickup is done! 🎉',
    body: `You just turned everyday materials into ${CURRENCY}. Here's to many more.`,
    data: { route: 'Wallet', type: 'FIRST_PICKUP_DONE' },
  }),

  // Expansion announcement — a new service area went live near the user.
  SERVICE_AREA_LIVE: ({ area }) => ({
    title: `We're now in ${s(area, 'your area')}!`,
    body: `KarmaVerse pickups just launched near you — book your first free pickup.`,
    data: { route: 'SchedulePickup', type: 'SERVICE_AREA_LIVE' },
  }),

  // Activation: signed up but never booked a first pickup.
  FIRST_PICKUP_NUDGE: () => ({
    title: 'Ready for your first pickup?',
    body: `Book a free pickup and earn your first ${CURRENCY}.`,
    data: { route: 'SchedulePickup', type: 'FIRST_PICKUP_NUDGE' },
  }),

  // Monthly impact recap is ready (push companion to the IMPACT_REPORT email).
  IMPACT_REPORT: ({ month }) => ({
    title: `Your ${s(month, 'monthly')} impact is ready`,
    body: 'See what your pickups added up to this month.',
    data: { route: 'Wallet', type: 'IMPACT_REPORT' },
  }),

  // Carbon footprint discovery — to users who have never calculated it.
  CARBON_FOOTPRINT_INVITE: () => ({
    title: "What's your carbon footprint?",
    body: 'Find out in about 4 minutes — just tap your answers.',
    data: { route: 'CarbonFootprint', type: 'CARBON_FOOTPRINT_INVITE' },
  }),

  // Monthly carbon check-in — to users whose latest assessment is 30+ days old.
  CARBON_FOOTPRINT_CHECKIN: ({ lastKg }) => {
    const k = fmt(lastKg);
    return {
      title: 'Your monthly carbon check-in',
      body: k ? `Last time: ${k} kg CO₂e a month. See if you've cut it.` : "See how your footprint has changed this month.",
      data: { route: 'CarbonFootprint', type: 'CARBON_FOOTPRINT_CHECKIN' },
    };
  },

  // Cumulative lifetime impact milestone.
  IMPACT_MILESTONE: ({ kg }) => {
    const k = fmt(kg);
    return {
      title: k ? `${k} kg recovered — and counting! 🌱` : 'A new impact milestone! 🌱',
      body: 'Your pickups keep giving resources a second life. Thank you.',
      data: { route: 'Wallet', type: 'IMPACT_MILESTONE' },
    };
  },

  // Monthly sustainability newsletter nudge.
  NEWSLETTER: ({ month }) => ({
    title: `${s(month, 'This month')}'s sustainability stories`,
    body: 'Fresh reads from the Knowledge Hub. Tap to explore.',
    data: { route: 'KnowledgeHub', type: 'NEWSLETTER' },
  }),

  // Generic feature / product announcement.
  FEATURE_ANNOUNCEMENT: ({ title }) => ({
    title: s(title, 'Something new just landed'),
    body: 'Tap to see the latest update in the app.',
    data: { route: 'Dashboard', type: 'FEATURE_ANNOUNCEMENT' },
  }),

  // Limited-time promo / bonus-coins campaign.
  LIMITED_OFFER: ({ title, endDate }) => ({
    title: s(title, `Limited-time ${CURRENCY} boost`),
    body: endDate ? `Earn extra on every pickup. Ends ${s(endDate)}.` : 'Earn extra on every pickup for a limited time.',
    data: { route: 'SchedulePickup', type: 'LIMITED_OFFER' },
  }),

  // Seasonal / festival greeting.
  SEASONAL_GREETING: ({ occasion }) => ({
    title: s(occasion, 'Warm wishes from KarmaVerse'),
    body: 'Wishing you a bright, joyful and sustainable celebration.',
    data: { route: 'Dashboard', type: 'SEASONAL_GREETING' },
  }),

  // Birthday greeting, with or without a coin gift.
  BIRTHDAY: ({ name, bonus }) => {
    const b = fmt(bonus);
    return {
      title: `Happy birthday${name && String(name).trim() ? ', ' + s(name) : ''}! 🎉`,
      body: b ? `A gift of ${b} ${CURRENCY} is waiting in your wallet.` : 'Wishing you a wonderful day from all of us.',
      data: { route: b ? 'Wallet' : 'Dashboard', type: 'BIRTHDAY' },
    };
  },

  // Feedback / NPS survey request.
  FEEDBACK_SURVEY: () => ({
    title: 'Got 2 minutes?',
    body: `Tell us how we're doing — your feedback shapes ${CURRENCY}.`,
    data: { route: 'Profile', type: 'FEEDBACK_SURVEY' },
  }),
};

// ─────────────────────────────────────────────────────────────────────────
// TRANSACTIONAL pushes — fired by a real booking event (socket), so unlike the
// engagement pushes above they are ALWAYS sent: no consent gate, no frequency
// cap, no quiet hours. Titles/bodies mirror the in-app notifications the app
// already shows for these events. `data.bookingId` lets the app deep-link
// straight to that booking. Same `(data) => ({ title, body, data })` shape.
const txPushTemplates = {
  // Agent assigned to the pickup.
  BOOKING_ACCEPTED: ({ agentName, bookingId }) => ({
    title: 'Agent assigned',
    body: `${s(agentName, 'Your pickup partner')} accepted your booking and is on the way.`,
    data: { route: 'OrderTracking', type: 'BOOKING_ACCEPTED', bookingId: s(bookingId) },
  }),

  // Agent has reached the user's location.
  AGENT_REACHED: ({ bookingId }) => ({
    title: 'Agent arrived',
    body: 'Your pickup partner has reached your location.',
    data: { route: 'OrderTracking', type: 'AGENT_REACHED', bookingId: s(bookingId) },
  }),

  // Items verified + coins credited.
  BOOKING_PICKED_UP: ({ coins, bookingId }) => {
    const c = fmt(coins);
    return {
      title: c ? `+${c} ${CURRENCY}` : 'Coins credited',
      body: c ? `${c} ${CURRENCY} credited to your wallet.` : `Your ${CURRENCY} have been credited to your wallet.`,
      data: { route: 'Wallet', type: 'BOOKING_PICKED_UP', bookingId: s(bookingId) },
    };
  },

  // Pickup complete.
  BOOKING_COMPLETED: ({ bookingId }) => ({
    title: 'Pickup complete',
    body: 'Your pickup is complete — thank you for keeping resources in the loop.',
    data: { route: 'OrderTracking', type: 'BOOKING_COMPLETED', bookingId: s(bookingId) },
  }),

  // Booking cancelled.
  BOOKING_CANCEL_SUCCESS: ({ bookingId }) => ({
    title: 'Booking cancelled',
    body: "Your pickup was cancelled. Schedule a new one whenever you're ready.",
    data: { route: 'SchedulePickup', type: 'BOOKING_CANCEL_SUCCESS', bookingId: s(bookingId) },
  }),

  // High demand — booking placed in the priority pool.
  BOOKING_IN_POOL: ({ bookingId }) => ({
    title: 'Added to priority queue',
    body: 'High demand in your area — your booking is in our priority pool.',
    data: { route: 'OrderTracking', type: 'BOOKING_IN_POOL', bookingId: s(bookingId) },
  }),

  // Day-before reminder for a scheduled pickup.
  PICKUP_REMINDER: ({ timeSlot, bookingId }) => ({
    title: 'Pickup reminder',
    body: `Your pickup is scheduled for ${s(timeSlot, 'tomorrow')}. Keep your items segregated and ready.`,
    data: { route: 'OrderTracking', type: 'PICKUP_REMINDER', bookingId: s(bookingId) },
  }),

  // Ask the user to rate the pickup partner after completion.
  RATING_REQUEST: ({ agentName, bookingId }) => ({
    title: 'Rate your pickup',
    body: `How was ${s(agentName, 'your pickup partner')}? Tap to rate them.`,
    data: { route: 'OrderTracking', type: 'RATING_REQUEST', bookingId: s(bookingId) },
  }),

  // Cash payout completed.
  PAYOUT_SUCCESS: ({ amount }) => ({
    title: 'Payout sent ✅',
    body: amount ? `₹${s(amount)} has been sent to your account.` : 'Your payout has been sent to your account.',
    data: { route: 'Wallet', type: 'PAYOUT_SUCCESS' },
  }),

  // Cash payout failed.
  PAYOUT_FAILED: ({ amount }) => ({
    title: "Payout didn't go through",
    body: amount ? `We couldn't process your ₹${s(amount)} payout. Your coins are safe — tap for help.` : "We couldn't process your payout. Your coins are safe — tap for help.",
    data: { route: 'Wallet', type: 'PAYOUT_FAILED' },
  }),

  // Redemption confirmed.
  REDEMPTION_CONFIRMED: ({ coins }) => {
    const c = fmt(coins);
    return {
      title: 'Redemption confirmed',
      body: c ? `You redeemed ${c} ${CURRENCY}. The details are in your wallet.` : 'Your redemption is confirmed. The details are in your wallet.',
      data: { route: 'Wallet', type: 'REDEMPTION_CONFIRMED' },
    };
  },

  // Security — a new sign-in was detected.
  LOGIN_ALERT: ({ device }) => ({
    title: 'New sign-in to your account',
    body: `A new sign-in was detected${device ? ` on ${s(device)}` : ''}. If this wasn't you, secure your account.`,
    data: { route: 'Profile', type: 'LOGIN_ALERT' },
  }),
};

// ─────────────────────────────────────────────────────────────────────────
// AGENT persona pushes — sent to the pickup partner. The transactional ones
// mirror the in-app socket alerts the agent app already shows (NEW_BOOKING_
// AVAILABLE, BOOKING_TAKEN, BOOKING_CANCELLED, NEW_RATING_RECEIVED); the last
// three are scheduled/engagement nudges. `data.route` maps to agent-app screens.
const agentPushTemplates = {
  NEW_PICKUP_AVAILABLE: ({ distance, category, bookingId }) => ({
    title: 'New pickup nearby',
    body: `${s(distance, 'Nearby')}${category ? ` · ${s(category)}` : ''}. Accept before another partner does.`,
    data: { route: 'JobFlow', type: 'NEW_PICKUP_AVAILABLE', bookingId: s(bookingId) },
  }),

  JOB_ACCEPTED: ({ area, bookingId }) => ({
    title: 'Pickup accepted',
    body: `You're assigned to ${s(area, 'a pickup')}. Navigate when you're ready.`,
    data: { route: 'JobFlow', type: 'JOB_ACCEPTED', bookingId: s(bookingId) },
  }),

  BOOKING_TAKEN: ({ bookingId }) => ({
    title: 'Job taken',
    body: 'Another partner accepted this pickup. More are on the way.',
    data: { route: 'Dashboard', type: 'BOOKING_TAKEN', bookingId: s(bookingId) },
  }),

  BOOKING_CANCELLED: ({ bookingId }) => ({
    title: 'Pickup cancelled',
    body: 'The customer cancelled this pickup.',
    data: { route: 'Dashboard', type: 'BOOKING_CANCELLED', bookingId: s(bookingId) },
  }),

  NEW_RATING_RECEIVED: ({ rating }) => ({
    title: `You got a ${s(rating, 'new')}★ rating`,
    body: 'A customer just rated your pickup. Keep it up!',
    data: { route: 'Profile', type: 'NEW_RATING_RECEIVED' },
  }),

  GO_ONLINE_NUDGE: () => ({
    title: 'Go online to get pickups',
    body: 'Pickups are waiting near you — flip online to start.',
    data: { route: 'Dashboard', type: 'GO_ONLINE_NUDGE' },
  }),

  DAILY_SUMMARY: ({ count }) => ({
    title: "Today's summary",
    body: `${s(count, '0')} pickups completed today. Nice work!`,
    data: { route: 'MyJobs', type: 'DAILY_SUMMARY' },
  }),

  PICKUP_MILESTONE: ({ count }) => ({
    title: `${s(count, 'More')} pickups done! 🎉`,
    body: `You've completed ${s(count, 'many')} pickups with KarmaVerse.`,
    data: { route: 'Profile', type: 'PICKUP_MILESTONE' },
  }),
};

module.exports = { pushTemplates, txPushTemplates, agentPushTemplates };
