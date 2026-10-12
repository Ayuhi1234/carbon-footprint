import { CarbonCategoryKey, CarbonAnswers } from '../services/carbon';

// What the chat asks for each backend category, one field at a time. Each field
// maps 1:1 to a field of the backend's answer shape (see CarbonAnswers), so the
// app sends exactly those fields — the backend rejects anything extra. Tap
// options carry a representative value; number fields can also be typed or spoken.
// The backend applies the emission factors; the app never calculates CO₂.

export interface UserContext {
  firstName?: string;
  city?: string;
  employment?: string; // Student | Employed | Business | Unemployed | Retired | Not Specified
}

export type FieldValue = string | number | boolean;
export interface FieldAnswer { value: FieldValue; label: string }
export type Draft = Record<string, FieldAnswer>;

export interface QOption { label: string; value: FieldValue }
export interface Field {
  key: string; // field name in the backend answer
  category: CarbonCategoryKey;
  ask: (ctx: UserContext, draft: Draft) => string;
  hint?: string;
  options: QOption[];
  number?: { min: number; max: number; unit: string }; // allows a typed value
  // Value to send without asking, when an earlier answer makes the question moot.
  auto?: (draft: Draft) => FieldValue | undefined;
}

// The transport question is phrased from the user's profile: college for
// students, work for people who are employed or run a business, everyday travel
// for everyone else.
function commuteQuestion(ctx: UserContext) {
  const where = ctx.city ? ` in ${ctx.city}` : '';
  switch ((ctx.employment || '').toLowerCase()) {
    case 'student': return `How do you usually get to college${where}?`;
    case 'employed': case 'business': return `How do you usually get to work${where}?`;
    default: return `How do you usually get around${where} on a typical day?`;
  }
}

export const FIELDS: Field[] = [
  // ── Transport ──
  {
    key: 'mode', category: 'transport', ask: (ctx) => commuteQuestion(ctx),
    options: [
      { label: 'Walk or cycle', value: 'walk_cycle' }, { label: 'Bus', value: 'bus' }, { label: 'Metro or train', value: 'train' },
      { label: 'Two-wheeler', value: 'bike' }, { label: 'Petrol car', value: 'car_petrol' }, { label: 'Diesel car', value: 'car_diesel' },
      { label: 'Electric car', value: 'car_ev' }, { label: "I don't travel daily", value: 'none' },
    ],
  },
  {
    key: 'kmPerDay', category: 'transport', ask: () => 'Roughly how far do you travel in a day, there and back?',
    auto: (d) => (d.mode && ['walk_cycle', 'none'].includes(d.mode.value as string) ? 0 : undefined),
    number: { min: 0, max: 1000, unit: 'km' },
    options: [
      { label: 'Under 5 km', value: 3 }, { label: '5–15 km', value: 10 }, { label: '15–30 km', value: 22 },
      { label: '30–50 km', value: 40 }, { label: 'Over 50 km', value: 60 },
    ],
  },
  // ── Electricity ──
  {
    key: 'unitsKwhPerMonth', category: 'electricity', ask: () => 'How many electricity units does your home use in a month?',
    hint: "It's the “units consumed” figure on your electricity bill.",
    number: { min: 0, max: 10000, unit: 'units' },
    options: [
      { label: 'Under 100', value: 75 }, { label: '100–200', value: 150 }, { label: '200–300', value: 250 },
      { label: '300–500', value: 400 }, { label: 'Over 500', value: 600 },
    ],
  },
  {
    key: 'source', category: 'electricity', ask: () => 'Where does your electricity come from?',
    options: [{ label: 'The grid', value: 'grid' }, { label: 'Mostly rooftop solar', value: 'solar' }, { label: 'Grid and solar', value: 'mixed' }],
  },
  // ── Diet ──
  {
    key: 'dietType', category: 'diet', ask: () => 'Which best describes what you eat?',
    options: [
      { label: 'Vegan', value: 'vegan' }, { label: 'Vegetarian', value: 'vegetarian' }, { label: 'Eggetarian', value: 'eggetarian' },
      { label: 'Non-veg a few times a week', value: 'non_veg_moderate' }, { label: 'Non-veg most days', value: 'non_veg_heavy' },
    ],
  },
  // ── Waste ──
  {
    key: 'segregatesWaste', category: 'waste', ask: () => 'Do you separate wet and dry waste at home?',
    options: [{ label: 'Yes', value: true }, { label: 'No', value: false }],
  },
  {
    key: 'kgPerWeek', category: 'waste', ask: () => 'About how much rubbish does your home throw out in a week?',
    number: { min: 0, max: 500, unit: 'kg' },
    options: [
      { label: 'A small bag (~2 kg)', value: 2 }, { label: 'A small bin (~5 kg)', value: 5 },
      { label: 'A large bin (~10 kg)', value: 10 }, { label: 'More than that (~15 kg)', value: 15 },
    ],
  },
  // ── Water ──
  {
    key: 'litersPerDay', category: 'water', ask: () => 'How much water do you use in a day?',
    hint: 'A bucket bath is about 20 litres; a 10-minute shower about 90.',
    number: { min: 0, max: 5000, unit: 'litres' },
    options: [
      { label: 'Careful (~80 L)', value: 80 }, { label: 'Average (~135 L)', value: 135 },
      { label: 'Quite a lot (~200 L)', value: 200 }, { label: 'A lot (~300 L)', value: 300 },
    ],
  },
  // ── Flights ──
  {
    key: 'shortHaulPerYear', category: 'flights', ask: () => 'How many short flights (under 3 hours) in the last 12 months? Count each one-way flight.',
    number: { min: 0, max: 100, unit: 'flights' },
    options: [{ label: 'None', value: 0 }, { label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3–5', value: 4 }, { label: '6 or more', value: 8 }],
  },
  {
    key: 'longHaulPerYear', category: 'flights', ask: () => 'And long flights, over 3 hours?',
    number: { min: 0, max: 100, unit: 'flights' },
    options: [{ label: 'None', value: 0 }, { label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3–5', value: 4 }, { label: '6 or more', value: 8 }],
  },
];

export const fieldsFor = (category: CarbonCategoryKey) => FIELDS.filter((f) => f.category === category);

// The fields still to ask in a category, given the answers so far.
export const fieldsToAsk = (category: CarbonCategoryKey, draft: Draft) =>
  fieldsFor(category).filter((f) => !(f.auto && f.auto(draft) !== undefined));

// The backend answer for a category once every field has a value; null until then.
export function buildAnswer<K extends CarbonCategoryKey>(category: K, draft: Draft): CarbonAnswers[K] | null {
  const answer: Record<string, FieldValue> = {};
  for (const f of fieldsFor(category)) {
    const value = draft[f.key]?.value ?? f.auto?.(draft);
    if (value === undefined) return null;
    answer[f.key] = value;
  }
  return answer as unknown as CarbonAnswers[K];
}

// A typed or spoken number ("about 15 km" → 15), or null if none / out of range.
export function parseNumber(field: Field, text: string): number | null {
  const match = text.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!match || !field.number) return null;
  // A minus sign must not be dropped: "-5" is out of range, not 5.
  const n = Number(match[0]);
  return n >= field.number.min && n <= field.number.max ? n : null;
}
