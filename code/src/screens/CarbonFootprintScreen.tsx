import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf, History, ChevronLeft, ChevronRight, Target, Plus, Lightbulb, Calculator, LineChart, TrendingDown, TrendingUp, Award, BarChart3 } from 'lucide-react-native';
import { WebFooter } from '../components/shared/WebFooter';
import { useTheme, makeStyles } from '../theme';
import {
  carbonService, CarbonResult, CarbonComparison, CarbonSummary, CarbonApiNotReadyError, CARBON_CATEGORY_ORDER, CarbonCategoryKey,
} from '../services/carbon';
import { CARBON_CATEGORIES, BAND_LABELS, formatKg, formatDate, formatPeriod, showCarbonError } from '../utils/carbon';

// Logging green actions and monthly goals have no backend yet.
const comingSoon = () => showCarbonError('', new CarbonApiNotReadyError());

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
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [latestData, summaryData, session] = await Promise.all([
        carbonService.getLatestResult(),
        carbonService.getSummary(),
        carbonService.getSession(),
      ]);
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
            <TouchableOpacity style={styles.iconBtn} onPress={openJourney} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="My carbon journey">
              <History size={18} color="white" />
            </TouchableOpacity>
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
              <Leaf size={40} color="#86efac" />
              <View>
                <Text style={styles.bigValue}>{latest ? formatKg(total) : '—'}</Text>
                <Text style={styles.unitTag} numberOfLines={1}>{latest ? `kg CO₂e / month${band ? ` · ${band.label}` : ''}` : 'Not calculated yet'}</Text>
              </View>
            </TouchableOpacity>

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
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAmber]} onPress={comingSoon} activeOpacity={0.8} accessibilityRole="button">
            <Target size={18} color="#d97706" />
            <Text style={[styles.actionLabel, { color: '#d97706' }]} numberOfLines={1}>Set goal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSky]} onPress={() => navigation.navigate('CarbonInsights')} activeOpacity={0.8} accessibilityRole="button">
            <BarChart3 size={18} color="#0ea5e9" />
            <Text style={[styles.actionLabel, { color: '#0ea5e9' }]} numberOfLines={1}>Insights</Text>
          </TouchableOpacity>
        </View>

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
                <View style={[styles.iconTile, { backgroundColor: tint('#f0fdf4') }]}><Calculator size={20} color="#16a34a" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.rowTitle}>Find out your footprint</Text>
                  <Text style={styles.rowMeta}>Six quick questions about your day · about 2 minutes</Text>
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
                Calculated {formatDate(latest.createdAt)}{latest.emissionFactorVersion ? ` · emission factors ${latest.emissionFactorVersion}` : ''}
              </Text>
            </View>
          )}
        </View>

        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
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
}));
