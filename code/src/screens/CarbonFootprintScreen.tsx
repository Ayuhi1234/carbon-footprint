import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf, History, ChevronLeft, ChevronRight, Target, Plus, Lightbulb, Calculator, LineChart, TrendingDown, TrendingUp, Award, BarChart3, CheckCircle2, CalendarClock, Share2 } from 'lucide-react-native';
import { WebFooter } from '../components/shared/WebFooter';
import { useTheme, makeStyles } from '../theme';
import {
  carbonService, CarbonResult, CarbonComparison, CarbonSummary, CarbonGoalState, CarbonApiNotReadyError, CARBON_CATEGORY_ORDER, CarbonCategoryKey,
} from '../services/carbon';
import { CARBON_CATEGORIES, BAND_LABELS, formatKg, formatAssessed, formatPeriod, showCarbonError } from '../utils/carbon';
import { showAlert } from '../utils/alert';
import { CarbonDonut, useCountUp } from '../components/carbon/CarbonVisuals';
import { EarthBuddy } from '../components/carbon/EarthBuddy';
import { ShareSheet } from '../components/carbon/ShareSheet';

// Logging green actions has no backend yet.
const comingSoon = () => showCarbonError('', new CarbonApiNotReadyError());

// Results are monthly; after this many days the hub invites a fresh check-in.
const CHECK_IN_DAYS = 30;

const GOAL_OPTIONS = [
  { percent: 5, meta: 'A gentle start' },
  { percent: 10, meta: 'A steady push' },
  { percent: 20, meta: 'A big stretch' },
];

// Layout, cards, banner and action row deliberately mirror WalletScreen.
export function CarbonFootprintScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  // Pastel category tiles read as glare on dark surfaces; use the raised surface there.
  const tint = (bg: string) => (isDark ? colors.surfaceAlt : bg);
  const [latest, setLatest] = useState<CarbonResult | null>(null);
  const [comparison, setComparison] = useState<CarbonComparison | null>(null);
  const [summary, setSummary] = useState<CarbonSummary | null>(null);
  const [inProgress, setInProgress] = useState(false);
  const [goalState, setGoalState] = useState<CarbonGoalState | null>(null);
  const [goalSheet, setGoalSheet] = useState(false);
  const [savingGoal, setSavingGoal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [latestData, summaryData, session, goalData] = await Promise.all([
        carbonService.getLatestResult(),
        carbonService.getSummary(),
        carbonService.getSession(),
        carbonService.getGoal(), // read-only; never POST just to refresh progress
      ]);
      setGoalState(goalData);
      setLatest(latestData?.result ?? null);
      setComparison(latestData?.comparison ?? null);
      setSummary(summaryData);
      setInProgress(!!session?.nextQuestion);
    } catch (error) {
      console.error('Carbon fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchData);
    fetchData();
    return unsubscribe;
  }, [navigation]);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App'));
  const startAssessment = () => navigation.navigate('CarbonAssessment');
  const openJourney = () => navigation.navigate('CarbonJourney');

  const [shareOpen, setShareOpen] = useState(false);
  const shareResult = () => setShareOpen(true);

  // A goal needs a result to start from.
  const openGoalSheet = () => {
    if (!latest) {
      showAlert('Calculate your footprint first', 'Your goal starts from your latest result.');
      return;
    }
    setGoalSheet(true);
  };

  // POST /goal replaces any existing goal and restarts progress from the latest result.
  const handleGoal = async (percent: number) => {
    if (savingGoal !== null) return;
    setSavingGoal(percent);
    try {
      const next = await carbonService.setGoal(percent);
      setGoalState(next);
      setGoalSheet(false);
      showAlert('Goal set', `Aim for ${formatKg(next.goal.targetKgCO2ePerMonth)} kg CO₂e a month.`);
    } catch (error: any) {
      if (error?.response?.status === 404) showAlert('Calculate your footprint first', 'Your goal starts from your latest result.');
      else showCarbonError("Couldn't set your goal", error);
    } finally {
      setSavingGoal(null);
    }
  };

  // Breakdown: only the categories the backend returned, in its fixed order.
  const rows = latest?.breakdown
    ? CARBON_CATEGORY_ORDER
        .map((key) => ({ key, kg: latest.breakdown?.[key] }))
        .filter((r): r is { key: CarbonCategoryKey; kg: number } => typeof r.kg === 'number')
    : [];
  const maxKg = Math.max(0, ...rows.map((r) => r.kg));
  const total = latest?.totalKgCO2ePerMonth ?? 0;
  const top = rows.reduce<(typeof rows)[number] | null>((best, r) => (r.kg > (best?.kg ?? 0) ? r : best), null);
  // The backend's tips aren't tied to a category, so one never goes under a
  // "<category> is your biggest source" title; without one, use the app's tip
  // for the biggest category.
  const tip = latest?.tips?.[0]
    ? { title: 'Tip for you', body: latest.tips[0] }
    : top ? CARBON_CATEGORIES[top.key].tip : null;
  const band = latest?.category ? BAND_LABELS[latest.category] : undefined;
  const shownTotal = useCountUp(total);
  // Monthly habit loop: days since the latest result, and when the next check-in is due.
  const daysSince = latest ? Math.max(0, Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 86400000)) : null;
  const checkInDue = daysSince !== null && daysSince >= CHECK_IN_DAYS;
  const daysLeft = daysSince !== null ? CHECK_IN_DAYS - daysSince : null;

  // What Earth Buddy says in the hero card. Words only; every number comes from the backend.
  const buddySays = !latest
    ? (inProgress ? "You're partway through. Let's finish it together!" : "Hi! Let's find out your footprint together.")
    : goalState?.progress.achieved ? "Goal reached! I'm so proud of you 🎉"
    : comparison?.improved && typeof delta === 'number' && delta < 0 ? `You cut ${formatKg(Math.abs(delta))} kg since last time. Amazing! 🎉`
    : comparison && typeof delta === 'number' && delta > 0 ? "It went up this time. Let's look at where it comes from."
    : checkInDue ? "It's been a month. Shall we check in?"
    : latest.category === 'low' ? 'Your footprint is low. Keep it up! 🌱'
    : latest.category === 'high' ? "Let's bring this down together, one step at a time."
    : 'Nice start! Small changes add up.';
  const delta = comparison?.deltaKgCO2ePerMonth;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 0 : 100 }} showsVerticalScrollIndicator={false}>

        {/* Header — same gradient, padding and radius as Wallet */}
        <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <TouchableOpacity style={styles.iconBtn} onPress={goBack} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back">
                <ChevronLeft size={22} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={2} accessibilityRole="header">My carbon footprint</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {latest && (
                <TouchableOpacity style={styles.iconBtn} onPress={shareResult} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Share my result">
                  <Share2 size={18} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.iconBtn} onPress={openJourney} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="My carbon journey">
                <History size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Glass card */}
          <View style={styles.heroCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>{latest?.periodLabel ? `My footprint · ${formatPeriod(latest.periodLabel)}` : 'My footprint'}</Text>
              {typeof delta === 'number' && (
                <View style={styles.pill} accessible accessibilityLabel={`${formatKg(Math.abs(delta))} kilograms ${delta <= 0 ? 'lower' : 'higher'} than ${formatPeriod(comparison?.previousPeriodLabel) || 'last time'}`}>
                  {delta <= 0 ? <TrendingDown size={13} color="#86efac" /> : <TrendingUp size={13} color="#fca5a5" />}
                  <Text style={styles.pillText}>
                    {delta === 0 ? 'No change' : `${formatKg(Math.abs(delta))} kg ${delta < 0 ? 'lower' : 'higher'}`}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.bigRow} onPress={latest ? openJourney : startAssessment} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={latest ? `${formatKg(total)} kilograms CO2e per month. Open my carbon journey` : 'Calculate my footprint'}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bigValue}>{latest ? formatKg(Math.round(shownTotal * 10) / 10) : '—'}</Text>
                <Text style={styles.unitTag} numberOfLines={2}>{latest ? `kg CO₂e / month${band ? ` · ${band.label}` : ''}` : 'Not calculated yet'}</Text>
              </View>
              <EarthBuddy size={88} wave cheer />
            </TouchableOpacity>

            {/* Earth Buddy's speech bubble, pointing up at the mascot */}
            <View style={styles.speech} accessibilityLiveRegion="polite">
              <View style={styles.speechTail} />
              <Text style={styles.speechText}>{buddySays}</Text>
            </View>

            {latest && daysLeft !== null && (
              <TouchableOpacity
                style={[styles.checkIn, checkInDue && styles.checkInDue]}
                onPress={startAssessment}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={checkInDue ? 'Time for your monthly check-in. Recalculate' : `Next check-in in ${daysLeft} days. Recalculate now`}
              >
                <CalendarClock size={14} color={checkInDue ? '#052e16' : '#86efac'} />
                <Text style={[styles.checkInText, checkInDue && { color: '#052e16' }]}>
                  {checkInDue ? 'Time for your monthly check-in' : daysLeft === 1 ? 'Next check-in tomorrow' : `Next check-in in ${daysLeft} days`}
                </Text>
                <ChevronRight size={14} color={checkInDue ? '#052e16' : '#86efac'} />
              </TouchableOpacity>
            )}

            <View style={styles.cardDivider} />

            <View style={styles.colsRow}>
              <View style={styles.col}>
                <View style={styles.colLabelRow}>
                  <LineChart size={13} color="#fcd34d" />
                  <Text style={styles.colLabel}>Average</Text>
                </View>
                <Text style={styles.colValue}>{summary ? `${formatKg(summary.averageKgCO2ePerMonth)} kg` : '—'}</Text>
                <Text style={styles.colSub}>
                  {summary ? `per month · ${summary.totalAssessments.toLocaleString()} ${summary.totalAssessments === 1 ? 'assessment' : 'assessments'}` : 'No assessments yet'}
                </Text>
              </View>
              <View style={styles.colDivider} />
              <View style={styles.col}>
                <View style={styles.colLabelRow}>
                  <Award size={13} color="#86efac" />
                  <Text style={styles.colLabel}>Best</Text>
                </View>
                <Text style={styles.colValue}>{summary ? `${formatKg(summary.bestKgCO2ePerMonth)} kg` : '—'}</Text>
                <Text style={styles.colSub}>lowest per month</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Unfinished interview — the backend keeps it, so offer to carry on */}
        {!isLoading && inProgress && (
          <TouchableOpacity style={styles.resumeBanner} onPress={startAssessment} activeOpacity={0.8} accessibilityRole="button">
            <Calculator size={20} color="#16a34a" />
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeTitle}>You have an assessment in progress</Text>
              <Text style={styles.resumeText}>Pick up where you left off.</Text>
            </View>
            <ChevronRight size={20} color="#16a34a" />
          </TouchableOpacity>
        )}

        {/* Tip banner — for the biggest category of the latest result */}
        {!isLoading && tip && (
          <View style={styles.tipBanner}>
            <Lightbulb size={20} color="#0ea5e9" />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipText}>{tip.body}</Text>
            </View>
            {top?.key === 'waste' && (
              <TouchableOpacity style={styles.tipBtn} onPress={() => navigation.navigate('SchedulePickup')} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.tipBtnText}>Schedule</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Action buttons — same pills as Wallet */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={comingSoon} activeOpacity={0.8} accessibilityRole="button">
            <Plus size={18} color="#16a34a" />
            <Text style={[styles.actionLabel, { color: '#16a34a' }]} numberOfLines={1}>Log activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAmber]} onPress={openGoalSheet} activeOpacity={0.8} accessibilityRole="button">
            <Target size={18} color="#d97706" />
            <Text style={[styles.actionLabel, { color: '#d97706' }]} numberOfLines={1}>{goalState ? 'My goal' : 'Set goal'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSky]} onPress={() => navigation.navigate('CarbonInsights')} activeOpacity={0.8} accessibilityRole="button">
            <BarChart3 size={18} color="#0ea5e9" />
            <Text style={[styles.actionLabel, { color: '#0ea5e9' }]} numberOfLines={1}>Insights</Text>
          </TouchableOpacity>
        </View>

        {/* Goal progress — from GET /goal; tap to change the goal */}
        {!isLoading && goalState && (
          <TouchableOpacity
            style={styles.goalCard}
            onPress={openGoalSheet}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Goal: cut ${goalState.goal.reductionPercent} percent. ${goalState.progress.achieved ? 'Achieved' : `${Math.round(goalState.progress.progressPercent)} percent of the way`}. Tap to change`}
          >
            <View style={styles.goalTop}>
              {goalState.progress.achieved ? <CheckCircle2 size={20} color="#16a34a" /> : <Target size={20} color="#d97706" />}
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{goalState.progress.achieved ? 'Goal reached!' : `Goal: cut ${goalState.goal.reductionPercent}%`}</Text>
                <Text style={styles.rowMeta}>
                  From {formatKg(goalState.goal.baselineKgCO2ePerMonth)} to {formatKg(goalState.goal.targetKgCO2ePerMonth)} kg a month · now {formatKg(goalState.progress.currentKgCO2ePerMonth)} kg
                </Text>
              </View>
              <Text style={styles.goalPct}>{Math.round(goalState.progress.progressPercent)}%</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(Math.max(goalState.progress.progressPercent, 0), 100)}%` as any, backgroundColor: goalState.progress.achieved ? '#16a34a' : '#d97706' }]} />
            </View>
          </TouchableOpacity>
        )}

        {/* Breakdown, or the calculate CTA when there is no result yet */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Where it comes from</Text>
            {latest && (
              <TouchableOpacity style={styles.linkBtn} onPress={startAssessment} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.linkText}>Recalculate</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading" />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading…</Text>
            </View>
          ) : !latest ? (
            <View style={styles.ctaCard}>
              <View style={styles.ctaTop}>
                <EarthBuddy size={76} wave />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.ctaTitle}>{inProgress ? 'Pick up where you left off' : "What's your carbon footprint?"}</Text>
                  <Text style={styles.rowMeta}>Six quick questions about travel, home, food and more · about 2 minutes</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.primaryPill} onPress={startAssessment} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.primaryPillText}>{inProgress ? 'Carry on' : 'Calculate my footprint'}</Text>
              </TouchableOpacity>
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.stateBox}>
              <Leaf size={48} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>No breakdown yet.</Text>
              <Text style={styles.emptyHint}>Your category details will show here.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              <View style={styles.donutCard}>
                <CarbonDonut breakdown={latest.breakdown ?? {}} total={total} />
                <View style={styles.legend}>
                  {[...rows].sort((a, b) => b.kg - a.kg).map((r) => (
                    <View key={r.key} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: CARBON_CATEGORIES[r.key].color }]} />
                      <Text style={styles.legendLabel} numberOfLines={1}>{CARBON_CATEGORIES[r.key].label}</Text>
                      <Text style={styles.legendPct}>{total > 0 ? Math.round((r.kg / total) * 100) : 0}%</Text>
                    </View>
                  ))}
                </View>
              </View>
              {rows.map((r) => {
                const cat = CARBON_CATEGORIES[r.key];
                const isTop = r.key === top?.key;
                const pct = total > 0 ? Math.round((r.kg / total) * 100) : 0;
                const width = maxKg > 0 ? `${Math.max((r.kg / maxKg) * 100, r.kg > 0 ? 4 : 0)}%` : '0%';
                return (
                  <View key={r.key} style={styles.rowCard} accessible accessibilityLabel={`${cat.label}, ${formatKg(r.kg)} kilograms CO2e, ${pct} percent`}>
                    <View style={[styles.iconTile, { backgroundColor: tint(cat.bg) }]}>
                      <cat.Icon size={20} color={cat.color} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={styles.rowTitle}>{cat.label}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: width as any, backgroundColor: cat.color }]} />
                      </View>
                      <Text style={styles.rowMeta}>{isTop ? `Biggest source · ${pct}% of your footprint` : `${pct}% of your footprint`}</Text>
                    </View>
                    <Text style={[styles.rowValue, { color: isTop ? '#e11d48' : '#d97706' }]}>{formatKg(r.kg)} kg</Text>
                  </View>
                );
              })}
              <Text style={styles.footnote}>
                Calculated {formatAssessed(latest)}{latest.emissionFactorVersion ? ` · emission factors ${latest.emissionFactorVersion}` : ''}
              </Text>
            </View>
          )}
        </View>

        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>

      <ShareSheet result={latest} visible={shareOpen} onClose={() => setShareOpen(false)} />

      {/* Set goal — web: centred dialog; native: bottom sheet (same as Wallet) */}
      <Modal visible={goalSheet} transparent animationType="fade" onRequestClose={() => setGoalSheet(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGoalSheet(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Set a monthly goal</Text>
            <Text style={styles.sheetHint}>
              {goalState
                ? `Choosing a new goal starts your progress again from your latest result (${formatKg(total)} kg a month).`
                : `How much would you like to cut your footprint? You're at ${formatKg(total)} kg a month.`}
            </Text>
            {GOAL_OPTIONS.map((o) => {
              const active = goalState?.goal.reductionPercent === o.percent && !goalState.progress.achieved;
              return (
                <TouchableOpacity
                  key={o.percent}
                  style={[styles.option, active && { borderColor: '#fcd34d', backgroundColor: tint('#fffbeb') }]}
                  onPress={() => handleGoal(o.percent)}
                  disabled={savingGoal !== null}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.optionIcon, { backgroundColor: tint('#fffbeb') }]}><Target size={22} color="#d97706" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionName}>Cut {o.percent}%</Text>
                    <Text style={styles.optionMeta}>{active ? 'Your current goal' : `${o.meta} · about ${formatKg(total * (1 - o.percent / 100))} kg a month`}</Text>
                  </View>
                  {savingGoal === o.percent ? <ActivityIndicator size="small" color="#d97706" /> : <ChevronRight size={20} color={colors.textFaint} />}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },

  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, maxWidth: 800, width: '100%', alignSelf: 'center', gap: 10 },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerTitle: { fontSize: 26, lineHeight: 30, fontWeight: '900', color: 'white', flexShrink: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  heroCard: {
    borderRadius: 24, padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    maxWidth: 800, width: '100%', alignSelf: 'center',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, minHeight: 26, gap: 8 },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 0.3, flexShrink: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  pillText: { color: 'white', fontSize: 11, fontWeight: '800' },
  bigRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigValue: { fontSize: 44, fontWeight: '900', color: 'white', letterSpacing: -1 },
  unitTag: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginTop: -2, flexShrink: 0 },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 16 },
  colsRow: { flexDirection: 'row', alignItems: 'stretch' },
  col: { flex: 1 },
  colDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 14 },
  colLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  colLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  colValue: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  colSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', marginTop: 4 },

  resumeBanner: {
    marginTop: 16, marginHorizontal: 16, padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.primarySoft, borderWidth: 1, borderColor: '#86efac', maxWidth: 800, width: '100%', alignSelf: 'center',
  },
  resumeTitle: { color: c.text, fontSize: 13, fontWeight: '900', marginBottom: 2 },
  resumeText: { color: c.textMuted, fontSize: 12, fontWeight: '600' },

  tipBanner: {
    marginTop: 16, marginHorizontal: 16, padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', maxWidth: 800, width: '100%', alignSelf: 'center',
  },
  tipTitle: { color: '#0369a1', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  tipText: { color: '#0c4a6e', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  tipBtn: { backgroundColor: '#0ea5e9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, minWidth: 76, alignItems: 'center' },
  tipBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },

  actionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 100, borderWidth: 1.5, backgroundColor: c.surface },
  actionBtnGreen: { borderColor: '#86efac' },
  actionBtnAmber: { borderColor: '#fcd34d' },
  actionBtnSky: { borderColor: '#bae6fd' },
  actionLabel: { fontWeight: '800', fontSize: 13, flexShrink: 1 },

  section: { paddingHorizontal: 16, marginTop: 28, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: c.text },
  linkBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  linkText: { fontSize: 12, color: c.primary, fontWeight: '600' },
  stateBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: c.textFaint, marginTop: 12, fontWeight: '600' },
  emptyHint: { color: c.textFaint, fontSize: 12, marginTop: 4, textAlign: 'center' },

  list: { gap: 10 },
  rowCard: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  iconTile: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1, marginLeft: 12, marginRight: 10 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: c.text, marginBottom: 3 },
  rowMeta: { fontSize: 11, color: c.textMuted, fontWeight: '500' },
  rowValue: { fontSize: 15, fontWeight: '900' },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, marginTop: 3, marginBottom: 5, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  footnote: { fontSize: 12, color: c.textFaint, marginTop: 6, textAlign: 'center' },

  ctaCard: { padding: 14, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, gap: 14 },
  ctaTop: { flexDirection: 'row', alignItems: 'center' },
  primaryPill: { backgroundColor: '#16a34a', borderRadius: 100, paddingVertical: 13, alignItems: 'center' },
  primaryPillText: { color: 'white', fontWeight: '800', fontSize: 14 },

  checkIn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 14, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.12)' },
  checkInDue: { backgroundColor: '#fcd34d' },
  checkInText: { color: 'white', fontSize: 12, fontWeight: '800' },

  donutCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 18, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border },
  legend: { flexGrow: 1, flexBasis: 160, maxWidth: 320, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: c.text },
  legendPct: { fontSize: 13, fontWeight: '800', color: c.textMuted, fontVariant: ['tabular-nums'] },

  speech: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 13 },
  speechTail: { position: 'absolute', top: -6, right: 34, width: 12, height: 12, backgroundColor: 'rgba(255,255,255,0.95)', transform: [{ rotate: '45deg' }] },
  speechText: { color: '#14532d', fontSize: 13, fontWeight: '800', lineHeight: 18 },
  ctaTitle: { fontSize: 16, fontWeight: '900', color: c.text, marginBottom: 3 },

  goalCard: { marginTop: 16, marginHorizontal: 16, padding: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, maxWidth: 800, width: '100%', alignSelf: 'center', gap: 8 },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalPct: { fontSize: 16, fontWeight: '900', color: c.text },

  // Modal — web: centred dialog; native: bottom sheet (same as Wallet)
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center', padding: Platform.OS === 'web' ? 20 : 0 },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0, borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    padding: 22, paddingBottom: Platform.OS === 'web' ? 22 : 34, maxWidth: 560, width: '100%', alignSelf: 'center',
  },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: c.text, marginBottom: 4 },
  sheetHint: { fontSize: 12.5, color: c.textMuted, fontWeight: '600', lineHeight: 18, marginTop: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, marginTop: 12 },
  optionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionName: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 2 },
  optionMeta: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
}));
