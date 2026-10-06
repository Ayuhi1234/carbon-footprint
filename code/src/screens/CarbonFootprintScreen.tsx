import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf, Info, History, ChevronLeft, ChevronRight, Clock, X, Target, Plus, Lightbulb, Recycle, Calculator, LineChart } from 'lucide-react-native';
import { WebFooter } from '../components/shared/WebFooter';
import { useTheme, makeStyles } from '../theme';
import {
  carbonService, CarbonSummary, CarbonActivity, CarbonAssessment, LoggableActivity, CARBON_CATEGORY_ORDER,
} from '../services/carbon';
import { CARBON_CATEGORIES, LOG_OPTIONS, activityIcon, formatKg, formatDate, showCarbonError } from '../utils/carbon';
import { showAlert } from '../utils/alert';

const GOAL_OPTIONS = [5, 10, 20];

// Layout, cards, banner, action row and sheets deliberately mirror WalletScreen.
export function CarbonFootprintScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  // Pastel category tiles read as glare on dark surfaces; use the raised surface there.
  const tint = (bg: string) => (isDark ? colors.surfaceAlt : bg);
  const [summary, setSummary] = useState<CarbonSummary | null>(null);
  const [latest, setLatest] = useState<CarbonAssessment | null>(null);
  const [activities, setActivities] = useState<CarbonActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [logging, setLogging] = useState<LoggableActivity | null>(null);
  const [savingGoal, setSavingGoal] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [summaryData, assessments, activityData] = await Promise.all([
        carbonService.getSummary().catch(() => null),
        carbonService.getAssessments().catch(() => [] as CarbonAssessment[]),
        carbonService.getActivities().catch(() => [] as CarbonActivity[]),
      ]);
      setSummary(summaryData);
      setLatest(assessments[0] ?? null);
      setActivities(activityData);
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

  // Breakdown: only the categories the backend returned, in the fixed spec order.
  const rows = latest
    ? CARBON_CATEGORY_ORDER
        .map((key) => ({ key, kg: latest.categories.find((c) => c.key === key)?.kgCo2e }))
        .filter((r): r is { key: typeof r.key; kg: number } => typeof r.kg === 'number')
    : [];
  const maxKg = Math.max(0, ...rows.map((r) => r.kg));
  const total = latest?.totalKgPerMonth ?? 0;
  const top = rows.reduce<(typeof rows)[number] | null>((best, r) => (r.kg > (best?.kg ?? 0) ? r : best), null);
  const tip = top ? CARBON_CATEGORIES[top.key].tip : null;
  const level = summary?.level ?? null;

  const handleLog = async (type: LoggableActivity) => {
    if (logging) return;
    setLogging(type);
    try {
      await carbonService.logActivity(type);
      setLogModalVisible(false);
      showAlert('Activity logged', 'Nice one! Your CO₂ saved is updated.');
      await fetchData();
    } catch (error) {
      showCarbonError("Couldn't log activity", error);
    } finally {
      setLogging(null);
    }
  };

  const handleGoal = async (percent: number) => {
    if (savingGoal !== null) return;
    setSavingGoal(percent);
    try {
      await carbonService.setGoal(percent);
      setGoalModalVisible(false);
      showAlert('Goal set', `Aim to cut your footprint by ${percent}% this month.`);
      await fetchData();
    } catch (error) {
      showCarbonError("Couldn't set goal", error);
    } finally {
      setSavingGoal(null);
    }
  };

  const goSchedulePickup = () => {
    setLogModalVisible(false);
    navigation.navigate('SchedulePickup');
  };

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
              {level && (
                <TouchableOpacity style={styles.iconBtn} onPress={() => setLevelModalVisible(true)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Your level">
                  <Info size={18} color="white" />
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
              <Text style={styles.cardLabel}>CO₂ saved</Text>
              {level && (
                <TouchableOpacity style={styles.pill} onPress={() => setLevelModalVisible(true)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${level.name}, level ${level.level}`}>
                  <View style={styles.pillDot} />
                  <Text style={styles.pillText}>{level.name} · Level {level.level}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.bigRow}>
              <Leaf size={40} color="#86efac" />
              <View>
                <Text style={styles.bigValue}>{formatKg(summary?.savedKgLifetime ?? 0)}</Text>
                <Text style={styles.unitTag} numberOfLines={1}>kg CO₂e</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.colsRow}>
              <View style={styles.col}>
                <View style={styles.colLabelRow}>
                  <Leaf size={13} color="#86efac" />
                  <Text style={styles.colLabel}>This month</Text>
                </View>
                <Text style={styles.colValue}>{formatKg(summary?.savedKgThisMonth ?? 0)} kg</Text>
                <Text style={styles.colSub}>CO₂ saved</Text>
              </View>
              <View style={styles.colDivider} />
              <TouchableOpacity style={styles.col} onPress={latest ? openJourney : startAssessment} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={latest ? 'My footprint. Open my carbon journey' : 'Calculate my footprint'}>
                <View style={styles.colLabelRow}>
                  <LineChart size={13} color="#fcd34d" />
                  <Text style={styles.colLabel}>My footprint</Text>
                </View>
                <Text style={styles.colValue}>{latest ? `${formatKg(total)} kg` : '—'}</Text>
                <Text style={styles.colSub}>{latest ? `per month · ${formatDate(latest.createdAt)}` : 'Not calculated yet'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Tip banner — for the biggest category of the latest assessment */}
        {!isLoading && tip && top && (
          <View style={styles.tipBanner}>
            <Lightbulb size={20} color="#0ea5e9" />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipText}>{tip.body}</Text>
            </View>
            <TouchableOpacity
              style={styles.tipBtn}
              onPress={top.key === 'waste' ? () => navigation.navigate('SchedulePickup') : () => setLogModalVisible(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.tipBtnText}>{top.key === 'waste' ? 'Schedule' : 'Log it'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action buttons — same pills as Wallet. Offset is not shown: no backend supports it yet. */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={() => setLogModalVisible(true)} activeOpacity={0.8} accessibilityRole="button">
            <Plus size={18} color="#16a34a" />
            <Text style={[styles.actionLabel, { color: '#16a34a' }]} numberOfLines={1}>Log activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAmber]} onPress={() => setGoalModalVisible(true)} activeOpacity={0.8} accessibilityRole="button">
            <Target size={18} color="#d97706" />
            <Text style={[styles.actionLabel, { color: '#d97706' }]} numberOfLines={1}>Set goal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSky]} onPress={openJourney} activeOpacity={0.8} accessibilityRole="button">
            <History size={18} color="#0ea5e9" />
            <Text style={[styles.actionLabel, { color: '#0ea5e9' }]} numberOfLines={1}>Journey</Text>
          </TouchableOpacity>
        </View>

        {/* Breakdown, or the calculate CTA when there is no assessment yet */}
        <View style={styles.section}>
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
                  <Text style={styles.rowMeta}>Tap through a quick chat about your day · about 4 minutes</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.primaryPill} onPress={startAssessment} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.primaryPillText}>Calculate my footprint</Text>
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
            </View>
          )}
        </View>

        {/* Recent activity — same rows as Wallet transactions */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Recent activity</Text>
          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading" />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading…</Text>
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.stateBox}>
              <History size={48} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>No activity yet.</Text>
              <Text style={styles.emptyHint}>Log a green action or schedule a pickup to see it here.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {activities.map((a) => {
                const ic = activityIcon(a.type);
                return (
                  <View key={a._id} style={styles.rowCard}>
                    <View style={[styles.iconTile, { backgroundColor: tint(ic.bg) }]}>
                      <ic.Icon size={20} color={ic.color} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={styles.rowTitle}>{a.title}</Text>
                      <View style={styles.timeRow}>
                        <Clock size={12} color={colors.textFaint} />
                        <Text style={styles.rowMeta}>{formatDate(a.createdAt)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.rowValue, { color: '#16a34a' }]}>-{formatKg(a.kgCo2e)} kg</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>

      {/* Level — only when the backend provides one */}
      <Modal visible={levelModalVisible && !!level} transparent animationType="fade" onRequestClose={() => setLevelModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLevelModalVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>{level?.name}</Text>
              <TouchableOpacity onPress={() => setLevelModalVisible(false)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Close">
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.levelSub}>Level {level?.level}</Text>
            {level?.nextName ? (
              <>
                <Text style={styles.sheetHint}>Next level: <Text style={{ fontWeight: '800' }}>{level.nextName}</Text></Text>
                {typeof level.progress === 'number' && (
                  <View style={styles.levelTrack} accessible accessibilityLabel={`Progress ${Math.round(level.progress * 100)} percent`}>
                    <View style={[styles.levelFill, { width: `${Math.min(Math.max(level.progress, 0), 1) * 100}%` }]} />
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.sheetHint}>You've reached the top level.</Text>
            )}
            <Text style={styles.levelFooter}>You've saved {formatKg(summary?.savedKgLifetime ?? 0)} kg CO₂e so far.</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Log activity */}
      <Modal visible={logModalVisible} transparent animationType="fade" onRequestClose={() => setLogModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLogModalVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Log a green activity</Text>
            <Text style={styles.sheetHint}>Pick what you did today. We'll work out the CO₂ you saved.</Text>

            {LOG_OPTIONS.map((o) => (
              <TouchableOpacity key={o.type} style={styles.option} onPress={() => handleLog(o.type)} activeOpacity={0.8} disabled={logging !== null} accessibilityRole="button">
                <View style={[styles.optionIcon, { backgroundColor: tint(o.bg) }]}><o.Icon size={22} color={o.color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>{o.title}</Text>
                  <Text style={styles.optionMeta}>{o.meta}</Text>
                </View>
                {logging === o.type ? <ActivityIndicator size="small" color={colors.primary} /> : <ChevronRight size={20} color={colors.textFaint} />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.option} onPress={goSchedulePickup} activeOpacity={0.8} disabled={logging !== null} accessibilityRole="button">
              <View style={[styles.optionIcon, { backgroundColor: tint('#f0fdf4') }]}><Recycle size={22} color="#16a34a" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionName}>Recycled waste</Text>
                <Text style={styles.optionMeta}>Schedule a KarmaVerse pickup</Text>
              </View>
              <ChevronRight size={20} color={colors.textFaint} />
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Set goal — ladder rows like Wallet's streak tiers; the current goal is highlighted */}
      <Modal visible={goalModalVisible} transparent animationType="fade" onRequestClose={() => setGoalModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGoalModalVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Set a monthly goal</Text>
            <Text style={styles.sheetHint}>How much would you like to cut your footprint this month?</Text>

            {GOAL_OPTIONS.map((p) => {
              const active = summary?.goal?.reductionPercent === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.option, active && { backgroundColor: tint('#fffbeb'), borderColor: '#fcd34d' }]}
                  onPress={() => handleGoal(p)}
                  activeOpacity={0.8}
                  disabled={savingGoal !== null}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.optionIcon, { backgroundColor: tint('#fffbeb') }]}><Target size={22} color="#d97706" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionName}>Cut {p}%</Text>
                    <Text style={styles.optionMeta}>{active ? 'Your current goal' : p === 5 ? 'A gentle start' : p === 10 ? 'A steady push' : 'A big stretch'}</Text>
                  </View>
                  {savingGoal === p ? <ActivityIndicator size="small" color="#d97706" /> : <ChevronRight size={20} color={colors.textFaint} />}
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
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, minHeight: 26 },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86efac' },
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
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, marginTop: 3, marginBottom: 5, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  ctaCard: { padding: 14, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, gap: 14 },
  ctaTop: { flexDirection: 'row', alignItems: 'center' },
  primaryPill: { backgroundColor: '#16a34a', borderRadius: 100, paddingVertical: 13, alignItems: 'center' },
  primaryPillText: { color: 'white', fontWeight: '800', fontSize: 14 },

  // Modals — web: centred dialog; native: bottom sheet (same as Wallet)
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center', padding: Platform.OS === 'web' ? 20 : 0 },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0, borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    padding: 22, paddingBottom: Platform.OS === 'web' ? 22 : 34, maxWidth: 560, width: '100%', alignSelf: 'center',
  },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: c.text, marginBottom: 4 },
  sheetHint: { fontSize: 12.5, color: c.textMuted, fontWeight: '600', lineHeight: 18, marginTop: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, marginTop: 12 },
  optionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionName: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 2 },
  optionMeta: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
  levelSub: { fontSize: 13, color: c.primary, fontWeight: '800' },
  levelTrack: { height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, marginTop: 12, overflow: 'hidden' },
  levelFill: { height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  levelFooter: { fontSize: 12.5, color: c.primary, fontWeight: '700', marginTop: 14, textAlign: 'center' },
}));
