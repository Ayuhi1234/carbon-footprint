import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, Easing, Platform, AccessibilityInfo } from 'react-native';
import { makeStyles } from '../../theme';

// Earth Buddy, the KarmaVerse mascot, animated from the same layered artwork as
// MascotPopupBanner: a mouth-closed base, the smiling (mouth-open) frame on top,
// an eyes-closed frame for blinks, and the thumbs-up arm as a separate piece.
//
//   size     — box size in px. The arm and face crop scale with it.
//   face     — round avatar cropped to the head (for chat bubbles); no arm.
//   animate  — blink and gently float. Off = a still image (cheap for long lists).
//   talking  — mouth flaps for a moment, like it's speaking.
//   wave     — thumbs-up arm waves back and forth.
//   cheer    — pops in with a bounce when it first appears.
// Every motion is skipped when the user has turned on "reduce motion".

const BASE = require('../../../assets/mascot-mouth-closed-transparent.png');
const SMILE = require('../../../assets/mascot-earth-buddy-transparent.png');
const BLINK = require('../../../assets/mascot-blink-transparent.png');
const ARM = require('../../../assets/mascot-arm-raised-transparent.png');

const nativeDriver = Platform.OS !== 'web';
const timing = (v: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
  Animated.timing(v, { toValue, duration, easing, useNativeDriver: nativeDriver });

export function EarthBuddy({ size = 72, face = false, animate = true, talking = false, wave = false, cheer = false }: {
  size?: number; face?: boolean; animate?: boolean; talking?: boolean; wave?: boolean; cheer?: boolean;
}) {
  const styles = useStyles();
  const [reduce, setReduce] = useState(false);
  const blink = useRef(new Animated.Value(0)).current;
  const mouth = useRef(new Animated.Value(1)).current; // 1 = smiling frame visible
  const float = useRef(new Animated.Value(0)).current;
  const arm = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(cheer ? 0 : 1)).current;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => { if (alive) setReduce(r); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (reduce || !animate) { pop.setValue(1); mouth.setValue(1); return; }
    const loops: Animated.CompositeAnimation[] = [];
    // Blink every few seconds, driven by a timer (a looped Animated.delay never
    // fired on web). The random gap keeps several buddies out of sync.
    let blinkTimer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const scheduleBlink = () => {
      blinkTimer = setTimeout(() => {
        if (!alive) return;
        Animated.sequence([timing(blink, 1, 80), Animated.delay(60), timing(blink, 0, 100)]).start(() => { if (alive) scheduleBlink(); });
      }, 2200 + Math.random() * 2200);
    };
    scheduleBlink();
    if (!face) loops.push(Animated.loop(Animated.sequence([timing(float, -size * 0.05, 1100, Easing.inOut(Easing.sin)), timing(float, 0, 1100, Easing.inOut(Easing.sin))])));
    if (wave && !face) loops.push(Animated.loop(Animated.sequence([timing(arm, 1, 380), timing(arm, -1, 760), timing(arm, 0, 380), Animated.delay(1400)])));
    if (talking) loops.push(Animated.loop(Animated.sequence([timing(mouth, 0, 150), timing(mouth, 1, 150)]), { iterations: 5 }));
    loops.forEach((l) => l.start());
    if (cheer) Animated.spring(pop, { toValue: 1, friction: 4, tension: 70, useNativeDriver: nativeDriver }).start();
    return () => { alive = false; if (blinkTimer) clearTimeout(blinkTimer); loops.forEach((l) => l.stop()); mouth.setValue(1); blink.setValue(0); };
  }, [reduce, animate, talking, wave, cheer, face, size]);

  // Face crop: draw the artwork larger and shift it so the head fills the circle.
  const img = face ? size * 1.7 : size;
  const offset = face ? { left: size / 2 - img * 0.5, top: size / 2 - img * 0.31 } : { left: 0, top: 0 };
  const layer = [{ position: 'absolute' as const, width: img, height: img }, offset];
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const rotate = arm.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });
  // Arm box within the artwork (from MascotPopupBanner, where 76 px = the full image).
  const k = img / 76;

  return (
    <Animated.View
      style={[{ width: size, height: size }, face && styles.faceRing, { transform: [{ translateY: float }, { scale }] }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Earth Buddy, the KarmaVerse mascot"
    >
      <View style={[{ width: size, height: size }, face && { borderRadius: size / 2, overflow: 'hidden' }]}>
        <Image source={BASE} style={layer} resizeMode="contain" />
        <Animated.Image source={SMILE} style={[layer, { opacity: mouth }]} resizeMode="contain" />
        <Animated.Image source={BLINK} style={[layer, { opacity: blink }]} resizeMode="contain" />
        {!face && (
          <Animated.View style={{ position: 'absolute', left: 51 * k, top: 24 * k, width: 19 * k, height: 22 * k, transform: [{ rotate }] }}>
            <Image source={ARM} style={{ width: 19 * k, height: 22 * k }} resizeMode="contain" />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

// Three dots that pulse in turn, for "Earth Buddy is thinking…".
export function TypingDots({ color = '#16a34a' }: { color?: string }) {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const loop = Animated.loop(Animated.stagger(160, dots.map((d) => Animated.sequence([timing(d, 1, 260), timing(d, 0.3, 260)]))));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', height: 18 }} accessibilityLabel="Thinking">
      {dots.map((d, i) => <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: d }} />)}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  faceRing: { borderRadius: 999, backgroundColor: c.primarySoft },
}));
