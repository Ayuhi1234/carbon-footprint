import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeStyles } from '../../theme';
import { PETROL_CAR_KG_PER_KM, KM_PER_MILE } from '../../utils/carbon';

// "That's like driving about 73 km every day for a month in a petrol car." with a km | miles switch.
// The total is per month, so the comparison is too: that many km every day, for a month.
// The first time, the unit comes from the device's region (miles where roads use
// miles); a tap changes it, and the choice is remembered on this device.
type Unit = 'km' | 'mi';
const STORAGE_KEY = 'carbon.distanceUnit';
const MILES_REGIONS = ['US', 'GB', 'LR', 'MM'];

function regionDefault(): Unit {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const region = locale.split(/[-_]/).find((part) => /^[A-Z]{2}$/.test(part));
    return region && MILES_REGIONS.includes(region) ? 'mi' : 'km';
  } catch {
    return 'km';
  }
}

export function DrivingComparison({ totalKgPerMonth, onDark }: { totalKgPerMonth: number; onDark?: boolean }) {
  const styles = useStyles();
  const [unit, setUnit] = useState<Unit>(regionDefault);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => { if (saved === 'km' || saved === 'mi') setUnit(saved); })
      .catch(() => {});
  }, []);

  const choose = (next: Unit) => {
    setUnit(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  if (!(totalKgPerMonth > 0)) return null;
  // Monthly total → the same CO₂e as this many km in a petrol car, per day (30-day month, as the backend uses).
  const kmPerDay = totalKgPerMonth / PETROL_CAR_KG_PER_KM / 30;
  const amount = unit === 'km' ? kmPerDay : kmPerDay / KM_PER_MILE;
  const n = Math.round(amount);
  const distance = n < 1 ? `less than 1 ${unit === 'km' ? 'km' : 'mile'}` : `about ${n.toLocaleString()} ${unit === 'km' ? 'km' : n === 1 ? 'mile' : 'miles'}`;

  return (
    <View style={[styles.wrap, onDark && styles.wrapOnDark]}>
      <Text style={[styles.text, onDark && styles.textOnDark]}>
        That's like driving {distance} every day for a month in a petrol car.
      </Text>
      <View style={[styles.switch, onDark && styles.switchOnDark]} accessibilityRole="radiogroup" accessibilityLabel="Distance unit">
        {(['km', 'mi'] as Unit[]).map((u) => {
          const on = unit === u;
          return (
            <TouchableOpacity
              key={u}
              onPress={() => choose(u)}
              style={[styles.option, on && (onDark ? styles.optionOnDarkActive : styles.optionActive)]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={u === 'km' ? 'Kilometres' : 'Miles'}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionText, onDark && styles.optionTextOnDark, on && (onDark ? styles.optionTextOnDarkActive : styles.optionTextActive)]}>
                {u === 'km' ? 'km' : 'miles'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  text: { fontSize: 14, color: c.text, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  wrapOnDark: { justifyContent: 'flex-start' },
  textOnDark: { color: 'white', textAlign: 'left' },
  switch: { flexDirection: 'row', borderRadius: 100, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  switchOnDark: { borderColor: 'rgba(255,255,255,0.4)' },
  option: { paddingVertical: 3, paddingHorizontal: 10 },
  optionActive: { backgroundColor: c.primary },
  optionOnDarkActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  optionText: { fontSize: 12, fontWeight: '700', color: c.textMuted },
  optionTextOnDark: { color: 'rgba(255,255,255,0.9)' },
  optionTextActive: { color: 'white' },
  optionTextOnDarkActive: { color: 'white' },
}));
