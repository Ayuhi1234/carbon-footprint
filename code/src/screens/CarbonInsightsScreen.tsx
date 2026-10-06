import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, StatusBar, ActivityIndicator, Platform, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { ChevronLeft, BarChart3, TrendingDown, TrendingUp, Table2, Target, Minus } from 'lucide-react-native';
import { WebFooter } from '../components/shared/WebFooter';
import { useTheme, makeStyles } from '../theme';
import { carbonService, CarbonAssessment, CarbonSummary, CarbonCategoryKey, CARBON_CATEGORY_ORDER } from '../services/carbon';
import { CARBON_CATEGORIES, formatKg, formatDate } from '../utils/carbon';

// Carbon insights — the visual dashboard. Every number here comes from stored
// assessment results and the CO₂-saved summary; the app only formats and compares
// them (no carbon calculation). Charts follow the app's chart rules: one hue,
// thin marks, hairline grid, selective labels, tap/focus readouts, and a table view.

type Range = '3m' | '6m' | '1y' | 'all';
const RANGES: { key: Range; label: string; months: number | null }[] = [
  { key: '3m', label: '3 months', months: 3 },
  { key: '6m', label: '6 months', months: 6 },
  { key: '1y', label: '1 year', months: 12 },
  { key: 'all', label: 'All', months: null },
];

const pctChange = (current: number, previous: number) => (previous > 0 ? Math.round(((current - previous) / previous) * 100) : null);
const monthLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short' });
const catKg = (a: CarbonAssessment | undefined, key: CarbonCategoryKey) => a?.categories.find((c) => c.key === key)?.kgCo2e;
const SVG_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;

// Clean axis ticks: 0, step, 2·step… with the top tick just above the max.
function niceScale(max: number) {
  const steps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const step = steps.find((s) => (max * 1.15) / s <= 3) ?? 1000;
  const top = Math.max(step, Math.ceil((max * 1.15) / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

// ── Change chip: down is good (green), up is bad (red), with arrow + sign, never colour alone ──
function Delta({ pct, suffix = 'vs last time' }: { pct: number | null; suffix?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (pct === null) return <Text style={styles.deltaMuted}>No earlier result</Text>;
  const down = pct <= 0;
  const color = pct === 0 ? colors.textMuted : down ? colors.success : colors.danger;
  const Icon = pct === 0 ? Minus : down ? TrendingDown : TrendingUp;
  return (
    <View style={styles.deltaRow}>
      <Icon size={13} color={color} />
      <Text style={[styles.deltaText, { color }]}>{pct === 0 ? 'No change' : `${Math.abs(pct)}% ${down ? 'lower' : 'higher'}`}</Text>
      <Text style={styles.deltaMuted}> {suffix}</Text>
    </View>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

// ── Footprint over time: single-series line + 10% area, dots with a surface ring ──
function TrendChart({ points, goal }: { points: CarbonAssessment[]; goal: number | null }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState(points.length - 1);
  useEffect(() => setSel(points.length - 1), [points.length]);

  const H = 170, X_BAND = 24, PAD_L = 36, PAD_R = 16, PAD_T = 22;
  const max = Math.max(...points.map((p) => p.totalKgPerMonth), goal ?? 0);
  const { top, ticks } = niceScale(max);
  const plotW = Math.max(w - PAD_L - PAD_R, 1);
  const x = (i: number) => PAD_L + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD_T + (1 - v / top) * (H - PAD_T);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.totalKgPerMonth)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const every = Math.ceil(points.length / 6); // at most ~6 month labels
  const s = points[sel];

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      {/* Readout — the selected point (latest by default); tap or focus a point to change it */}
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <Text style={styles.readoutValue}>{s ? `${formatKg(s.totalKgPerMonth)} kg` : ''}</Text>
        <Text style={styles.readoutLabel}>{s ? ` CO₂e / month · ${formatDate(s.createdAt)}` : ''}</Text>
      </View>
      {w > 0 && (
        <View style={{ height: H + X_BAND }}>
          <Svg width={w} height={H + X_BAND}>
            {ticks.map((t) => (
              <React.Fragment key={t}>
                <Line x1={PAD_L} x2={w - PAD_R} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
                <SvgText fontFamily={SVG_FONT} x={PAD_L - 8} y={y(t) + 4} fontSize={11} fill={colors.textFaint} textAnchor="end">{t.toLocaleString()}</SvgText>
              </React.Fragment>
            ))}
            {goal !== null && (
              <>
                <Line x1={PAD_L} x2={w - PAD_R} y1={y(goal)} y2={y(goal)} stroke={colors.warning} strokeWidth={1.5} strokeDasharray="5 4" />
                <SvgText fontFamily={SVG_FONT} x={PAD_L + 6} y={y(goal) + 15} fontSize={11} fontWeight="700" fill={colors.textMuted} textAnchor="start">Goal {Math.round(goal).toLocaleString()} kg</SvgText>
              </>
            )}
            {points.length > 1 && <Path d={area} fill={colors.primary} fillOpacity={0.1} />}
            {points.length > 1 && <Path d={line} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
            {s && <Line x1={x(sel)} x2={x(sel)} y1={PAD_T} y2={y(0)} stroke={colors.borderStrong} strokeWidth={1} />}
            {points.map((p, i) => (
              <Circle key={p._id} cx={x(i)} cy={y(p.totalKgPerMonth)} r={i === sel ? 6 : 4} fill={colors.primary} stroke={colors.surface} strokeWidth={2} />
            ))}
            {points.map((p, i) => (i % every === 0 || i === points.length - 1) && (
              <SvgText fontFamily={SVG_FONT} key={`x${p._id}`} x={x(i)} y={H + 16} fontSize={11} fontWeight={i === sel ? '700' : '400'} fill={i === sel ? colors.text : colors.textFaint} textAnchor="middle">{monthLabel(p.createdAt)}</SvgText>
            ))}
          </Svg>
          {/* Hit targets: bigger than the dots, focusable on web, announced on native */}
          {points.map((p, i) => (
            <Pressable
              key={`hit${p._id}`}
              onPress={() => setSel(i)}
              onFocus={() => setSel(i)}
              accessibilityRole="button"
              accessibilityLabel={`${formatDate(p.createdAt)}: ${formatKg(p.totalKgPerMonth)} kilograms CO2e per month`}
              style={{ position: 'absolute', left: x(i) - 18, top: y(p.totalKgPerMonth) - 18, width: 36, height: 36, borderRadius: 18 }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Where it comes from: horizontal bars, one hue; the biggest source emphasised ──
function CategoryBars({ latest }: { latest: CarbonAssessment }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const rows = CARBON_CATEGORY_ORDER
    .map((key) => ({ key, kg: catKg(latest, key) }))
    .filter((r): r is { key: CarbonCategoryKey; kg: number } => typeof r.kg === 'number')
    .sort((a, b) => b.kg - a.kg);
  const max = Math.max(0, ...rows.map((r) => r.kg));
  const total = latest.totalKgPerMonth;
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r, i) => {
        const pct = total > 0 ? Math.round((r.kg / total) * 100) : 0;
        return (
          <View key={r.key} style={styles.barRow} accessible accessibilityLabel={`${CARBON_CATEGORIES[r.key].label}: ${formatKg(r.kg)} kilograms, ${pct} percent`}>
            <Text style={styles.barLabel} numberOfLines={1}>{CARBON_CATEGORIES[r.key].label}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${max > 0 ? Math.max((r.kg / max) * 100, 2) : 0}%`, backgroundColor: colors.primary, opacity: i === 0 ? 1 : 0.45 }]} />
            </View>
            <Text style={styles.barValue}>{formatKg(r.kg)} kg <Text style={styles.barPct}>· {pct}%</Text></Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Small multiples: each category's own trend (no shared colours to learn) ──
function Sparkline({ values, width, height }: { values: number[]; width: number; height: number }) {
  const { colors } = useTheme();
  if (values.length < 2 || width <= 0) return <View style={{ height }} />;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const x = (i: number) => 4 + (i / (values.length - 1)) * (width - 8);
  const y = (v: number) => 4 + (1 - (v - min) / span) * (height - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const last = values.length - 1;
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={colors.textFaint} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(last)} cy={y(values[last])} r={4} fill={colors.primary} stroke={colors.surface} strokeWidth={2} />
    </Svg>
  );
}

function MultipleCell({ k, points }: { k: CarbonCategoryKey; points: CarbonAssessment[] }) {
  const styles = useStyles();
  const [cellW, setCellW] = useState(0);
  const latest = points[points.length - 1];
  const prev = points[points.length - 2];
  const series = points.map((p) => catKg(p, k)).filter((v): v is number => typeof v === 'number');
  const now = catKg(latest, k) as number;
  const before = catKg(prev, k);
  const pct = typeof before === 'number' ? pctChange(now, before) : null;
  return (
    <View
      style={styles.multiCell}
      onLayout={(e) => setCellW(e.nativeEvent.layout.width - 28)}
      accessible
      accessibilityLabel={`${CARBON_CATEGORIES[k].label}: ${formatKg(now)} kilograms${pct !== null ? (pct === 0 ? ', no change' : `, ${Math.abs(pct)} percent ${pct < 0 ? 'lower' : 'higher'} than last time`) : ''}`}
    >
      <Text style={styles.multiLabel}>{CARBON_CATEGORIES[k].label}</Text>
      <Text style={styles.multiValue}>{formatKg(now)} kg</Text>
      <Sparkline values={series} width={cellW} height={36} />
      <Delta pct={pct} suffix="" />
    </View>
  );
}

function CategoryMultiples({ points }: { points: CarbonAssessment[] }) {
  const styles = useStyles();
  const latest = points[points.length - 1];
  const keys = CARBON_CATEGORY_ORDER.filter((k) => typeof catKg(latest, k) === 'number');
  return (
    <View style={styles.multiGrid}>
      {keys.map((k) => <MultipleCell key={k} k={k} points={points} />)}
    </View>
  );
}

export function CarbonInsightsScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [assessments, setAssessments] = useState<CarbonAssessment[]>([]);
  const [summary, setSummary] = useState<CarbonSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState<Range>('6m');
  const [showTable, setShowTable] = useState(false);

  const fetchData = async () => {
    try {
      const [history, summaryData] = await Promise.all([
        carbonService.getAssessments().catch(() => [] as CarbonAssessment[]),
        carbonService.getSummary().catch(() => null),
      ]);
      setAssessments(history);
      setSummary(summaryData);
    } catch (error) {
      console.error('Carbon insights fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchData);
    fetchData();
    return unsubscribe;
  }, [navigation]);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('CarbonFootprint'));

  // Oldest → newest, limited to the chosen range. The filter scopes everything below it.
  const points = useMemo(() => {
    const months = RANGES.find((r) => r.key === range)?.months ?? null;
    const from = months ? new Date(new Date().setMonth(new Date().getMonth() - months)).getTime() : 0;
    return [...assessments].reverse().filter((a) => new Date(a.createdAt).getTime() >= from);
  }, [assessments, range]);

  const latest = assessments[0];
  const previous = assessments[1];
  const avg = points.length ? points.reduce((s, p) => s + p.totalKgPerMonth, 0) / points.length : 0;
  const lowest = points.reduce<CarbonAssessment | null>((lo, p) => (!lo || p.totalKgPerMonth < lo.totalKgPerMonth ? p : lo), null);
  const goalPct = summary?.goal?.reductionPercent;
  const goal = goalPct && previous ? previous.totalKgPerMonth * (1 - goalPct / 100) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 0 : 100 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
          <View style={styles.titleRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={goBack} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back">
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">Carbon insights</Text>
          </View>
          {/* Hero figure — the one number this view leads with */}
          <View style={styles.heroCard}>
            <Text style={styles.cardLabel}>Current footprint</Text>
            <View style={styles.bigRow}>
              <BarChart3 size={40} color="#86efac" />
              <View>
                <Text style={styles.bigValue}>{latest ? formatKg(latest.totalKgPerMonth) : '—'}</Text>
                <Text style={styles.unitTag}>kg CO₂e / month</Text>
              </View>
            </View>
            <Text style={styles.heroSub}>
              {latest && previous
                ? (() => { const p = pctChange(latest.totalKgPerMonth, previous.totalKgPerMonth); return p === null ? '' : p === 0 ? 'Same as last time' : `${Math.abs(p)}% ${p < 0 ? 'lower' : 'higher'} than last time (${formatKg(previous.totalKgPerMonth)} kg)`; })()
                : latest ? `Calculated ${formatDate(latest.createdAt)}` : 'No footprint calculated yet'}
            </Text>
          </View>
        </LinearGradient>

        {isLoading ? (
          <View style={styles.section}>
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading" />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading…</Text>
            </View>
          </View>
        ) : !latest ? (
          <View style={styles.section}>
            <View style={styles.stateBox}>
              <BarChart3 size={48} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>No insights yet.</Text>
              <Text style={styles.emptyHint}>Calculate your footprint to see your charts here.</Text>
              <TouchableOpacity style={[styles.primaryPill, { marginTop: 20, paddingHorizontal: 24 }]} onPress={() => navigation.navigate('CarbonAssessment')} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.primaryPillText}>Calculate my footprint</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* One filter row, above everything it scopes */}
            <View style={styles.filterRow} accessibilityRole="tablist">
              {RANGES.map((r) => {
                const on = r.key === range;
                return (
                  <TouchableOpacity key={r.key} style={[styles.filterPill, on && styles.filterPillOn]} onPress={() => setRange(r.key)} activeOpacity={0.8} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                    <Text style={[styles.filterText, on && styles.filterTextOn]}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* KPI row */}
            <View style={styles.tiles}>
              <StatTile label="Average" value={`${formatKg(avg)} kg`} sub={`per month · ${points.length.toLocaleString()} ${points.length === 1 ? 'result' : 'results'}`} />
              <StatTile label="Lowest" value={lowest ? `${formatKg(lowest.totalKgPerMonth)} kg` : '—'} sub={lowest ? formatDate(lowest.createdAt) : undefined} />
              <StatTile label="CO₂ saved" value={`${formatKg(summary?.savedKgLifetime ?? 0)} kg`} sub="from green actions" />
            </View>

            {/* Footprint over time */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Footprint over time</Text>
                <TouchableOpacity style={styles.linkBtn} onPress={() => setShowTable((v) => !v)} activeOpacity={0.8} accessibilityRole="button">
                  <Table2 size={14} color={colors.primary} />
                  <Text style={styles.linkText}>{showTable ? 'View as chart' : 'View as table'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.card}>
                {showTable ? (
                  <View accessibilityRole="list">
                    <View style={[styles.tr, styles.trHead]}>
                      <Text style={[styles.th, { flex: 1.4 }]}>Date</Text>
                      <Text style={[styles.th, styles.num]}>kg CO₂e / month</Text>
                      <Text style={[styles.th, styles.num]}>Change</Text>
                    </View>
                    {[...points].reverse().map((p, i, arr) => {
                      const older = arr[i + 1];
                      const pct = older ? pctChange(p.totalKgPerMonth, older.totalKgPerMonth) : null;
                      return (
                        <View key={p._id} style={styles.tr}>
                          <Text style={[styles.td, { flex: 1.4 }]}>{formatDate(p.createdAt)}</Text>
                          <Text style={[styles.td, styles.num]}>{formatKg(p.totalKgPerMonth)}</Text>
                          <Text style={[styles.td, styles.num]}>{pct === null ? '—' : `${pct > 0 ? '+' : ''}${pct}%`}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : points.length < 2 ? (
                  <Text style={styles.cardNote}>Calculate again later to see how your footprint changes over time.</Text>
                ) : (
                  <TrendChart points={points} goal={goal} />
                )}
                {goal !== null && !showTable && points.length >= 2 && (
                  <View style={styles.goalNote}>
                    <Target size={13} color={colors.warning} />
                    <Text style={styles.cardNote}>Your goal: {goalPct}% below your previous result.</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Where it comes from — latest result */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Where it comes from</Text>
              <Text style={styles.sectionSub}>Latest result · {formatDate(latest.createdAt)}</Text>
              <View style={styles.card}>
                <CategoryBars latest={latest} />
              </View>
            </View>

            {/* Each area's trend */}
            {points.length >= 2 && (
              <View style={[styles.section, { marginBottom: 32 }]}>
                <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>How each area is changing</Text>
                <Text style={styles.sectionSub}>Change vs your previous result</Text>
                <CategoryMultiples points={points} />
              </View>
            )}
          </>
        )}

        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },

  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: 'white', flexShrink: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderRadius: 24, padding: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', maxWidth: 800, width: '100%', alignSelf: 'center' },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 0.3, marginBottom: 14 },
  bigRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigValue: { fontSize: 44, fontWeight: '900', color: 'white', letterSpacing: -1 },
  unitTag: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginTop: -2 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, fontWeight: '700', marginTop: 14 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 20, maxWidth: 800, width: '100%', alignSelf: 'center', flexWrap: 'wrap' },
  filterPill: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 100, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, minHeight: 40, justifyContent: 'center' },
  filterPillOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
  filterText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  filterTextOn: { color: c.primary, fontWeight: '800' },

  tiles: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  tile: { flex: 1, padding: 12, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  tileLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted },
  tileValue: { fontSize: 18, fontWeight: '900', color: c.text, marginTop: 4, letterSpacing: -0.3 },
  tileSub: { fontSize: 10.5, fontWeight: '600', color: c.textFaint, marginTop: 2 },

  section: { paddingHorizontal: 16, marginTop: 28, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: c.text },
  sectionSub: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 12 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, minHeight: 32 },
  linkText: { fontSize: 12, color: c.primary, fontWeight: '700' },
  card: { padding: 16, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardNote: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
  goalNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },

  readout: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6, minHeight: 24 },
  readoutValue: { fontSize: 18, fontWeight: '900', color: c.text },
  readoutLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 92, fontSize: 13, fontWeight: '700', color: c.text },
  barTrack: { flex: 1, height: 12, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 12, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  barValue: { minWidth: 92, textAlign: 'right', fontSize: 13, fontWeight: '800', color: c.text, fontVariant: ['tabular-nums'] },
  barPct: { fontWeight: '600', color: c.textMuted },

  multiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  multiCell: { flexGrow: 1, flexBasis: '46%', padding: 14, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, gap: 4 },
  multiLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted },
  multiValue: { fontSize: 17, fontWeight: '900', color: c.text },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  deltaText: { fontSize: 12, fontWeight: '800' },
  deltaMuted: { fontSize: 11.5, fontWeight: '600', color: c.textFaint },

  tr: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  trHead: { paddingTop: 0 },
  th: { fontSize: 11.5, fontWeight: '800', color: c.textMuted },
  td: { fontSize: 13, fontWeight: '600', color: c.text },
  num: { flex: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },

  stateBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: c.textFaint, marginTop: 12, fontWeight: '600' },
  emptyHint: { color: c.textFaint, fontSize: 12, marginTop: 4, textAlign: 'center' },
  primaryPill: { backgroundColor: '#16a34a', borderRadius: 100, paddingVertical: 13, alignItems: 'center' },
  primaryPillText: { color: 'white', fontWeight: '800', fontSize: 14 },
}));
