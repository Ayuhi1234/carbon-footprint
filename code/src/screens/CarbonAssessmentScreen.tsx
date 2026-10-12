import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Leaf, Mic, Send, CheckCircle2 } from 'lucide-react-native';
import {
  carbonService, CarbonResult, CarbonSession, CarbonCategoryKey, CarbonApiNotReadyError, CARBON_CATEGORY_ORDER,
} from '../services/carbon';
import { profileService } from '../services/profile';
import { CARBON_CATEGORIES, BAND_LABELS, formatKg, formatDate, showCarbonError } from '../utils/carbon';
import { Field, Draft, FieldValue, UserContext, fieldsToAsk, buildAnswer, parseNumber } from '../utils/carbonQuestions';
import { showAlert } from '../utils/alert';
import { useTheme, makeStyles } from '../theme';

type Phase = 'loading' | 'intro' | 'starting' | 'chat' | 'sending' | 'result';
type LoggedAnswer = { field: Field; label: string };

const TOTAL = CARBON_CATEGORY_ORDER.length;

// Web Speech API (Chrome, Edge, Safari). Native gets a number pad and no in-app mic.
// TODO(native): add in-app voice with expo-speech-recognition (needs a dev build).
const SpeechRecognition: any = Platform.OS === 'web' && typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

const listLabels = (keys: CarbonCategoryKey[]) => {
  const labels = keys.map((k) => CARBON_CATEGORIES[k].label.toLowerCase());
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0] ?? '';
};

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

// Conversational assessment backed by the server-side interview session: six
// categories in the backend's fixed order. Each category is sent as soon as its
// fields are answered, so leaving part-way keeps progress and the user can carry
// on later. The sixth answer returns the calculated result.
export function CarbonAssessmentScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [ctx, setCtx] = useState<UserContext>({});
  const [phase, setPhase] = useState<Phase>('loading');
  const [resumable, setResumable] = useState<CarbonSession | null>(null);
  const [category, setCategory] = useState<CarbonCategoryKey | null>(null); // the one the backend expects
  const [answered, setAnswered] = useState<CarbonCategoryKey[]>([]);
  const [resumedFrom, setResumedFrom] = useState<CarbonCategoryKey[]>([]); // answered on an earlier visit
  const [log, setLog] = useState<LoggedAnswer[]>([]); // sent this visit; read-only
  const [draft, setDraft] = useState<Draft>({}); // the current category, not sent yet
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<CarbonResult | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const recRef = useRef<any>(null);
  // Set while a start or answer request is in flight, so a fast double tap
  // can't send the same topic twice (the backend would reject the second).
  const busyRef = useRef(false);

  // Personalise the conversation from the profile, and look for an interview to resume.
  useEffect(() => {
    profileService.getProfile()
      .then((p: any) => setCtx({
        firstName: (p?.name || '').trim().split(' ')[0] || undefined,
        city: p?.demographics?.city || p?.city || p?.address?.city || undefined,
        employment: p?.demographics?.employment || p?.employment || undefined,
      }))
      .catch(() => {});
    carbonService.getSession()
      .then((s) => setResumable(s?.nextQuestion ? s : null))
      .finally(() => setPhase('intro'));
    return () => recRef.current?.stop?.();
  }, []);

  const toAsk = category ? fieldsToAsk(category, draft) : [];
  const drafted = toAsk.filter((f) => draft[f.key]);
  const current: Field | undefined = phase === 'chat' ? toAsk.find((f) => !draft[f.key]) : undefined;
  const lastIsFinal = category === CARBON_CATEGORY_ORDER[TOTAL - 1];

  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('CarbonFootprint'));

  const clearComposer = () => { setInput(''); setInputError(null); };

  // Back to the start screen with an empty transcript.
  const resetToIntro = () => {
    setCategory(null);
    setResumable(null);
    setLog([]);
    setResumedFrom([]);
    setDraft({});
    setPhase('intro');
  };

  // Starts a new interview, or resumes the one in progress. "Start over" abandons it first.
  const begin = async (fresh: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase('starting');
    try {
      if (fresh) await carbonService.abandonSession();
      const s = await carbonService.startSession();
      if (!s.nextQuestion) throw new Error('No question to ask');
      setCategory(s.nextQuestion.category);
      setAnswered(s.answeredCategories);
      setResumedFrom(s.answeredCategories);
      setLog([]);
      setDraft({});
      setResumable(null);
      setPhase('chat');
    } catch (error) {
      showCarbonError("Couldn't start the assessment", error);
      setPhase('intro');
    } finally {
      busyRef.current = false;
    }
  };

  // After a rejected answer, line up with the step the backend is actually on.
  const resync = async () => {
    const s = await carbonService.getSession();
    if (!s?.nextQuestion) {
      resetToIntro();
      return;
    }
    setCategory(s.nextQuestion.category);
    setAnswered(s.answeredCategories);
    setDraft({});
    setPhase('chat');
  };

  const send = async (cat: CarbonCategoryKey, next: Draft, lastField: Field) => {
    const answer = buildAnswer(cat, next);
    if (!answer || busyRef.current) return;
    busyRef.current = true;
    setPhase('sending');
    try {
      const res = await carbonService.submitAnswer(cat, answer);
      setLog((l) => [...l, ...fieldsToAsk(cat, next).map((field) => ({ field, label: next[field.key].label }))]);
      setAnswered((a) => [...a, cat]);
      setDraft({});
      if (res.completed) {
        setResult(res.result);
        setCategory(null);
        setPhase('result');
      } else {
        setCategory(res.nextQuestion.category);
        setPhase('chat');
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const retry = () => { const d = { ...next }; delete d[lastField.key]; setDraft(d); setPhase('chat'); };
      if (error instanceof CarbonApiNotReadyError) {
        showCarbonError("Couldn't save your answer", error);
        retry();
      } else if (status === 404) {
        showAlert('Assessment ended', 'That assessment is no longer open. Please start again.');
        resetToIntro();
      } else if (status === 429) {
        showAlert('One moment', "You're going a bit fast — wait a few seconds and answer again.");
        retry();
      } else {
        showCarbonError("Couldn't save your answer", error);
        if (status === 400) await resync().catch(retry);
        else retry();
      }
    } finally {
      busyRef.current = false;
    }
  };

  const answerField = (f: Field, value: FieldValue, label: string) => {
    if (!category || busyRef.current) return;
    clearComposer();
    const next = { ...draft, [f.key]: { value, label } };
    setDraft(next);
    if (buildAnswer(category, next)) send(category, next, f);
  };

  const sendText = () => {
    if (!current?.number) return;
    const n = parseNumber(current, input);
    if (n === null) {
      setInputError(`Enter a number from ${current.number.min.toLocaleString()} to ${current.number.max.toLocaleString()}.`);
      return;
    }
    answerField(current, n, `${n.toLocaleString()} ${current.number.unit}`);
  };

  // Undo the latest answer in this category (sent categories can't be changed).
  const changeLast = () => {
    const last = drafted[drafted.length - 1];
    if (!last) return;
    setDraft((d) => { const next = { ...d }; delete next[last.key]; return next; });
    clearComposer();
  };

  const toggleVoice = () => {
    if (listening) { recRef.current?.stop(); return; }
    try {
      const rec = new SpeechRecognition();
      rec.lang = 'en-IN';
      rec.interimResults = true;
      rec.onresult = (e: any) => { setInputError(null); setInput(Array.from(e.results).map((r: any) => r[0].transcript).join('')); };
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

  const inProgress = phase === 'chat' || phase === 'sending';
  const fieldShare = toAsk.length ? drafted.length / toAsk.length : 0;
  const progressPct = phase === 'result' ? 100 : inProgress ? ((answered.length + fieldShare) / TOTAL) * 100 : 0;
  const stepNo = Math.min(answered.length + 1, TOTAL);
  const top = result?.breakdown
    ? CARBON_CATEGORY_ORDER.reduce<{ key: CarbonCategoryKey; kg: number } | null>((best, key) => {
        const kg = result.breakdown?.[key];
        return typeof kg === 'number' && kg > (best?.kg ?? 0) ? { key, kg } : best;
      }, null)
    : null;
  const band = result?.category ? BAND_LABELS[result.category] : undefined;

  // Transcript: one section label whenever the category changes.
  let lastCategory: CarbonCategoryKey | null = null;
  const sectionFor = (cat: CarbonCategoryKey) => {
    const show = cat !== lastCategory;
    lastCategory = cat;
    return show ? <SectionLabel category={cat} /> : null;
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
          <Text style={styles.headerCount}>{inProgress ? `${stepNo} of ${TOTAL}` : ''}</Text>
        </View>
        <View style={styles.progressTrack} accessible accessibilityLabel={inProgress && category ? `Topic ${stepNo} of ${TOTAL}, ${CARBON_CATEGORIES[category].label}` : phase === 'result' ? 'Complete' : 'Not started'}>
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
              I'll ask about travel, home energy, food, waste, water and flights — about 2 minutes. Tap an answer, or type a number if you know it. Your answers save as you go.
            </Text>
            <Text style={styles.botFine}>Your footprint is worked out with fixed formulas and standard emission factors.</Text>
          </BotBubble>

          {phase === 'loading' && <ActivityIndicator size="small" color={colors.primary} accessibilityLabel="Loading" />}

          {(phase === 'intro' || phase === 'starting') && (
            <>
              {resumable && (
                <BotBubble live>
                  <Text style={styles.botText}>
                    Welcome back! You've already answered {listLabels(resumable.answeredCategories)}. Carry on where you left off?
                  </Text>
                </BotBubble>
              )}
              {phase === 'starting' ? (
                <ActivityIndicator size="small" color={colors.primary} accessibilityLabel="Starting" />
              ) : (
                <View style={styles.chips}>
                  <TouchableOpacity style={[styles.chip, styles.chipPrimary]} onPress={() => begin(false)} activeOpacity={0.8} accessibilityRole="button">
                    <Text style={[styles.chipText, styles.chipTextPrimary]}>{resumable ? 'Carry on' : "Let's start"}</Text>
                  </TouchableOpacity>
                  {resumable && (
                    <TouchableOpacity style={styles.chip} onPress={() => begin(true)} activeOpacity={0.8} accessibilityRole="button">
                      <Text style={styles.chipText}>Start over</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}

          {resumedFrom.length > 0 && phase !== 'intro' && phase !== 'starting' && (
            <BotBubble><Text style={styles.botText}>Picking up where you left off — {listLabels(resumedFrom)} done.</Text></BotBubble>
          )}

          {log.map(({ field, label }, i) => (
            <React.Fragment key={`${field.category}.${field.key}.${i}`}>
              {sectionFor(field.category)}
              <BotBubble><Text style={styles.botText}>{field.ask(ctx, {})}</Text></BotBubble>
              <View style={styles.userRow}>
                <View style={styles.userBubble}><Text style={styles.userText}>{label}</Text></View>
              </View>
            </React.Fragment>
          ))}

          {inProgress && drafted.map((f, i) => (
            <React.Fragment key={`${f.category}.${f.key}`}>
              {sectionFor(f.category)}
              <BotBubble><Text style={styles.botText}>{f.ask(ctx, draft)}</Text></BotBubble>
              <View style={styles.userRow}>
                <View style={styles.userBubble}><Text style={styles.userText}>{draft[f.key].label}</Text></View>
                {i === drafted.length - 1 && phase === 'chat' && (
                  <TouchableOpacity onPress={changeLast} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Change this answer" style={styles.changeBtn}>
                    <Text style={styles.changeText}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>
            </React.Fragment>
          ))}

          {current && (
            <>
              {sectionFor(current.category)}
              <BotBubble live>
                <Text style={styles.botText}>{current.ask(ctx, draft)}</Text>
                {current.hint && <Text style={styles.botFine}>{current.hint}</Text>}
              </BotBubble>
              <View style={styles.chips}>
                {current.options.map((o) => (
                  <TouchableOpacity
                    key={String(o.value)}
                    style={styles.chip}
                    onPress={() => answerField(current, o.value, o.label)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.chipText}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {phase === 'sending' && (
            <BotBubble live>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator size="small" color={colors.primary} accessibilityLabel={lastIsFinal ? 'Calculating' : 'Saving'} />
                <Text style={styles.botText}>{lastIsFinal ? 'Calculating your footprint…' : 'Saving…'}</Text>
              </View>
            </BotBubble>
          )}

          {phase === 'result' && result && (
            <>
              <BotBubble live><Text style={styles.botText}>That's everything! Here's your carbon footprint.</Text></BotBubble>
              <View style={styles.resultCard}>
                <View style={styles.tick}><CheckCircle2 size={28} color="#16a34a" /></View>
                <Text style={styles.resultValue}>{formatKg(result.totalKgCO2ePerMonth)}</Text>
                <Text style={styles.resultUnit}>kg CO₂e / month</Text>
                {band && <Text style={[styles.band, { color: band.color }]}>{band.label}</Text>}
                {top && (
                  <Text style={styles.resultBody}>
                    Your biggest source is <Text style={{ fontWeight: '800', color: colors.text }}>{CARBON_CATEGORIES[top.key].label.toLowerCase()}</Text> — {formatKg(top.kg)} kg.
                  </Text>
                )}
                {!!result.tips?.[0] && <Text style={styles.resultTip}>{result.tips[0]}</Text>}
                <Text style={styles.fine}>
                  Calculated {formatDate(result.createdAt)}{result.emissionFactorVersion ? ` · emission factors ${result.emissionFactorVersion}` : ''}
                </Text>
                <TouchableOpacity style={[styles.primaryBtn, { alignSelf: 'stretch' }]} onPress={() => navigation.replace('CarbonJourney')} activeOpacity={0.8} accessibilityRole="button">
                  <Text style={styles.primaryBtnText}>View my journey</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ghostBtn, { alignSelf: 'stretch' }]} onPress={close} activeOpacity={0.8} accessibilityRole="button">
                  <Text style={styles.ghostBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* Composer — for number questions, type or speak the exact figure */}
        {current?.number && (
          <View style={styles.composer}>
            {(inputError || listening) && (
              <Text style={[styles.voiceHint, inputError ? { color: colors.danger } : null]}>
                {inputError ?? 'Listening… tap the mic again to stop.'}
              </Text>
            )}
            <View style={styles.composerRow}>
              <TextInput
                style={styles.input}
                placeholder={`Or type a number (${current.number.unit})…`}
                placeholderTextColor={colors.textFaint}
                value={input}
                onChangeText={(t) => { setInput(t); setInputError(null); }}
                onSubmitEditing={sendText}
                returnKeyType="send"
                keyboardType={Platform.OS === 'web' ? 'default' : 'decimal-pad'}
                maxLength={60}
                accessibilityLabel={`Your answer in ${current.number.unit} to: ${current.ask(ctx, draft)}`}
              />
              {SpeechRecognition && (
                <TouchableOpacity
                  style={[styles.roundBtn, listening && styles.roundBtnLive]}
                  onPress={toggleVoice}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={listening ? 'Stop listening' : 'Speak your answer'}
                >
                  <Mic size={18} color={listening ? 'white' : colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.roundBtn, styles.sendBtn, !input.trim() && styles.sendBtnOff]}
                onPress={sendText}
                disabled={!input.trim()}
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
  chipPrimary: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipTextPrimary: { color: 'white' },

  primaryBtn: { marginTop: 8, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  ghostBtn: { marginTop: 10, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  ghostBtnText: { color: c.primary, fontSize: 14.5, fontWeight: '800' },

  resultCard: { backgroundColor: c.surface, borderRadius: 24, padding: 20, alignItems: 'center', elevation: 8, shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16 },
  tick: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  resultValue: { fontSize: 44, fontWeight: '900', color: c.text, letterSpacing: -1 },
  resultUnit: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  band: { fontSize: 13, fontWeight: '900', marginTop: 8, letterSpacing: 0.3 },
  resultBody: { fontSize: 14, color: c.textMuted, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  resultTip: { fontSize: 13, color: c.text, lineHeight: 19, textAlign: 'center', marginTop: 10, fontWeight: '600' },
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
