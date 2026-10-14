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
    tip: { title: 'Transport is your biggest source', body: 'Try the metro or bus twice this week, then log it here.' },
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
    tip: { title: 'Waste is your biggest source', body: 'Schedule a KarmaVerse pickup for your recyclables.' },
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
export const BAND_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Low footprint', color: '#16a34a' },
  medium: { label: 'Medium footprint', color: '#d97706' },
  high: { label: 'High footprint', color: '#e11d48' },
};

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

// Same "Coming soon!" wording Profile uses for features that aren't live yet.
export function showCarbonError(title: string, error: any) {
  if (error instanceof CarbonApiNotReadyError) {
    showAlert('Coming soon!', "We're finishing carbon tracking — check back soon.");
    return;
  }
  showAlert(title, error?.response?.data?.message || 'Please try again.');
}

// The share message and link for a result. The link opens the carbon footprint
// screen (logged-out visitors log in first and land there).
export function buildCarbonShare(r: CarbonResult): { text: string; url: string } {
  const top = CARBON_CATEGORY_ORDER.reduce<CarbonCategoryKey | null>(
    (best, k) => ((r.breakdown?.[k] ?? 0) > (best ? r.breakdown?.[best] ?? 0 : 0) ? k : best), null,
  );
  const origin = Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://karmaverse.earth';
  const text = `My carbon footprint is ${formatKg(r.totalKgCO2ePerMonth)} kg CO₂e a month 🌍.`
    + (top ? ` My biggest source is ${CARBON_CATEGORIES[top].label.toLowerCase()}.` : '')
    + ' Find out yours in 2 minutes on KarmaVer$e:';
  return { text, url: `${origin}/CarbonFootprint` };
}
