import api from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Carbon footprint service
//
// TODO(backend): the carbon endpoints below DO NOT EXIST on the backend yet.
// Everything in this file is a PROPOSED contract, taken from the Carbon
// Footprint feature spec (fixed categories, option or free-text answers, AI
// extraction of free text + deterministic formulas on the server, results stored with the conversion
// factor version, past assessments never overwritten). Confirm paths and field
// names with the backend team before enabling.
//
// Until then the service is switched off: reads return empty results (the
// screens show their empty states) and writes throw CarbonApiNotReadyError
// (the screens show "Coming soon!"). Nothing is faked or calculated here.
// Enable with EXPO_PUBLIC_CARBON_API=true once the endpoints ship.
// ─────────────────────────────────────────────────────────────────────────────
export const CARBON_API_READY = process.env.EXPO_PUBLIC_CARBON_API === 'true';

export class CarbonApiNotReadyError extends Error {
  constructor() {
    super('Carbon footprint API is not available yet');
    this.name = 'CarbonApiNotReadyError';
  }
}

// Assessment categories in display order. The spec's six, plus `shopping`
// (added after review — TODO(product): confirm). The breakdown only shows the
// categories the backend actually returns.
export type CarbonCategoryKey = 'transport' | 'electricity' | 'diet' | 'waste' | 'water' | 'flights' | 'shopping';
export const CARBON_CATEGORY_ORDER: CarbonCategoryKey[] = ['transport', 'electricity', 'diet', 'waste', 'water', 'flights', 'shopping'];

// One answer: the option ids the user tapped, or their own words (typed or
// spoken). Only `text` answers go through AI extraction on the server.
export type CarbonAnswer = { optionIds?: string[]; text?: string };

// One stored assessment result. All numbers are calculated by the backend.
export interface CarbonAssessment {
  _id: string;
  createdAt: string;
  totalKgPerMonth: number;
  categories: { key: CarbonCategoryKey; kgCo2e: number }[]; // only categories the backend returns
  factorVersion?: string;
}

// CO₂ saved through logged actions and pickups. `level` is optional and only
// shown when the backend sends it — the app has no carbon level names of its own.
export interface CarbonSummary {
  savedKgThisMonth: number;
  savedKgLifetime: number;
  level?: { name: string; level: number; nextName?: string | null; progress?: number | null } | null;
  goal?: { reductionPercent: number } | null;
}

export type LoggableActivity = 'public_transport' | 'cycle_walk' | 'plant_based_meal' | 'energy_saving';

export interface CarbonActivity {
  _id: string;
  type: LoggableActivity | 'pickup' | string;
  title: string;
  kgCo2e: number; // CO₂ saved by this action, from the backend
  createdAt: string;
}

const notReady = () => { throw new CarbonApiNotReadyError(); };

export const carbonService = {
  // Assessment history, newest first. Each call to submitAssessment adds a record.
  getAssessments: async (): Promise<CarbonAssessment[]> => {
    if (!CARBON_API_READY) return [];
    try {
      const response = await api.get('/api/v1/carbon/assessments');
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status !== 404) console.error('Get Carbon Assessments Error:', error);
      return [];
    }
  },

  // Sends the answers keyed by question id, plus the question-set version so the
  // backend maps option ids to the right factors. The backend applies the
  // configured conversion factors (AI only reads free-text answers) and stores a
  // NEW historical record.
  submitAssessment: async (answers: Record<string, CarbonAnswer>, questionSetVersion: string): Promise<CarbonAssessment> => {
    if (!CARBON_API_READY) return notReady();
    try {
      const response = await api.post('/api/v1/carbon/assessments', { questionSetVersion, answers });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Submit Carbon Assessment Error:', error);
      throw error;
    }
  },

  getSummary: async (): Promise<CarbonSummary | null> => {
    if (!CARBON_API_READY) return null;
    try {
      const response = await api.get('/api/v1/carbon/summary');
      return response.data.data || response.data;
    } catch (error: any) {
      if (error?.response?.status !== 404) console.error('Get Carbon Summary Error:', error);
      return null;
    }
  },

  getActivities: async (): Promise<CarbonActivity[]> => {
    if (!CARBON_API_READY) return [];
    try {
      const response = await api.get('/api/v1/carbon/activities');
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status !== 404) console.error('Get Carbon Activities Error:', error);
      return [];
    }
  },

  // The app only sends the activity type; the backend owns the CO₂ value.
  logActivity: async (type: LoggableActivity) => {
    if (!CARBON_API_READY) return notReady();
    try {
      const response = await api.post('/api/v1/carbon/activities', { type });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Log Carbon Activity Error:', error);
      throw error;
    }
  },

  // Monthly reduction goal, as a percentage of the latest assessment.
  setGoal: async (reductionPercent: number) => {
    if (!CARBON_API_READY) return notReady();
    try {
      const response = await api.post('/api/v1/carbon/goal', { reductionPercent });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Set Carbon Goal Error:', error);
      throw error;
    }
  },

  // TODO(backend): Offset has no backend or partner integration yet, so the
  // screens do not show an Offset action. Add it here when one exists.
};
