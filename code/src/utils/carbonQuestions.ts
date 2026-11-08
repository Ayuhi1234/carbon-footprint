import { CarbonCategoryKey, CarbonAnswers, ServerQuestion, CARBON_CATEGORY_ORDER } from '../services/carbon';

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

// ── Questions from the backend ───────────────────────────────────────────────
// GET /carbon-footprint/questions serves the backend's single question list
// (carbon.questions.js). applyServerQuestions() replaces FIELDS with that list, so
// editing that one backend file changes what the chat asks (including the
// profile-based commute wording), its tap options and the typed-number limits.
// FIELDS above stays as the fallback when the list can't be loaded. One app-side
// behaviour is kept from the bundled fields: the distance being filled in
// automatically for walk/cycle and "don't travel".
// Returns false and changes nothing if the list looks incomplete or unexpected.

// The question for this user: the wording for their employment if the backend has
// one, else the default; "{city}" becomes " in <city>" (or nothing).
function personalisedAsk(sf: ServerQuestion['fields'][number], ctx: UserContext): string {
  const employment = (ctx.employment || '').toLowerCase();
  const template = sf.askByEmployment?.[employment] ?? sf.ask ?? '';
  return template.replace('{city}', ctx.city ? ` in ${ctx.city}` : '');
}

export function applyServerQuestions(questions: ServerQuestion[]): boolean {
  const bundled = new Map(FIELDS.map((f) => [f.key, f]));
  const next: Field[] = [];
  for (const category of CARBON_CATEGORY_ORDER) {
    const question = questions.find((q) => q.category === category);
    if (!question || !Array.isArray(question.fields) || question.fields.length === 0) return false;
    for (const sf of question.fields) {
      const local = bundled.get(sf.key);
      if (!local || !sf.ask) return false;
      const isNumber = sf.type === 'number';
      const options = (isNumber ? sf.quickOptions : sf.options) ?? [];
      if (isNumber && (typeof sf.min !== 'number' || typeof sf.max !== 'number')) return false;
      if (!isNumber && options.length === 0) return false;
      next.push({
        key: sf.key,
        category,
        ask: (ctx) => personalisedAsk(sf, ctx),
        hint: sf.hint,
        options: options.map((o) => ({ label: o.label, value: o.value })),
        number: isNumber ? { min: sf.min as number, max: sf.max as number, unit: sf.unit ?? '' } : undefined,
        auto: local.auto,
      });
    }
  }
  if (next.length !== bundled.size) return false;
  FIELDS.splice(0, FIELDS.length, ...next);
  return true;
}

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

// ── Typed or spoken numbers ──────────────────────────────────────────────────
// Typed and spoken answers both arrive here as text (voice fills the text box).
// readNumber() works out the one number the user meant for this question, or a
// clear message when the answer doesn't fit it: a time instead of km, rupees
// instead of units, "per week" for a per-day question, several numbers, etc.

export type NumberRead =
  | { kind: 'value'; value: number; label: string }
  | { kind: 'error'; message: string }
  | { kind: 'none' }; // no number in the text

type UnitGroup = 'distance' | 'energy' | 'weight' | 'volume' | 'count' | 'time' | 'money' | 'people' | 'duration';
type Period = 'day' | 'week' | 'month' | 'year';

// What each question measures, keyed by its unit (from carbon.questions.js).
const FIELD_UNITS: Record<string, { group: UnitGroup; period: Period; noun: string }> = {
  km: { group: 'distance', period: 'day', noun: 'the distance in km' },
  units: { group: 'energy', period: 'month', noun: 'the units from your electricity bill' },
  kg: { group: 'weight', period: 'week', noun: 'the weight in kg' },
  litres: { group: 'volume', period: 'day', noun: 'the amount in litres' },
  flights: { group: 'count', period: 'year', noun: 'the number of flights' },
};

// Words that can follow a number. factor converts to the question's own unit
// (only exact conversions: metres, miles, grams, millilitres).
const UNIT_WORDS: Record<string, { group: UnitGroup; factor?: number; name: string }> = {};
const addUnits = (words: string[], group: UnitGroup, name: string, factor?: number) =>
  words.forEach((w) => { UNIT_WORDS[w] = { group, factor, name }; });
addUnits(['km', 'kms', 'kilometre', 'kilometres', 'kilometer', 'kilometers'], 'distance', 'km');
addUnits(['m', 'metre', 'metres', 'meter', 'meters', 'mtr', 'mtrs'], 'distance', 'metres', 0.001);
addUnits(['mile', 'miles'], 'distance', 'miles', 1.609);
addUnits(['unit', 'units', 'kwh'], 'energy', 'units');
addUnits(['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'], 'weight', 'kg');
addUnits(['g', 'gm', 'gms', 'gram', 'grams'], 'weight', 'grams', 0.001);
addUnits(['l', 'ltr', 'ltrs', 'litre', 'litres', 'liter', 'liters'], 'volume', 'litres');
addUnits(['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'], 'volume', 'millilitres', 0.001);
addUnits(['bucket', 'buckets'], 'volume', 'buckets');
addUnits(['flight', 'flights', 'trip', 'trips', 'time', 'times'], 'count', 'flights');
addUnits(['minute', 'minutes', 'min', 'mins', 'hour', 'hours', 'hr', 'hrs', 'second', 'seconds', 'sec', 'secs'], 'time', 'time');
addUnits(['rupee', 'rupees', 'rs', 'inr'], 'money', 'rupees');
addUnits(['people', 'person', 'persons', 'member', 'members'], 'people', 'people');
addUnits(['day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years'], 'duration', 'days');

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

// "twenty two" → 22, "two hundred and fifty" → 250, "one and a half" → 1.5,
// "half" → 0.5, "once"/"twice" → 1/2. Everything else is left as it is.
function wordsToDigits(text: string): string {
  const words = text.replace(/([a-z])-([a-z])/g, '$1 $2').split(/\s+/);
  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (w === 'once' || w === 'twice') { out.push(w === 'once' ? '1' : '2'); i += 1; continue; }
    const starts = w in NUMBER_WORDS || w === 'half' || ((w === 'a' || w === 'one') && ['hundred', 'thousand'].includes(words[i + 1]));
    if (!starts) { out.push(w); i += 1; continue; }
    let total = 0;
    let current = 0;
    let used = false;
    while (i < words.length) {
      const t = words[i];
      if (t in NUMBER_WORDS) { current += NUMBER_WORDS[t]; used = true; i += 1; }
      else if (t === 'hundred') { current = (current || 1) * 100; used = true; i += 1; }
      else if (t === 'thousand') { total += (current || 1) * 1000; current = 0; used = true; i += 1; }
      else if (t === 'half') { current += 0.5; used = true; i += 1; }
      else if (t === 'a' && ['hundred', 'thousand', 'half'].includes(words[i + 1])) { i += 1; }
      else if (t === 'and' && used && (words[i + 1] in NUMBER_WORDS || (words[i + 1] === 'a' && words[i + 2] === 'half'))) { i += 1; }
      else break;
    }
    out.push(used ? String(total + current) : w);
  }
  return out.join(' ');
}

const PERIOD_WORDS: Record<string, Period> = {
  daily: 'day', day: 'day', weekly: 'week', week: 'week', monthly: 'month', month: 'month',
  yearly: 'year', year: 'year', annually: 'year', annual: 'year',
};

type Found = { value: number; unit?: { group: UnitGroup; factor?: number; name: string }; range: boolean; money: boolean; after: string };

const fmt = (n: number) => Number(n.toFixed(2)).toLocaleString();

export function readNumber(field: Field, rawText: string): NumberRead {
  if (!field.number) return { kind: 'none' };
  const spec = FIELD_UNITS[field.number.unit];
  const { min, max, unit } = field.number;
  let text = ` ${rawText.toLowerCase()} `
    .replace(/(\d),(?=\d)/g, '$1')           // 1,500 → 1500
    .replace(/(\d)\s+and a half\b/g, '$1.5') // 2 and a half → 2.5
    .replace(/[’']/g, '');
  text = wordsToDigits(text);
  if (unit !== 'km') text = text.replace(/(\d+(?:\.\d+)?)\s*k\b/g, (_, n) => String(Number(n) * 1000)); // 2k → 2000

  // Every number in the text, with the word after it. "10 to 15" / "10-15" is one range.
  const found: Found[] = [];
  const re = /(-?)(\d+(?:\.\d+)?)(?:\s*(?:-|–|to|or)\s*(\d+(?:\.\d+)?))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const a = Number(m[2]);
    const b = m[3] !== undefined ? Number(m[3]) : undefined;
    const isRange = b !== undefined && b > a;
    const negative = m[1] === '-' && /[\s(]$/.test(text.slice(0, m.index));
    const rest = text.slice(m.index + m[0].length);
    const word = rest.match(/^\s*([a-z]+)/)?.[1];
    const unitWord = word ? UNIT_WORDS[word] : undefined;
    found.push({
      value: isRange ? (a + (b as number)) / 2 : negative ? -a : a,
      unit: unitWord,
      range: isRange,
      money: /(₹|\brs\.?)\s*$/.test(text.slice(Math.max(0, m.index - 6), m.index)),
      after: unitWord ? rest.replace(/^\s*[a-z]+/, '') : rest,
    });
  }
  if (found.length === 0) return { kind: 'none' };

  const noun = spec?.noun ?? `a number of ${unit}`;
  // Pick the number: the only one with this question's unit, or the only number.
  const own = spec ? found.filter((f) => f.unit?.group === spec.group) : [];
  const pick = own.length === 1 ? own[0] : own.length === 0 && found.length === 1 ? found[0] : null;
  if (!pick) return { kind: 'error', message: `I found more than one number. Please give just one: ${noun}.` };

  if (spec) {
    if (pick.money || pick.unit?.group === 'money') {
      return { kind: 'error', message: spec.group === 'energy' ? 'That sounds like your bill amount in rupees. Please give the units (kWh) from your bill.' : `That sounds like an amount in rupees. Please give ${noun}.` };
    }
    if (pick.unit && pick.unit.group !== spec.group) {
      const g = pick.unit.group;
      const message =
        g === 'time' ? `That sounds like a time. Please give ${noun}.`
        : g === 'people' ? `That sounds like a number of people. Please give ${noun}.`
        : g === 'duration' ? `That sounds like a number of days, weeks or months. Please give ${noun}.`
        : `That's in ${pick.unit.name}, not ${unit}. Please give ${noun}.`;
      return { kind: 'error', message };
    }
    if (pick.unit?.name === 'buckets') return { kind: 'error', message: 'Please give litres. A bucket is about 20 litres.' };
    // "20 km a week" when the question asks per day.
    const said = pick.after.match(/^\s*(?:(?:per|a|an|every|each|in a|in an)\s+)?(daily|weekly|monthly|yearly|annually|annual|day|week|month|year)\b/)?.[1];
    const period = said ? PERIOD_WORDS[said] : undefined;
    if (period && period !== spec.period) return { kind: 'error', message: `That's per ${period}. This question asks per ${spec.period}.` };
  }

  const factor = pick.unit?.factor ?? 1;
  const value = Number((pick.value * factor).toFixed(3));
  if (value < min || value > max) return { kind: 'error', message: `Enter a number from ${min.toLocaleString()} to ${max.toLocaleString()} ${unit}.` };
  if (spec?.group === 'count' && !Number.isInteger(value)) return { kind: 'error', message: `Please give a whole number of ${unit}.` };
  const label = `${pick.range ? 'about ' : ''}${fmt(value)} ${unit}${factor !== 1 ? ` (${fmt(pick.value)} ${pick.unit?.name})` : ''}`;
  return { kind: 'value', value, label };
}

// ── Typed answers → suggested options ────────────────────────────────────────
// Everyday words (including common Hinglish) for each tap option, keyed by
// "fieldKey:value". The option's own label always counts too. A match only ever
// SUGGESTS options; the user taps to confirm, so typed text never becomes an
// answer on its own.
const KEYWORDS: Record<string, string[]> = {
  'mode:walk_cycle': ['walk', 'walking', 'on foot', 'paidal', 'cycle', 'cycling', 'bicycle', 'bike ride'],
  'mode:bus': ['bus', 'buses', 'best bus', 'dtc', 'public transport'],
  'mode:train': ['metro', 'train', 'local train', 'local', 'rail', 'railway', 'subway'],
  'mode:bike': ['two wheeler', 'twowheeler', 'scooter', 'scooty', 'motorbike', 'motorcycle', 'activa', 'splendor', 'bike'],
  'mode:car_petrol': ['petrol car', 'petrol', 'car', 'cab', 'taxi', 'uber', 'ola'],
  'mode:car_diesel': ['diesel car', 'diesel', 'car'],
  'mode:car_ev': ['electric car', 'ev', 'e car', 'tesla', 'nexon ev', 'car'],
  'mode:none': ['work from home', 'wfh', 'from home', 'dont travel', 'do not travel', 'no travel', 'ghar se', 'stay home'],
  'source:grid': ['grid', 'electricity board', 'board', 'government', 'normal', 'regular', 'mseb', 'bescom', 'tata power', 'adani'],
  'source:solar': ['solar', 'rooftop', 'solar panel', 'solar panels'],
  'source:mixed': ['both', 'mix', 'mixed', 'grid and solar', 'solar and grid', 'some solar', 'partly solar'],
  'dietType:vegan': ['vegan', 'plant based', 'no dairy', 'no milk'],
  'dietType:vegetarian': ['vegetarian', 'veg', 'pure veg', 'shakahari', 'no meat'],
  'dietType:eggetarian': ['eggetarian', 'egg', 'eggs', 'anda', 'veg and egg'],
  'dietType:non_veg_moderate': ['sometimes', 'occasionally', 'weekends', 'few times', 'once a week', 'twice a week', 'non veg sometimes', 'nonveg sometimes', 'non veg', 'nonveg', 'non vegetarian', 'chicken', 'meat', 'fish', 'mutton'],
  'dietType:non_veg_heavy': ['daily', 'every day', 'everyday', 'most days', 'non veg daily', 'chicken daily', 'meat daily', 'all the time', 'non veg', 'nonveg', 'non vegetarian', 'chicken', 'meat', 'fish', 'mutton'],
  'segregatesWaste:true': ['yes', 'yeah', 'yep', 'haan', 'ha', 'ji', 'sure', 'i do', 'we do', 'always', 'separate', 'segregate', 'wet and dry'],
  'segregatesWaste:false': ['no', 'nope', 'nahi', 'nahin', 'never', 'dont', 'do not', 'not really', 'mix it', 'together'],
  'shortHaulPerYear:0': ['none', 'no', 'zero', 'never', 'nahi', 'no flights'],
  'longHaulPerYear:0': ['none', 'no', 'zero', 'never', 'nahi', 'no flights'],
};

const normalize = (t: string) => ` ${t.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;

// "I don't take the bus" must not suggest Bus: a match is ignored when a negation
// comes just before it (filler words like "take the" are skipped).
const NEGATIONS = new Set(['not', 'no', 'dont', 'never', 'nahi', 'non', 'without', 'cant', 'doesnt', 'didnt']);
const FILLER = new Set(['the', 'a', 'an', 'eat', 'use', 'take', 'have', 'go', 'by', 'really', 'any', 'much', 'ride', 'drive', 'travel', 'own', 'my', 'we', 'i', 'do', 'usually']);
function heard(said: string, term: string): boolean {
  if (!term.trim()) return false;
  const termNegated = NEGATIONS.has(term.trim().split(' ')[0]);
  let from = 0;
  for (;;) {
    const at = said.indexOf(term, from);
    if (at < 0) return false;
    const before = said.slice(0, at).trim().split(' ').filter(Boolean);
    let k = before.length - 1;
    let skipped = 0;
    while (k >= 0 && skipped < 3 && FILLER.has(before[k])) { k -= 1; skipped += 1; }
    if (termNegated || k < 0 || !NEGATIONS.has(before[k])) return true;
    from = at + 1;
  }
}

// Generic words (yes/no, frequency, sizes) and bare numbers don't say which
// question an answer belongs to, so they don't count when checking other questions.
const GENERIC = new Set(['yes', 'yeah', 'yep', 'haan', 'ha', 'ji', 'sure', 'no', 'nope', 'nahi', 'nahin', 'never', 'none', 'zero', 'dont', 'do not', 'not really', 'always', 'sometimes', 'occasionally', 'daily', 'every day', 'everyday', 'most days', 'all the time', 'weekends', 'few times', 'once a week', 'twice a week', 'i do', 'we do', 'normal', 'regular', 'both', 'mix', 'together', 'average', 'careful', 'a lot', 'quite a lot', 'more than that', 'local', 'board', 'government']);

function scoreOptions(field: Field, text: string, specificOnly: boolean) {
  const said = normalize(text);
  if (said.trim().length < 2) return [];
  return field.options.map((o) => {
    const terms = [o.label.replace(/\(.*?\)/g, ''), ...(KEYWORDS[`${field.key}:${String(o.value)}`] ?? [])]
      .map(normalize)
      .filter((t) => !specificOnly || (!GENERIC.has(t.trim()) && !/^[\d\s]+$/.test(t)));
    const score = terms.reduce((sum, term) => (heard(said, term) ? sum + term.trim().split(' ').length : sum), 0);
    return { o, score };
  });
}

// The options a typed answer most likely means: best-scoring first, at most 3.
// Longer phrases score more, so "petrol car" beats a bare "car".
export function matchOptions(field: Field, text: string): QOption[] {
  const scored = scoreOptions(field, text, false);
  const best = Math.max(0, ...scored.map((x) => x.score));
  if (best === 0) return [];
  return scored.filter((x) => x.score === best).slice(0, 3).map((x) => x.o);
}

// ── Answers that fit a different question ────────────────────────────────────
const TOPIC: Record<string, string> = {
  mode: 'how you travel', kmPerDay: 'how far you travel', unitsKwhPerMonth: 'your electricity units',
  source: 'where your electricity comes from', dietType: 'what you eat', segregatesWaste: 'separating your waste',
  kgPerWeek: 'how much waste you throw out', litersPerDay: 'your water use', shortHaulPerYear: 'flights', longHaulPerYear: 'flights',
};
const topic = (f: Field) => TOPIC[f.key] ?? 'this question';

// A number followed by one of a unit group's words, e.g. "10 km" for distance.
const hasUnit = (text: string, group: UnitGroup) =>
  new RegExp(`\\d\\s*(${Object.keys(UNIT_WORDS).filter((w) => UNIT_WORDS[w].group === group).join('|')})\\b`).test(text.toLowerCase());

// When an answer doesn't fit this question: a message if it clearly fits another
// one ("bus" to the diet question, "10 km" to the travel-mode question), else null.
export function otherQuestionHint(field: Field, text: string): string | null {
  const ownGroup = field.number ? FIELD_UNITS[field.number.unit]?.group : undefined;
  for (const other of FIELDS) {
    if (other.key === field.key || topic(other) === topic(field)) continue;
    const otherGroup = other.number ? FIELD_UNITS[other.number.unit]?.group : undefined;
    const fits = scoreOptions(other, text, true).some((x) => x.score > 0)
      || (!!otherGroup && otherGroup !== ownGroup && otherGroup !== 'count' && hasUnit(text, otherGroup));
    if (fits) {
      // Same topic, later question (e.g. "10 km" while asked how you travel): answer this one first.
      const later = other.category === field.category && FIELDS.indexOf(other) > FIELDS.indexOf(field);
      return later
        ? `That sounds like ${topic(other)}. First, tell me ${topic(field)}.`
        : `That sounds like an answer about ${topic(other)}. This question is about ${topic(field)}.`;
    }
  }
  return null;
}

// ── Replies to "Did you mean…?" ──────────────────────────────────────────────
// A short yes or no (typed or spoken) while Earth Buddy is asking "Did you mean…?".
// "no, I take the metro" is not a plain no: it's left for normal matching.
const YES = new Set(['yes', 'yeah', 'yep', 'yup', 'ya', 'yah', 'haan', 'han', 'ha', 'ji', 'ok', 'okay', 'correct', 'right', 'sure', 'exactly', 'absolutely']);
const NO = new Set(['no', 'nope', 'nah', 'nahi', 'nahin', 'na', 'none', 'neither', 'wrong']);
export function yesOrNo(text: string): 'yes' | 'no' | null {
  const words = normalize(text).trim().split(' ').filter(Boolean);
  if (words.length === 0) return null;
  if (YES.has(words[0]) && words.length <= 4) return 'yes';
  if (NO.has(words[0]) && (words.length <= 2 || ['of these', 'of them', 'not that', 'not this'].includes(words.slice(1).join(' ')))) return 'no';
  return null;
}

// The message when an answer can't be matched to this question at all.
export function noMatchMessage(field: Field): string {
  if (field.number) return `Please enter a number from ${field.number.min.toLocaleString()} to ${field.number.max.toLocaleString()} ${field.number.unit}, or tap an option above.`;
  const examples = field.options.slice(0, 2).map((o) => `“${o.label}”`).join(' or ');
  return `I couldn't match that to this question. Please tap one of the options above${examples ? `, or try words like ${examples}` : ''}.`;
}
