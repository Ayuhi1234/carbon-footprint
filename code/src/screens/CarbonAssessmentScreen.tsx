import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Leaf, Mic, Send, CheckCircle2, Check } from 'lucide-react-native';
import { carbonService, CarbonAssessment, CarbonCategoryKey, CarbonApiNotReadyError, CARBON_CATEGORY_ORDER } from '../services/carbon';
import { profileService } from '../services/profile';
import { CARBON_CATEGORIES, formatKg, formatDate, showCarbonError } from '../utils/carbon';
import { QUESTION_SET_VERSION, Question, AnswerMap, UserContext, visibleQuestions, answerLabel } from '../utils/carbonQuestions';
import { showAlert } from '../utils/alert';
import { useTheme, makeStyles } from '../theme';

type Phase = 'chat' | 'calculating' | 'result';

// Web Speech API (Chrome, Edge, Safari). On native the keyboard's own mic is used.
// TODO(native): add in-app voice with expo-speech-recognition (needs a dev build).
const SpeechRecognition: any = Platform.OS === 'web' && typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

function BotBubble({ children, live }: { children: React.ReactNode; live?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.botRow} accessibilityLiveRegion={live ? 'polite' : 'none'}>
      <View style={styles.avatar}><Leaf size={14} color={colors.primary} /></View>
      <View style={styles.botBubble}>{children}</View>
    </View>
  );
}

function SectionLabel({ category }: { category: CarbonCategoryKey }) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const c = CARBON_CATEGORIES[category];
  return (
    <View style={styles.sectionRow} accessibilityRole="header">
      <View style={[styles.sectionTile, { backgroundColor: isDark ? colors.surfaceAlt : c.bg }]}><c.Icon size={13} color={c.color} /></View>
      <Text style={[styles.sectionText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

// Conversational assessment: the app asks, the user taps an option — or types or
// speaks in their own words. Header follows the quiz; bubbles and chips use the
// same greens, radii and card shadow as Wallet.
export function CarbonAssessmentScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  // Pastel category tiles read as glare on dark surfaces; use the raised surface there.
  const tint = (bg: string) => (isDark ? colors.surfaceAlt : bg);
  const [ctx, setCtx] = useState<UserContext>({});
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [multi, setMulti] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState(false);
  const [phase, setPhase] = useState<Phase>('chat');
  const [result, setResult] = useState<CarbonAssessment | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const recRef = useRef<any>(null);
  const allowLeave = useRef(false);

  // Personalise the conversation from the profile the user already filled in.
  useEffect(() => {
    profileService.getProfile()
      .then((p: any) => setCtx({
        firstName: (p?.name || '').trim().split(' ')[0] || undefined,
        city: p?.demographics?.city || p?.city || p?.address?.city || undefined,
        employment: p?.demographics?.employment || p?.employment || undefined,
      }))
      .catch(() => {});
    return () => recRef.current?.stop?.();
  }, []);

  const vis = visibleQuestions(answers);
  const answered = vis.filter((q) => answers[q.id]);
  const current: Question | undefined = started ? vis.find((q) => !answers[q.id]) : undefined;
  const allDone = started && !current;
  const hasAnswers = answered.length > 0;

  // Confirm before leaving (close, Android back, browser back) mid-way.
  // TODO(backend): answers aren't saved as you go yet, so leaving loses them.
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e: any) => {
      if (allowLeave.current || !hasAnswers || phase === 'result') return;
      e.preventDefault();
      showAlert('Leave assessment?', 'Your answers so far will be lost.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => { allowLeave.current = true; navigation.dispatch(e.data.action); } },
      ]);
    });
  }, [navigation, hasAnswers, phase]);

  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('CarbonFootprint'));

  const answer = (q: Question, a: { optionIds?: string[]; text?: string }) => {
    setAnswers((prev) => ({ ...prev, [q.id]: a }));
    setMulti([]);
    setInput('');
    setVoiceHint(false);
  };

  const sendText = () => {
    const text = input.trim();
    if (!current || text.length < 2) return;
    answer(current, { text });
  };

  // Undo the most recent answer so it can be picked again.
  const changeLast = () => {
    const last = answered[answered.length - 1];
    if (!last) return;
    setAnswers((prev) => { const next = { ...prev }; delete next[last.id]; return next; });
    setMulti([]);
  };

  const toggleVoice = () => {
    if (!SpeechRecognition) {
      setVoiceHint(true);
      inputRef.current?.focus();
      return;
    }
    if (listening) { recRef.current?.stop(); return; }
    try {
      const rec = new SpeechRecognition();
      rec.lang = 'en-IN';
      rec.interimResults = true;
      rec.onresult = (e: any) => setInput(Array.from(e.results).map((r: any) => r[0].transcript).join(''));
      rec.onerror = () => showAlert("Couldn't hear you", 'Check that the microphone is allowed for this site, then try again.');
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      showAlert("Couldn't start the mic", 'Please type your answer instead.');
    }
  };

  const calculate = async () => {
    setPhase('calculating');
    const payload: AnswerMap = {};
    vis.forEach((q) => { if (answers[q.id]) payload[q.id] = answers[q.id]; }); // only questions that applied
    try {
      const saved = await carbonService.submitAssessment(payload, QUESTION_SET_VERSION);
      setResult(saved);
      setPhase('result');
    } catch (error) {
      showCarbonError("Couldn't calculate your footprint", error);
      if (!(error instanceof CarbonApiNotReadyError)) console.error('Carbon assessment error:', error);
      setPhase('chat');
    }
  };

  const total = vis.length;
  const progressPct = started ? (answered.length / total) * 100 : 0;
  // Header counts topics, not questions: follow-ups (e.g. fuel type) appear only
  // after some answers, so a question count would jump around.
  const topics = CARBON_CATEGORY_ORDER.filter((k) => vis.some((q) => q.category === k));
  const topicNo = current ? topics.indexOf(current.category) + 1 : topics.length;
  const top = result?.categories.reduce<{ key: CarbonCategoryKey; kgCo2e: number } | null>(
    (best, c) => (c.kgCo2e > (best?.kgCo2e ?? 0) ? c : best), null,
  );

  // Transcript: one section label whenever the category changes.
  let lastCategory: CarbonCategoryKey | null = null;
  const sectionFor = (q: Question) => {
    const show = q.category !== lastCategory;
    lastCategory = q.category;
    return show ? <SectionLabel category={q.category} /> : null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <LinearGradient colors={['#064e3b', '#166534']} style={styles.headerBg}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={close} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Close assessment">
            <X size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carbon footprint</Text>
          <Text style={styles.headerCount}>{started ? `${topicNo} of ${topics.length}` : ''}</Text>
        </View>
        <View style={styles.progressTrack} accessible accessibilityLabel={started ? `Topic ${topicNo} of ${topics.length}${current ? `, ${CARBON_CATEGORIES[current.category].label}` : ''}` : 'Not started'}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          <BotBubble>
            <Text style={styles.botText}>
              Hi{ctx.firstName ? ` ${ctx.firstName}` : ''}! Let's work out your carbon footprint{ctx.city ? ` in ${ctx.city}` : ''}.
            </Text>
          </BotBubble>
          <BotBubble>
            <Text style={styles.botText}>
              I'll ask about travel, home energy, food, waste, water, flights and shopping — about 4 minutes. Just tap an answer, or type or speak if that's easier.
            </Text>
            <Text style={styles.botFine}>AI only reads what you type or say. Your footprint is worked out with fixed formulas and standard conversion factors.</Text>
          </BotBubble>

          {!started && (
            <View style={styles.chips}>
              <TouchableOpacity style={[styles.chip, styles.chipPrimary]} onPress={() => setStarted(true)} activeOpacity={0.8} accessibilityRole="button">
                <Text style={[styles.chipText, styles.chipTextPrimary]}>Let's start</Text>
              </TouchableOpacity>
            </View>
          )}

          {answered.map((q, i) => (
            <React.Fragment key={q.id}>
              {sectionFor(q)}
              <BotBubble><Text style={styles.botText}>{q.ask(ctx, answers)}</Text></BotBubble>
              <View style={styles.userRow}>
                <View style={styles.userBubble}><Text style={styles.userText}>{answerLabel(q, answers[q.id])}</Text></View>
                {i === answered.length - 1 && phase === 'chat' && (
                  <TouchableOpacity onPress={changeLast} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Change this answer" style={styles.changeBtn}>
                    <Text style={styles.changeText}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>
            </React.Fragment>
          ))}

          {current && phase === 'chat' && (
            <>
              {sectionFor(current)}
              <BotBubble live><Text style={styles.botText}>{current.ask(ctx, answers)}</Text></BotBubble>
              <View style={styles.chips}>
                {current.options.map((o) => {
                  const on = multi.includes(o.id);
                  return (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => {
                        if (!current.multi) return answer(current, { optionIds: [o.id] });
                        setMulti((m) => (o.id === 'none' ? ['none'] : on ? m.filter((x) => x !== o.id) : [...m.filter((x) => x !== 'none'), o.id]));
                      }}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={current.multi ? { selected: on } : undefined}
                    >
                      <View style={styles.chipInner}>
                        {on && <Check size={14} color={colors.primary} strokeWidth={3} />}
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {current.multi && (
                  <TouchableOpacity
                    style={[styles.chip, styles.chipPrimary, multi.length === 0 && styles.chipDisabled]}
                    onPress={() => answer(current, { optionIds: multi })}
                    disabled={multi.length === 0}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: multi.length === 0 }}
                  >
                    <Text style={[styles.chipText, styles.chipTextPrimary]}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {allDone && phase === 'chat' && (
            <>
              <BotBubble live><Text style={styles.botText}>That's everything! Ready to see your footprint?</Text></BotBubble>
              <TouchableOpacity style={styles.primaryBtn} onPress={calculate} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.primaryBtnText}>Calculate my footprint</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === 'calculating' && (
            <BotBubble live>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator size="small" color={colors.primary} accessibilityLabel="Calculating" />
                <Text style={styles.botText}>Calculating your footprint…</Text>
              </View>
            </BotBubble>
          )}

          {phase === 'result' && result && (
            <>
              <BotBubble live><Text style={styles.botText}>Here's your carbon footprint.</Text></BotBubble>
              <View style={styles.resultCard}>
                <View style={styles.tick}><CheckCircle2 size={28} color="#16a34a" /></View>
                <Text style={styles.resultValue}>{formatKg(result.totalKgPerMonth)}</Text>
                <Text style={styles.resultUnit}>kg CO₂e / month</Text>
                {top && (
                  <Text style={styles.resultBody}>
                    Your biggest source is <Text style={{ fontWeight: '800', color: colors.text }}>{CARBON_CATEGORIES[top.key].label.toLowerCase()}</Text> — {formatKg(top.kgCo2e)} kg.
                  </Text>
                )}
                <Text style={styles.fine}>
                  Calculated {formatDate(result.createdAt)}{result.factorVersion ? ` · conversion factors v${result.factorVersion}` : ''}
                </Text>
                <TouchableOpacity style={[styles.primaryBtn, { alignSelf: 'stretch' }]} onPress={() => { allowLeave.current = true; navigation.replace('CarbonJourney'); }} activeOpacity={0.8} accessibilityRole="button">
                  <Text style={styles.primaryBtnText}>View my journey</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ghostBtn, { alignSelf: 'stretch' }]} onPress={() => { allowLeave.current = true; close(); }} activeOpacity={0.8} accessibilityRole="button">
                  <Text style={styles.ghostBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* Composer — answer in your own words, typed or spoken */}
        {current && phase === 'chat' && (
          <View style={styles.composer}>
            {(voiceHint || listening) && (
              <Text style={styles.voiceHint}>
                {listening ? 'Listening… tap the mic again to stop.' : 'Tap the mic on your keyboard to speak your answer.'}
              </Text>
            )}
            <View style={styles.composerRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Or type your own answer…"
                placeholderTextColor={colors.textFaint}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={sendText}
                returnKeyType="send"
                maxLength={300}
                accessibilityLabel={`Your answer to: ${current.ask(ctx, answers)}`}
              />
              <TouchableOpacity
                style={[styles.roundBtn, listening && styles.roundBtnLive]}
                onPress={toggleVoice}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={listening ? 'Stop listening' : 'Speak your answer'}
              >
                <Mic size={18} color={listening ? 'white' : colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roundBtn, styles.sendBtn, input.trim().length < 2 && styles.sendBtnOff]}
                onPress={sendText}
                disabled={input.trim().length < 2}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Send answer"
              >
                <Send size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  headerBg: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, maxWidth: 800, width: '100%', alignSelf: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: 'white' },
  headerCount: { width: 56, textAlign: 'right', fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  closeBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  progressTrack: { marginHorizontal: 20, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden', maxWidth: 760, width: '100%', alignSelf: 'center' },
  progressFill: { height: '100%', backgroundColor: '#86efac', borderRadius: 3 },

  thread: { padding: 16, paddingBottom: 24, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  botRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '90%' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  botBubble: { flexShrink: 1, backgroundColor: c.surface, borderRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: c.border, elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  botText: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: c.text },
  botFine: { fontSize: 11.5, lineHeight: 16, fontWeight: '500', color: c.textMuted, marginTop: 6 },
  userRow: { alignItems: 'flex-end', gap: 2 },
  userBubble: { maxWidth: '80%', backgroundColor: '#16a34a', borderRadius: 16, borderBottomRightRadius: 4, paddingVertical: 10, paddingHorizontal: 14 },
  userText: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: 'white' },
  changeBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  changeText: { fontSize: 12, fontWeight: '700', color: c.primary },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 10 },
  sectionTile: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  sectionText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 36 },
  chip: { borderWidth: 1.5, borderColor: '#86efac', backgroundColor: c.surface, borderRadius: 100, paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '800', color: c.primary },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOn: { backgroundColor: c.primarySoft, borderColor: '#16a34a', borderWidth: 2 },
  chipTextOn: { color: c.primary },
  chipPrimary: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipTextPrimary: { color: 'white' },
  chipDisabled: { backgroundColor: '#9cccb0', borderColor: '#9cccb0' },

  primaryBtn: { marginTop: 8, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  ghostBtn: { marginTop: 10, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  ghostBtnText: { color: c.primary, fontSize: 14.5, fontWeight: '800' },

  resultCard: { backgroundColor: c.surface, borderRadius: 24, padding: 20, alignItems: 'center', elevation: 8, shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16 },
  tick: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  resultValue: { fontSize: 44, fontWeight: '900', color: c.text, letterSpacing: -1 },
  resultUnit: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  resultBody: { fontSize: 14, color: c.textMuted, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  fine: { fontSize: 12, color: c.textFaint, marginTop: 10, textAlign: 'center' },

  composer: { backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 640, width: '100%', alignSelf: 'center' },
  input: { flex: 1, minHeight: 44, borderRadius: 100, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, fontSize: 14, color: c.text },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#86efac', backgroundColor: c.surface },
  roundBtnLive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  sendBtn: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  sendBtnOff: { backgroundColor: '#9cccb0', borderColor: '#9cccb0' },
  voiceHint: { fontSize: 12, fontWeight: '600', color: c.textMuted, textAlign: 'center', marginBottom: 8 },
}));
