import { Bus, Zap, Utensils, Recycle, Droplets, Plane, Leaf } from 'lucide-react-native';
import { Platform } from 'react-native';
import { showAlert } from './alert';
import { CarbonApiNotReadyError, CarbonCategoryKey, CarbonResult, CARBON_CATEGORY_ORDER } from '../services/carbon';

type Icon = typeof Leaf;

// Display config for the assessment categories — icon colours reuse the tile
// palette already used on Wallet and Profile. No carbon values or formulas live
// in the app; the questions themselves are in carbonQuestions.ts.
export const CARBON_CATEGORIES: Record<CarbonCategoryKey, {
  label: string; Icon: Icon; color: string; bg: string; tip: { title: string; body: string };
}> = {
  transport: {
    label: 'Transport', Icon: Bus, color: '#0ea5e9', bg: '#f0f9ff',
    tip: { title: 'Transport is your biggest source', body: 'Try the metro or bus twice this week.' },
  },
  electricity: {
    label: 'Home energy', Icon: Zap, color: '#d97706', bg: '#fffbeb',
    tip: { title: 'Home energy is your biggest source', body: 'Set the AC to 24 °C or higher and switch appliances off at the plug.' },
  },
  diet: {
    label: 'Diet', Icon: Utensils, color: '#e11d48', bg: '#fff1f2',
    tip: { title: 'Diet is your biggest source', body: 'Add one more plant-based day to your week.' },
  },
  waste: {
    label: 'Waste', Icon: Recycle, color: '#16a34a', bg: '#f0fdf4',
    tip: { title: 'Waste is your biggest source', body: 'Schedule a KarmaVer$e pickup for your recyclables.' },
  },
  water: {
    label: 'Water', Icon: Droplets, color: '#0284c7', bg: '#f0f9ff',
    tip: { title: 'Water is your biggest source', body: 'Switch to a bucket bath and run full washing-machine loads.' },
  },
  flights: {
    label: 'Flights', Icon: Plane, color: '#7c3aed', bg: '#f3e8ff',
    tip: { title: 'Flights are your biggest source', body: 'Take the train for shorter trips when you can.' },
  },
};

// The backend's footprint band for a result ("low" | "medium" | "high").
export const BAND_LABELS: Record<string, { label: string; color: string; lightText: string }> = {
  low: { label: 'Low footprint', color: '#16a34a', lightText: '#15803d' },
  medium: { label: 'Medium footprint', color: '#d97706', lightText: '#b45309' },
  high: { label: 'High footprint', color: '#e11d48', lightText: '#e11d48' },
};

// What each band means, in plain words. `top` is the biggest source's label (e.g. "home energy").
export function bandMeaning(category: string | undefined, top?: string): string | null {
  const start = top ? `${top.charAt(0).toUpperCase()}${top.slice(1)} is the best place to start.` : 'Your biggest source is the best place to start.';
  if (category === 'low') return 'Well done! Keep your habits going.';
  if (category === 'medium') return `There's room to cut. ${start}`;
  if (category === 'high') return `There's a lot you can cut. ${start}`;
  return null;
}

export const CO2E_EXPLAINED = 'CO₂e is a standard unit for the total warming effect of all greenhouse gases, counted as the amount of CO₂ that would warm the Earth the same.';

// The same petrol-car factor the backend uses (emission factors 2026-09: car_petrol_km = 0.227 kg CO₂e
// per km). Only used to explain a total in everyday terms ("like driving 73 km a day").
export const PETROL_CAR_KG_PER_KM = 0.227;
export const KM_PER_MILE = 1.609;

// A category's share of the total, as shown to people: "36%", or "under 1%" when it's
// small but not zero (so 1.2 kg of water doesn't read as "0% of your footprint").
export function formatShare(kg: number, total: number): string {
  if (!(total > 0) || !(kg > 0)) return '0%';
  const pct = Math.round((kg / total) * 100);
  return pct < 1 ? 'under 1%' : `${pct}%`;
}

// The biggest sources of a result with their share, largest first (at most `n`).
export function topSources(breakdown: Partial<Record<CarbonCategoryKey, number>> | undefined, total: number, n = 3) {
  if (!breakdown || !(total > 0)) return [];
  return (Object.keys(breakdown) as CarbonCategoryKey[])
    .map((key) => ({ key, kg: breakdown[key] ?? 0 }))
    .filter((s) => s.kg > 0 && CARBON_CATEGORIES[s.key])
    .sort((a, b) => b.kg - a.kg)
    .slice(0, n)
    .map((s) => ({ ...s, label: CARBON_CATEGORIES[s.key].label, pct: Math.round((s.kg / total) * 100) }));
}

export const formatKg = (kg: number) => kg.toLocaleString(undefined, { maximumFractionDigits: 1 });

export const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

// "Calculated on" label: the backend's IST assessedAt when present, else createdAt.
export function formatAssessed(r?: { assessedAt?: { date: string; time: string }; createdAt?: string }) {
  if (r?.assessedAt?.date) return `${r.assessedAt.date}, ${r.assessedAt.time}`;
  return formatDate(r?.createdAt);
}

// "2026-10" → "Oct 2026" (or "Oct" when short).
export function formatPeriod(period?: string, short = false) {
  const [y, m] = (period || '').split('-').map(Number);
  if (!y || !m) return '';
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', short ? { month: 'short' } : { month: 'short', year: 'numeric' });
}

// Chart label for one result, from its createdAt, as two lines: ["17 Nov", "2026"].
// Every result gets its own date, so two results in the same month no longer both say "Nov".
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function chartDateLines(r: { createdAt?: string }): [string, string] {
  const d = r.createdAt ? new Date(r.createdAt) : null;
  if (!d || isNaN(d.getTime())) return ['', ''];
  return [`${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`, String(d.getFullYear())];
}

// Same "Coming soon!" wording Profile uses for features that aren't live yet.
export function showCarbonError(title: string, error: any) {
  if (error instanceof CarbonApiNotReadyError) {
    showAlert('Coming soon!', "We're finishing carbon tracking — check back soon.");
    return;
  }
  showAlert(title, error?.response?.data?.message || 'Please try again.');
}

// Emoji for the biggest source in share messages.
const SHARE_EMOJI: Record<CarbonCategoryKey, string> = { transport: '🚗', electricity: '⚡', diet: '🍽️', waste: '♻️', water: '💧', flights: '✈️' };

export type CarbonShare = { text: string; whatsapp: string; x: string; emailSubject: string; emailBody: string; url: string };

// The share messages for a result, one per channel, plus the link. The link opens the carbon
// footprint screen (logged-out visitors log in first and land there).
// reducedKg = how much lower this result is than the one before it (mentioned only when it went down).
// past = an older result shared from My carbon journey, so the wording uses "was" and its month.
export function buildCarbonShare(r: CarbonResult, reducedKg?: number | null, past = false): CarbonShare {
  const top = CARBON_CATEGORY_ORDER.reduce<CarbonCategoryKey | null>(
    (best, k) => ((r.breakdown?.[k] ?? 0) > (best ? r.breakdown?.[best] ?? 0 : 0) ? k : best), null,
  );
  const origin = Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://karmaverse.earth';
  const url = `${origin}/CarbonFootprint`;
  const kg = formatKg(r.totalKgCO2ePerMonth);
  const red = reducedKg && reducedKg >= 0.1 ? formatKg(reducedKg) : null;
  const band = r.category ? BAND_LABELS[r.category] : undefined;
  const bandText = band ? band.label.toLowerCase() : null; // e.g. "low footprint"
  const when = formatPeriod(r.periodLabel) || formatDate(r.createdAt); // e.g. "Oct 2026"
  const source = top ? CARBON_CATEGORIES[top].label.toLowerCase() : null;
  const sourceEmoji = top ? SHARE_EMOJI[top] : '';

  // WhatsApp and the general text (Copy, More): a short, friendly card. WhatsApp shows *text* in bold.
  const card = (b: string) => [
    past ? '🌍 A look back at my carbon footprint on KarmaVer$e!' : '🌍 Just checked my carbon footprint on KarmaVer$e!',
    '',
    `${past ? `In ${when}` : 'My number'}: ${b}${kg} kg CO₂e a month${b}${bandText ? `, a ${bandText}${r.category === 'low' ? ' 💚' : ''}` : ''}`,
    ...(red ? [past ? `🎉 That was ${red} kg less than the check before!` : `🎉 That's ${red} kg less than my last check!`] : []),
    ...(source ? [`My biggest source${past ? ' then' : ''}: ${source} ${sourceEmoji}`] : []),
    '',
    'Think you can go lower? Take the 2-minute check 👇',
  ].join('\n');

  // X: one line, well under 280 characters even for the longest numbers (the link counts as 23).
  const x = `My carbon footprint${past ? ` in ${when}` : ''}: ${kg} kg CO₂e/month 🌍`
    + (red ? ` (${red} kg less than ${past ? 'the check before' : 'last time'} 🌱)` : '')
    + '.'
    + (source ? ` Biggest source: ${source}.` : '')
    + " What's yours? Find out in 2 min on KarmaVer$e #CarbonFootprint #ClimateAction #ZeroWaste";

  // Email: a subject line and a short letter that ends with the link.
  const details = `${kg} kg CO₂e a month`
    + (bandText ? `, a ${bandText}` : '')
    + (red ? `, and ${red} kg less than ${past ? 'the check before' : 'my last check'} 🎉` : '')
    + '.';
  const emailSubject = past
    ? `🌍 My carbon footprint was ${kg} kg a month in ${when}. What's yours?`
    : `🌍 My carbon footprint is ${kg} kg a month. What's yours?`;
  const emailBody = [
    'Hi!',
    '',
    (past
      ? `I've been tracking my carbon footprint with KarmaVer$e's 2-minute check. In ${when} it was ${details}`
      : `I just took KarmaVer$e's 2-minute carbon check. My footprint is ${details}`)
      + (source ? ` My biggest source ${past ? 'was' : 'is'} ${source}.` : ''),
    '',
    'It shows exactly where your footprint comes from and how to cut it. Think you can go lower? Try it here:',
    url,
  ].join('\n');

  return { text: card(''), whatsapp: card('*'), x, emailSubject, emailBody, url };
}
