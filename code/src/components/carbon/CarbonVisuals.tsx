import React, { useEffect, useRef, useState } from 'react';
import { View, Text, AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { CarbonCategoryKey, CARBON_CATEGORY_ORDER } from '../../services/carbon';
import { CARBON_CATEGORIES, formatKg } from '../../utils/carbon';

// Small, dependency-free visuals shared by the carbon screens. Numbers shown here
// always come from the backend; these components only animate and draw them.

// Counts a number up from 0 when it first appears or changes (~0.9 s, ease-out).
// Shows the final value straight away when the user has asked for reduced motion.
export function useCountUp(value: number, duration = 900) {
  const [shown, setShown] = useState(value);
  const frame = useRef<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce || !Number.isFinite(value) || value <= 0) { setShown(value); return; }
      const start = Date.now();
      const tick = () => {
        const t = Math.min((Date.now() - start) / duration, 1);
        setShown(value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame.current = requestAnimationFrame(tick);
      };
      setShown(0);
      frame.current = requestAnimationFrame(tick);
    }).catch(() => setShown(value));
    return () => { cancelled = true; if (frame.current) cancelAnimationFrame(frame.current); };
  }, [value, duration]);
  return shown;
}

// Donut of the breakdown with the total in the middle. Segments use each
// category's own colour, in the backend's fixed order.
export function CarbonDonut({ breakdown, total, size = 168 }: {
  breakdown: Partial<Record<CarbonCategoryKey, number>>; total: number; size?: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const stroke = 22;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const parts = CARBON_CATEGORY_ORDER
    .map((key) => ({ key, kg: breakdown[key] ?? 0 }))
    .filter((p) => p.kg > 0);
  const sum = parts.reduce((s, p) => s + p.kg, 0) || 1;
  const gap = parts.length > 1 ? 2 : 0; // px gap between segments
  let offset = 0;
  const shownTotal = useCountUp(total);
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`Footprint ${formatKg(total)} kilograms a month. ${parts.map((p) => `${CARBON_CATEGORIES[p.key].label} ${Math.round((p.kg / sum) * 100)} percent`).join(', ')}`}>
      {/* Rotated a quarter turn so the first slice starts at 12 o'clock */}
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={stroke} fill="none" />
          {parts.map((p) => {
            const len = (p.kg / sum) * circ;
            const seg = (
              <Circle
                key={p.key}
                cx={size / 2} cy={size / 2} r={r}
                stroke={CARBON_CATEGORIES[p.key].color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${Math.max(len - gap, 0.5)} ${circ}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return seg;
          })}
      </Svg>
      <View style={[styles.donutCenter, { pointerEvents: 'none' }]}>
        <Text style={styles.donutValue}>{formatKg(Math.round(shownTotal * 10) / 10)}</Text>
        <Text style={styles.donutUnit}>kg / month</Text>
      </View>
    </View>
  );
}

// Six topic icons for the interview: done (green tick), current (highlighted), to do.
export function TopicStepper({ answered, current }: { answered: CarbonCategoryKey[]; current: CarbonCategoryKey | null }) {
  const styles = useStyles();
  return (
    <View style={styles.stepper} accessible accessibilityLabel={`${answered.length} of ${CARBON_CATEGORY_ORDER.length} topics done${current ? `, now ${CARBON_CATEGORIES[current].label}` : ''}`}>
      {CARBON_CATEGORY_ORDER.map((key, i) => {
        const done = answered.includes(key);
        const now = key === current;
        const c = CARBON_CATEGORIES[key];
        return (
          <React.Fragment key={key}>
            {i > 0 && <View style={[styles.stepLine, (done || now) && styles.stepLineOn]} />}
            <View style={[styles.stepDot, done && styles.stepDone, now && styles.stepNow]}>
              {done ? <Check size={14} color="#052e16" strokeWidth={3} /> : <c.Icon size={14} color={now ? '#052e16' : 'rgba(255,255,255,0.55)'} />}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// One-off confetti burst for milestones: pieces fall, drift and spin, then fade.
// Renders nothing when the user prefers reduced motion.
const CONFETTI_COLORS = ['#16a34a', '#86efac', '#fcd34d', '#0ea5e9', '#f472b6', '#a78bfa'];
export function Confetti({ width, height, count = 26 }: { width: number; height: number; count?: number }) {
  const [reduce, setReduce] = useState(false);
  const pieces = useRef(Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width, drift: (Math.random() - 0.5) * 80, spin: (Math.random() - 0.5) * 720,
    delay: Math.random() * 350, size: 6 + Math.random() * 6, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: Math.random() > 0.6, t: new Animated.Value(0),
  }))).current;
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      setReduce(r);
      if (r) return;
      Animated.parallel(pieces.map((p) => Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.t, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]))).start();
    }).catch(() => {});
  }, []);
  if (reduce) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width, height, overflow: 'hidden', pointerEvents: 'none' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: p.x, top: -16, width: p.size, height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? p.size : 2, backgroundColor: p.color,
            opacity: p.t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.t.interpolate({ inputRange: [0, 1], outputRange: [0, height + 20] }) },
              { translateX: p.t.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutValue: { fontSize: 28, fontWeight: '900', color: c.text, letterSpacing: -0.5 },
  donutUnit: { fontSize: 11.5, fontWeight: '700', color: c.textMuted },

  stepper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: 4 },
  stepLineOn: { backgroundColor: '#86efac' },
  stepDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  stepDone: { backgroundColor: '#86efac', borderColor: '#86efac' },
  stepNow: { backgroundColor: '#fcd34d', borderColor: '#fcd34d', transform: [{ scale: 1.12 }] },
}));
