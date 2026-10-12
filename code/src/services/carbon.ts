import api from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Carbon footprint service — backend contract: "Carbon Footprint — API
// Integration Guide (Frontend)", base path /api/v1/carbon-footprint.
//
// The interview is a server-side session: six categories in a fixed order, one
// structured answer per category. The backend validates every answer strictly
// (no extra fields), applies the emission factors and stores each completed
// result as a new record. The app never calculates CO₂ itself.
//
// Switched on with EXPO_PUBLIC_CARBON_API=true. While it's off (e.g. before the
// routes are deployed), reads return empty results — the screens show their
// empty states — and writes throw CarbonApiNotReadyError ("Coming soon!").
// ─────────────────────────────────────────────────────────────────────────────
export const CARBON_API_READY = process.env.EXPO_PUBLIC_CARBON_API === 'true';

const BASE = '/api/v1/carbon-footprint';

export class CarbonApiNotReadyError extends Error {
  constructor() {
    super('Carbon footprint API is not available yet');
    this.name = 'CarbonApiNotReadyError';
  }
}

// The backend asks the categories in exactly this order and rejects anything else.
export type CarbonCategoryKey = 'transport' | 'electricity' | 'diet' | 'waste' | 'water' | 'flights';
export const CARBON_CATEGORY_ORDER: CarbonCategoryKey[] = ['transport', 'electricity', 'diet', 'waste', 'water', 'flights'];

export type TransportMode = 'car_petrol' | 'car_diesel' | 'car_ev' | 'bike' | 'bus' | 'train' | 'walk_cycle' | 'none';
export type ElectricitySource = 'grid' | 'solar' | 'mixed';
export type DietType = 'vegan' | 'vegetarian' | 'eggetarian' | 'non_veg_moderate' | 'non_veg_heavy';

// Answer shape per category. Every field is required and nothing else may be sent.
export interface CarbonAnswers {
  transport: { mode: TransportMode; kmPerDay: number };
  electricity: { unitsKwhPerMonth: number; source: ElectricitySource };
  diet: { dietType: DietType };
  waste: { segregatesWaste: boolean; kgPerWeek: number };
  water: { litersPerDay: number };
  flights: { shortHaulPerYear: number; longHaulPerYear: number };
}

export interface CarbonQuestion {
  category: CarbonCategoryKey;
  questionText: string;
}

export interface CarbonSession {
  sessionId: string;
  status: 'in_progress' | string;
  answeredCategories: CarbonCategoryKey[];
  nextQuestion: CarbonQuestion | null;
}

// One stored result. History items may leave out the breakdown and tips.
export interface CarbonResult {
  _id: string;
  totalKgCO2ePerMonth: number;
  totalKgCO2ePerYear?: number;
  score?: number;
  category?: 'low' | 'medium' | 'high' | string; // footprint band, not an assessment category
  breakdown?: Partial<Record<CarbonCategoryKey, number>>;
  tips?: string[];
  periodLabel?: string; // "YYYY-MM"
  emissionFactorVersion?: string;
  createdAt: string;
}

export interface CarbonComparison {
  deltaKgCO2ePerMonth: number; // negative = footprint went down
  improved: boolean;
  previousPeriodLabel?: string;
}

export interface CarbonSummary {
  totalAssessments: number;
  averageKgCO2ePerMonth: number;
  bestKgCO2ePerMonth: number;
}

export type AnswerResponse =
  | { completed: false; nextQuestion: CarbonQuestion }
  | { completed: true; result: CarbonResult };

const notReady = () => { throw new CarbonApiNotReadyError(); };
const unwrap = (response: any) => response.data?.data ?? response.data;
const is404 = (error: any) => error?.response?.status === 404;

// Categories before the one the backend expects next — the order is fixed, and
// POST /session/start doesn't list them.
const answeredBefore = (next?: CarbonCategoryKey | null) =>
  next ? CARBON_CATEGORY_ORDER.slice(0, Math.max(CARBON_CATEGORY_ORDER.indexOf(next), 0)) : [...CARBON_CATEGORY_ORDER];

export const carbonService = {
  // Starts a new interview, or resumes the one in progress.
  startSession: async (): Promise<CarbonSession> => {
    if (!CARBON_API_READY) return notReady();
    const data = unwrap(await api.post(`${BASE}/session/start`));
    return { ...data, answeredCategories: answeredBefore(data.nextQuestion?.category) };
  },

  // The interview in progress, or null when there isn't one.
  getSession: async (): Promise<CarbonSession | null> => {
    if (!CARBON_API_READY) return null;
    try {
      const data = unwrap(await api.get(`${BASE}/session`));
      return { ...data, answeredCategories: data.answeredCategories ?? answeredBefore(data.nextQuestion?.category) };
    } catch (error: any) {
      if (!is404(error)) console.error('Get Carbon Session Error:', error);
      return null;
    }
  },

  // Answers the category the backend is expecting. The sixth answer returns the result.
  submitAnswer: async <K extends CarbonCategoryKey>(category: K, answer: CarbonAnswers[K]): Promise<AnswerResponse> => {
    if (!CARBON_API_READY) return notReady();
    const data = unwrap(await api.post(`${BASE}/session/answer`, { category, answer }));
    return data.completed ? { completed: true, result: data.result } : { completed: false, nextQuestion: data.nextQuestion };
  },

  // Throws away the interview in progress (used by "Start over").
  abandonSession: async (): Promise<void> => {
    if (!CARBON_API_READY) return;
    try {
      await api.delete(`${BASE}/session`);
    } catch (error: any) {
      if (!is404(error)) throw error;
    }
  },

  // Latest completed result plus the change since the previous one; null if none yet.
  getLatestResult: async (): Promise<{ result: CarbonResult; comparison: CarbonComparison | null } | null> => {
    if (!CARBON_API_READY) return null;
    try {
      const data = unwrap(await api.get(`${BASE}/result/latest`));
      return data?.result ? { result: data.result, comparison: data.comparison ?? null } : null;
    } catch (error: any) {
      if (!is404(error)) console.error('Get Latest Carbon Result Error:', error);
      return null;
    }
  },

  // Past results, newest first.
  getHistory: async (page = 1, limit = 12): Promise<{ results: CarbonResult[]; hasMore: boolean }> => {
    if (!CARBON_API_READY) return { results: [], hasMore: false };
    try {
      const data = unwrap(await api.get(`${BASE}/result/history`, { params: { page, limit } }));
      return { results: Array.isArray(data?.results) ? data.results : [], hasMore: !!data?.pagination?.hasMore };
    } catch (error: any) {
      if (!is404(error)) console.error('Get Carbon History Error:', error);
      return { results: [], hasMore: false };
    }
  },

  // Totals across all completed results; null if none yet.
  getSummary: async (): Promise<CarbonSummary | null> => {
    if (!CARBON_API_READY) return null;
    try {
      return unwrap(await api.get(`${BASE}/result/summary`));
    } catch (error: any) {
      if (!is404(error)) console.error('Get Carbon Summary Error:', error);
      return null;
    }
  },

  // TODO(backend): no endpoints yet for logging green actions or setting a monthly
  // goal — the hub shows "Coming soon!" for both.
};
