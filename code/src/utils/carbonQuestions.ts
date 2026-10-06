import { CarbonCategoryKey, CarbonAnswer } from '../services/carbon';

// Option-based question bank for the carbon assessment. Users tap an option
// (or type / speak in their own words). Options map to fixed ids that the backend
// turns into values with its configured conversion factors — the app never
// calculates CO₂. Free-text answers are the only part AI interprets.
//
// TODO(product/backend): this set replaces the original "6 free-text questions".
// Confirm the final list with product and give the backend a factor for every
// option id below. Bump QUESTION_SET_VERSION whenever ids or options change.
export const QUESTION_SET_VERSION = '2026-10';

export interface UserContext {
  firstName?: string;
  city?: string;
  employment?: string; // Student | Employed | Business | Unemployed | Retired | Not Specified
}

export interface QOption { id: string; label: string }
export interface Question {
  id: string;
  category: CarbonCategoryKey;
  multi?: boolean;
  ask: (ctx: UserContext, answers: AnswerMap) => string;
  options: QOption[];
  showIf?: (answers: AnswerMap) => boolean;
}

export type Answer = CarbonAnswer;
export type AnswerMap = Record<string, Answer>;

const picked = (a: AnswerMap, qid: string) => a[qid]?.optionIds ?? [];
const commutes = (a: AnswerMap) => picked(a, 't_mode').some((id) => ['bus_metro', 'auto_cab', 'two_wheeler', 'car'].includes(id));
const ownVehicle = (a: AnswerMap) => picked(a, 't_mode').some((id) => ['two_wheeler', 'car'].includes(id));

// Q1 is phrased from the user's profile: college for students, work for people
// who are employed or run a business, everyday travel for everyone else.
function commuteQuestion(ctx: UserContext) {
  const where = ctx.city ? ` in ${ctx.city}` : '';
  switch ((ctx.employment || '').toLowerCase()) {
    case 'student': return `How do you usually get to college${where}?`;
    case 'employed': case 'business': return `How do you usually get to work${where}?`;
    default: return `How do you usually get around${where} on a typical day?`;
  }
}

export const QUESTIONS: Question[] = [
  // ── Transport ──
  {
    id: 't_mode', category: 'transport', ask: (ctx) => commuteQuestion(ctx),
    options: [
      { id: 'walk_cycle', label: 'Walk or cycle' }, { id: 'bus_metro', label: 'Bus or metro' },
      { id: 'auto_cab', label: 'Auto or cab' }, { id: 'two_wheeler', label: 'Two-wheeler' },
      { id: 'car', label: 'Car' }, { id: 'from_home', label: 'I work or study from home' },
    ],
  },
  {
    id: 't_distance', category: 'transport', showIf: commutes, ask: () => 'Roughly how far is that, one way?',
    options: [{ id: 'lt5', label: 'Under 5 km' }, { id: '5_15', label: '5–15 km' }, { id: '15_30', label: '15–30 km' }, { id: 'gt30', label: 'Over 30 km' }],
  },
  {
    id: 't_days', category: 'transport', showIf: commutes, ask: () => 'How many days a week?',
    options: [{ id: '1_2', label: '1–2 days' }, { id: '3_4', label: '3–4 days' }, { id: '5', label: '5 days' }, { id: '6_7', label: '6–7 days' }],
  },
  {
    id: 't_fuel', category: 'transport', showIf: ownVehicle,
    ask: (_c, a) => `What does your ${picked(a, 't_mode').includes('car') ? 'car' : 'two-wheeler'} run on?`,
    options: [{ id: 'petrol', label: 'Petrol' }, { id: 'diesel', label: 'Diesel' }, { id: 'cng', label: 'CNG' }, { id: 'electric', label: 'Electric' }, { id: 'unsure', label: 'Not sure' }],
  },
  {
    id: 't_other', category: 'transport', ask: () => 'How often do you take cabs or autos for other trips?',
    options: [{ id: 'rarely', label: 'Rarely' }, { id: 'weekly', label: 'Once or twice a week' }, { id: 'most_days', label: 'Most days' }],
  },
  // ── Home energy (electricity + cooking) ──
  {
    id: 'e_people', category: 'electricity', ask: () => 'How many people live in your home?',
    options: [{ id: '1', label: 'Just me' }, { id: '2', label: '2' }, { id: '3_4', label: '3–4' }, { id: '5_plus', label: '5 or more' }],
  },
  {
    id: 'e_bill', category: 'electricity', ask: () => "What's your usual monthly electricity bill?",
    options: [{ id: 'lt1000', label: 'Under ₹1,000' }, { id: '1000_2500', label: '₹1,000–2,500' }, { id: '2500_5000', label: '₹2,500–5,000' }, { id: 'gt5000', label: 'Over ₹5,000' }, { id: 'unsure', label: 'Not sure' }],
  },
  {
    id: 'e_ac', category: 'electricity', ask: () => 'How much do you use AC in summer?',
    options: [{ id: 'none', label: "Don't have one" }, { id: 'few_hours', label: 'A few hours a day' }, { id: 'most_day', label: 'Most of the day' }, { id: 'all_day', label: 'Day and night' }],
  },
  {
    id: 'e_cooking', category: 'electricity', ask: () => 'What do you cook on?',
    options: [{ id: 'lpg', label: 'LPG cylinder' }, { id: 'png', label: 'Piped gas (PNG)' }, { id: 'induction', label: 'Induction or electric' }, { id: 'biomass', label: 'Wood or biomass' }],
  },
  {
    id: 'e_solar', category: 'electricity', ask: () => 'Any rooftop solar or green power at home?',
    options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, { id: 'unsure', label: 'Not sure' }],
  },
  // ── Diet ──
  {
    id: 'd_type', category: 'diet', ask: () => 'Which best describes what you eat?',
    options: [{ id: 'vegan', label: 'Vegan' }, { id: 'veg', label: 'Vegetarian' }, { id: 'egg', label: 'Eggetarian' }, { id: 'nonveg_some', label: 'Non-veg a few times a week' }, { id: 'nonveg_most', label: 'Non-veg most days' }],
  },
  {
    id: 'd_dairy', category: 'diet', ask: () => 'How much milk, curd, paneer or ghee?',
    options: [{ id: 'little', label: 'Little or none' }, { id: 'daily', label: 'A glass or bowl a day' }, { id: 'lots', label: 'Several times a day' }],
  },
  {
    id: 'd_out', category: 'diet', ask: () => 'How often do you order in or eat out?',
    options: [{ id: 'rarely', label: 'Rarely' }, { id: '1_2', label: '1–2 times a week' }, { id: '3_plus', label: '3+ times a week' }],
  },
  {
    id: 'd_waste', category: 'diet', ask: () => 'How much food gets thrown away at home?',
    options: [{ id: 'none', label: 'Almost none' }, { id: 'little', label: 'A little' }, { id: 'lots', label: 'Quite a lot' }],
  },
  // ── Waste ──
  {
    id: 'w_bin', category: 'waste', ask: () => 'How much rubbish does your home throw out?',
    options: [{ id: 'lt_weekly', label: 'Less than a bin a week' }, { id: 'every_few_days', label: 'A small bin every 2–3 days' }, { id: 'daily', label: 'A small bin every day' }, { id: 'more', label: 'More than that' }],
  },
  {
    id: 'w_habits', category: 'waste', multi: true, ask: () => 'Which of these do you already do? Pick all that apply.',
    options: [{ id: 'segregate', label: 'Separate wet and dry' }, { id: 'compost', label: 'Compost' }, { id: 'kabadiwala', label: 'Sell to kabadiwala' }, { id: 'karmaverse', label: 'KarmaVerse pickups' }, { id: 'none', label: 'None yet' }],
  },
  {
    id: 'w_plastic', category: 'waste', ask: () => 'How often do you use single-use plastic — bags, bottles, packets?',
    options: [{ id: 'avoid', label: 'I mostly avoid it' }, { id: 'sometimes', label: 'Sometimes' }, { id: 'daily', label: 'Every day' }],
  },
  // ── Water ──
  {
    id: 'wa_bath', category: 'water', ask: () => 'How do you usually bathe?',
    options: [{ id: 'bucket', label: 'Bucket bath' }, { id: 'short_shower', label: 'Short shower (5 min)' }, { id: 'long_shower', label: 'Long shower' }, { id: 'tub', label: 'Bathtub' }],
  },
  {
    id: 'wa_geyser', category: 'water', ask: () => 'How do you heat bath water?',
    options: [{ id: 'none', label: "Don't heat it" }, { id: 'solar', label: 'Solar heater' }, { id: 'geyser_winter', label: 'Electric geyser, winter only' }, { id: 'geyser_all', label: 'Electric geyser, all year' }, { id: 'gas', label: 'Gas geyser' }],
  },
  {
    id: 'wa_laundry', category: 'water', ask: () => 'Washing machine loads in a week?',
    options: [{ id: '0', label: 'None' }, { id: '1_3', label: '1–3' }, { id: '4_7', label: '4–7' }, { id: '8_plus', label: '8 or more' }],
  },
  // ── Flights ──
  {
    id: 'f_domestic', category: 'flights', ask: () => 'Domestic flights in the last 12 months? Count each one-way flight.',
    options: [{ id: '0', label: 'None' }, { id: '1_2', label: '1–2' }, { id: '3_6', label: '3–6' }, { id: '7_plus', label: '7 or more' }],
  },
  {
    id: 'f_intl', category: 'flights', ask: () => 'And international flights?',
    options: [{ id: '0', label: 'None' }, { id: '1_2', label: '1–2' }, { id: '3_4', label: '3–4' }, { id: '5_plus', label: '5 or more' }],
  },
  // ── Shopping ──
  {
    id: 's_clothes', category: 'shopping', ask: () => 'How many new clothes or shoes in a typical month?',
    options: [{ id: 'rarely', label: 'Rarely any' }, { id: '1_2', label: '1–2 items' }, { id: '3_5', label: '3–5 items' }, { id: '6_plus', label: '6 or more' }],
  },
  {
    id: 's_orders', category: 'shopping', ask: () => 'Online shopping or quick-commerce deliveries in a week?',
    options: [{ id: '0_1', label: '0–1' }, { id: '2_4', label: '2–4' }, { id: '5_plus', label: '5 or more' }],
  },
  {
    id: 's_gadgets', category: 'shopping', ask: () => 'New phones, laptops or appliances in the last year?',
    options: [{ id: '0', label: 'None' }, { id: '1', label: '1' }, { id: '2_3', label: '2–3' }, { id: '4_plus', label: '4 or more' }],
  },
];

// The questions that apply given the answers so far, in order.
export const visibleQuestions = (answers: AnswerMap) => QUESTIONS.filter((q) => !q.showIf || q.showIf(answers));

export function answerLabel(q: Question, a: Answer): string {
  if (a.text) return a.text;
  return (a.optionIds ?? []).map((id) => q.options.find((o) => o.id === id)?.label ?? id).join(', ');
}
