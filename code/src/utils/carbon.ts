import { Bus, Zap, Utensils, Recycle, Droplets, Plane, Leaf } from 'lucide-react-native';
import { showAlert } from './alert';
import { CarbonApiNotReadyError, CarbonCategoryKey } from '../services/carbon';

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
