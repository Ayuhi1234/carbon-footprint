import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, Animated, Easing, Platform, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowRight, CalendarClock, Leaf } from 'lucide-react-native';
import { makeStyles } from '../../theme';
import { carbonService, CarbonResult } from '../../services/carbon';
import { BAND_LABELS, formatKg } from '../../utils/carbon';
import { EarthBuddy } from './EarthBuddy';
import { useCountUp } from './CarbonVisuals';

const CHECK_IN_DAYS = 30;
const nativeDriver = Platform.OS !== 'web';
const run = (v: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.sin)) =>
  Animated.timing(v, { toValue, duration, easing, useNativeDriver: nativeDriver });

// Where the drifting leaves start (fractions of the mascot area), how big they
// are and when each one starts, so they never move in lockstep.
const LEAVES = [
  { x: 0.18, size: 14, delay: 0 },
  { x: 0.62, size: 11, delay: 1100 },
  { x: 0.4, size: 16, delay: 2300 },
  { x: 0.82, size: 12, delay: 3300 },
  { x: 0.05, size: 10, delay: 4200 },
];

// One leaf that floats up from the bottom of the mascot area, sways, spins a
// little and fades out, then starts again.
function DriftingLeaf({ x, size, delay, area }: { x: number; size: number; delay: number; area: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(t, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: nativeDriver }),
      Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: nativeDriver }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute', bottom: 6, left: x * area,
        opacity: t.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.75, 0.5, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -area * 0.95] }) },
          { translateX: t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 8, 0, -8, 0] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '160deg'] }) },
        ],
      }}
    >
      <Leaf size={size} color="#bbf7d0" fill="rgba(187,247,208,0.35)" />
    </Animated.View>
  );
}

// Home's "Your impact" card: Earth Buddy invites first-timers to calculate, and
// shows returning users their latest footprint and when to check in again.
// Reads GET /result/latest on focus; with the feature off it shows the invite.
export function CarbonImpactCard({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const [latest, setLatest] = useState<CarbonResult | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    carbonService.getLatestResult().then((d) => { if (alive) setLatest(d?.result ?? null); }).catch(() => {});
    return () => { alive = false; };
  }, []));

  const total = latest?.totalKgCO2ePerMonth ?? 0;
  const shown = useCountUp(total);
  const band = latest?.category ? BAND_LABELS[latest.category] : undefined;
  const daysSince = latest ? Math.max(0, Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 86400000)) : null;
  const due = daysSince !== null && daysSince >= CHECK_IN_DAYS;
  const daysLeft = daysSince !== null ? CHECK_IN_DAYS - daysSince : null;
  const buddyArea = compact ? 92 : 128;
  const bubbleText = !latest ? "Let's find out! 🌍" : due ? 'Check-in time! 📅' : 'Looking good! 🌱';

  // Motion: card entrance, breathing glow, CTA pulse + arrow nudge, and a speech
  // bubble that pops in. All skipped when the user prefers reduced motion.
  const [reduce, setReduce] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const bubble = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => { if (alive) setReduce(r); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (reduce) { enter.setValue(1); bubble.setValue(1); return; }
    Animated.timing(enter, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
    const loops = [
      Animated.loop(Animated.sequence([run(glow, 1, 2600), run(glow, 0, 2600)])),
      Animated.loop(Animated.sequence([Animated.delay(1200), run(pulse, 1, 550), run(pulse, 0, 550)])),
    ];
    loops.forEach((l) => l.start());
    const pop = Animated.sequence([Animated.delay(900), Animated.spring(bubble, { toValue: 1, friction: 5, tension: 90, useNativeDriver: nativeDriver })]);
    pop.start();
    return () => { loops.forEach((l) => l.stop()); pop.stop(); };
  }, [reduce]);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={latest ? `Carbon footprint: ${formatKg(total)} kilograms CO2e a month. View my footprint` : 'Carbon footprint. Calculate now'}
    >
      <LinearGradient colors={['#052e16', '#166534', '#16a34a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, compact && styles.cardCompact]}>
        <Animated.View
          style={[styles.glow, {
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
          }]}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.eyebrow}>CARBON FOOTPRINT</Text>
          {latest ? (
            <>
              <View style={styles.valueRow}>
                <Text style={[styles.value, compact && { fontSize: 32 }]}>{formatKg(Math.round(shown * 10) / 10)}</Text>
                <Text style={styles.unit}>kg CO₂e{'\n'}a month</Text>
              </View>
              <View style={styles.metaRow}>
                {band && <View style={[styles.band, { backgroundColor: band.color }]}><Text style={styles.bandText}>{band.label}</Text></View>}
                {daysLeft !== null && (
                  <View style={[styles.chip, due && styles.chipDue]}>
                    <CalendarClock size={12} color={due ? '#052e16' : '#bbf7d0'} />
                    <Text style={[styles.chipText, due && { color: '#052e16' }]}>{due ? 'Check-in due' : `Check-in in ${daysLeft} days`}</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.title, compact && { fontSize: 20 }]}>What's your carbon footprint?</Text>
              <Text style={styles.sub}>6 quick questions · about 2 minutes · see where it comes from and how to cut it</Text>
            </>
          )}
          <Animated.View style={[styles.cta, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }] }]}>
            <Text style={styles.ctaText}>{latest ? (due ? 'Check in now' : 'View my footprint') : 'Calculate now'}</Text>
            <Animated.View style={{ transform: [{ translateX: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }] }}>
              <ArrowRight size={15} color="#14532d" />
            </Animated.View>
          </Animated.View>
        </View>
        <View style={{ width: buddyArea, height: buddyArea }}>
          {!reduce && LEAVES.map((l, i) => <DriftingLeaf key={i} {...l} area={buddyArea} />)}
          <EarthBuddy size={buddyArea} wave />
          <Animated.View
            style={[styles.bubble, compact && styles.bubbleCompact, {
              opacity: bubble,
              transform: [{ scale: bubble.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
            }]}
          >
            <Text style={styles.bubbleText} numberOfLines={1}>{bubbleText}</Text>
            <View style={[styles.bubbleTail, compact && styles.bubbleTailUp]} />
          </Animated.View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
    </Animated.View>
  );
}

const useStyles = makeStyles(() => ({
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 22, paddingVertical: 22, paddingLeft: 24, paddingRight: 16, overflow: 'hidden', minHeight: 168 },
  cardCompact: { paddingVertical: 18, paddingLeft: 18, paddingRight: 8, minHeight: 150, gap: 8 },
  glow: { position: 'absolute', right: -60, top: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(134,239,172,0.16)' },
  eyebrow: { color: '#86efac', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginBottom: 6 },
  title: { color: 'white', fontSize: 24, lineHeight: 29, fontWeight: '900', letterSpacing: -0.4 },
  sub: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 6, maxWidth: 460 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  value: { color: 'white', fontSize: 40, fontWeight: '900', letterSpacing: -1, lineHeight: 44 },
  unit: { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontWeight: '700', lineHeight: 15, marginBottom: 5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  band: { borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10 },
  bandText: { color: 'white', fontSize: 11, fontWeight: '900' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.14)' },
  chipDue: { backgroundColor: '#fcd34d' },
  chipText: { color: '#bbf7d0', fontSize: 11, fontWeight: '800' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#bbf7d0', borderRadius: 100, paddingVertical: 9, paddingHorizontal: 16, marginTop: 14 },
  ctaText: { color: '#14532d', fontSize: 13.5, fontWeight: '900' },
  bubble: { position: 'absolute', top: -14, right: '62%', backgroundColor: 'white', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 },
  // Narrow screens: sit under Earth Buddy so the bubble never covers the title.
  bubbleCompact: { top: 'auto', bottom: -10, right: -2 },
  bubbleText: { color: '#14532d', fontSize: 11.5, fontWeight: '900' },
  bubbleTail: { position: 'absolute', bottom: -4, right: 10, width: 9, height: 9, backgroundColor: 'white', transform: [{ rotate: '45deg' }] },
  bubbleTailUp: { bottom: 'auto', top: -4, right: 34 },
}));
