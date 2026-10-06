import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, LineChart, TrendingDown, TrendingUp, History, Clock } from 'lucide-react-native';
import { WebFooter } from '../components/shared/WebFooter';
import { useTheme, makeStyles } from '../theme';
import { carbonService, CarbonAssessment } from '../services/carbon';
import { formatKg, formatDate } from '../utils/carbon';

// Percentage change between two stored results — display only; the results
// themselves are calculated and stored by the backend and never edited here.
const pctChange = (current: number, previous: number) => (previous > 0 ? Math.round(((current - previous) / previous) * 100) : null);

function ChangeText({ pct, light }: { pct: number | null; light?: boolean }) {
  const { colors } = useTheme();
  if (pct === null) return null;
  const down = pct <= 0;
  const color = light ? 'white' : down ? colors.success : colors.danger;
  const Icon = down ? TrendingDown : TrendingUp;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon size={13} color={color} />
      <Text style={{ color, fontSize: 12, fontWeight: '800' }}>{pct === 0 ? 'No change' : `${Math.abs(pct)}% ${down ? 'lower' : 'higher'}`}</Text>
    </View>
  );
}

export function CarbonJourneyScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  // Pastel category tiles read as glare on dark surfaces; use the raised surface there.
  const tint = (bg: string) => (isDark ? colors.surfaceAlt : bg);
  const [assessments, setAssessments] = useState<CarbonAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [history] = await Promise.all([
        carbonService.getAssessments().catch(() => [] as CarbonAssessment[]),
      ]);
      setAssessments(history);
    } catch (error) {
      console.error('Carbon journey fetch error:', error);
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
  const calculate = () => navigation.navigate('CarbonAssessment');

  // Newest first from the API.
  const current = assessments[0];
  const previous = assessments[1];
  const first = assessments[assessments.length - 1];
  const vsPrevious = current && previous ? pctChange(current.totalKgPerMonth, previous.totalKgPerMonth) : null;
  const vsFirst = current && first && first !== current ? pctChange(current.totalKgPerMonth, first.totalKgPerMonth) : null;

  const trend = assessments.slice(0, 6).reverse(); // oldest → newest
  const trendMax = Math.max(0, ...trend.map((a) => a.totalKgPerMonth));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 0 : 100 }} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
          <View style={styles.titleRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={goBack} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back">
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">My carbon journey</Text>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>Current footprint</Text>
              {vsPrevious !== null && (
                <View style={styles.pill}>
                  <ChangeText pct={vsPrevious} light />
                </View>
              )}
            </View>
            <View style={styles.bigRow}>
              <LineChart size={40} color="#86efac" />
              <View>
                <Text style={styles.bigValue}>{current ? formatKg(current.totalKgPerMonth) : '—'}</Text>
                <Text style={styles.unitTag}>kg CO₂e / month</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.colsRow}>
              <View style={styles.col}>
                <Text style={styles.colLabel}>Previous</Text>
                <Text style={styles.colValue}>{previous ? `${formatKg(previous.totalKgPerMonth)} kg` : '—'}</Text>
                <Text style={styles.colSub}>{previous ? formatDate(previous.createdAt) : 'No earlier result'}</Text>
              </View>
              <View style={styles.colDivider} />
              <View style={styles.col}>
                <Text style={styles.colLabel}>Since first</Text>
                <Text style={styles.colValue}>{vsFirst !== null ? `${vsFirst > 0 ? '+' : ''}${vsFirst}%` : '—'}</Text>
                <Text style={styles.colSub}>{first && first !== current ? `First on ${formatDate(first.createdAt)}` : `${assessments.length.toLocaleString()} ${assessments.length === 1 ? 'assessment' : 'assessments'}`}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {isLoading ? (
          <View style={styles.section}>
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading" />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading…</Text>
            </View>
          </View>
        ) : assessments.length === 0 ? (
          <View style={styles.section}>
            <View style={styles.stateBox}>
              <History size={48} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>No assessments yet.</Text>
              <Text style={styles.emptyHint}>Calculate your footprint to start your journey.</Text>
              <TouchableOpacity style={[styles.primaryPill, { marginTop: 20, paddingHorizontal: 24 }]} onPress={calculate} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.primaryPillText}>Calculate my footprint</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Trend — simple bars, oldest to newest */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Monthly trend</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CarbonInsights')} activeOpacity={0.8} accessibilityRole="button" style={{ paddingVertical: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>See all insights →</Text>
                </TouchableOpacity>
              </View>
              {trend.length < 2 ? (
                <View style={[styles.rowCard, { justifyContent: 'center' }]}>
                  <Text style={styles.rowMeta}>Calculate again later to see how your footprint changes.</Text>
                </View>
              ) : (
                <View
                  style={[styles.rowCard, styles.chartCard]}
                  accessible
                  accessibilityLabel={`Footprint trend: ${trend.map((a) => `${formatDate(a.createdAt)} ${formatKg(a.totalKgPerMonth)} kilograms`).join(', ')}`}
                >
                  {trend.map((a, i) => {
                    const latest = i === trend.length - 1;
                    const h = trendMax > 0 ? Math.max((a.totalKgPerMonth / trendMax) * 110, 6) : 6;
                    return (
                      <View key={a._id} style={styles.barCol}>
                        <Text style={[styles.barValue, latest && { color: colors.text }]}>{formatKg(a.totalKgPerMonth)}</Text>
                        <View style={[styles.bar, { height: h, backgroundColor: colors.primary, opacity: latest ? 1 : 0.35 }]} />
                        <Text style={styles.barLabel} numberOfLines={1}>
                          {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short' })}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* History — same rows as Wallet transactions. Records are read-only. */}
            <View style={[styles.section, { marginBottom: 32 }]}>
              <Text style={styles.sectionTitle}>All assessments</Text>
              <View style={styles.list}>
                {assessments.map((a, i) => {
                  const older = assessments[i + 1];
                  const pct = older ? pctChange(a.totalKgPerMonth, older.totalKgPerMonth) : null;
                  return (
                    <View key={a._id} style={styles.rowCard}>
                      <View style={[styles.iconTile, { backgroundColor: tint('#f0fdf4') }]}>
                        <LineChart size={20} color="#16a34a" />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowTitle}>{formatKg(a.totalKgPerMonth)} kg CO₂e / month</Text>
                        <View style={styles.timeRow}>
                          <Clock size={12} color={colors.textFaint} />
                          <Text style={styles.rowMeta}>{formatDate(a.createdAt)}</Text>
                        </View>
                      </View>
                      {older ? <ChangeText pct={pct} /> : <Text style={styles.firstTag}>First</Text>}
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity style={[styles.primaryPill, { marginTop: 16 }]} onPress={calculate} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.primaryPillText}>Calculate again</Text>
              </TouchableOpacity>
              <Text style={styles.footnote}>Past results never change. Each new calculation is saved as a new record.</Text>
            </View>
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
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, minHeight: 26 },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  bigRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigValue: { fontSize: 44, fontWeight: '900', color: 'white', letterSpacing: -1 },
  unitTag: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginTop: -2 },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 16 },
  colsRow: { flexDirection: 'row', alignItems: 'stretch' },
  col: { flex: 1 },
  colDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 14 },
  colLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  colValue: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  colSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', marginTop: 4 },

  section: { paddingHorizontal: 16, marginTop: 28, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: c.text, marginBottom: 16 },
  stateBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: c.textFaint, marginTop: 12, fontWeight: '600' },
  emptyHint: { color: c.textFaint, fontSize: 12, marginTop: 4, textAlign: 'center' },

  list: { gap: 10 },
  rowCard: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  iconTile: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1, marginLeft: 12, marginRight: 10 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: c.text, marginBottom: 3 },
  rowMeta: { fontSize: 11, color: c.textMuted, fontWeight: '500' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  firstTag: { fontSize: 12, fontWeight: '800', color: c.textMuted },

  chartCard: { alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 18, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', maxWidth: 64 },
  barValue: { fontSize: 11, fontWeight: '800', color: c.textMuted, marginBottom: 4 },
  bar: { width: '70%', maxWidth: 36, borderRadius: 6 },
  barLabel: { fontSize: 11, fontWeight: '600', color: c.textFaint, marginTop: 6 },

  primaryPill: { backgroundColor: '#16a34a', borderRadius: 100, paddingVertical: 13, alignItems: 'center' },
  primaryPillText: { color: 'white', fontWeight: '800', fontSize: 14 },
  footnote: { fontSize: 12, color: c.textFaint, marginTop: 12, textAlign: 'center' },
}));
