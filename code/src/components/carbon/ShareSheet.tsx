import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, Share, Linking } from 'react-native';
import { MessageCircle, Linkedin, Facebook, Twitter, Mail, Copy, Check, MoreHorizontal, X } from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { CarbonResult } from '../../services/carbon';
import { buildCarbonShare } from '../../utils/carbon';

// Share sheet for a carbon result: a preview of the message, then one-tap
// targets (WhatsApp, X, LinkedIn, Facebook, Email), Copy message, and "More"
// for the device's own share menu. Every action gives visible feedback, unlike
// the browser's bare share call, which can fail or close silently on desktop.
export function ShareSheet({ result, visible, onClose }: { result: CarbonResult | null; visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!visible) setCopied(false); }, [visible]);
  if (!result) return null;

  const { text, url } = buildCarbonShare(result);
  const full = `${text} ${url}`;
  const nav: any = typeof navigator !== 'undefined' ? navigator : null;
  const hasMore = Platform.OS !== 'web' || !!nav?.share;

  const targets = [
    { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, color: '#25D366', href: `https://api.whatsapp.com/send?text=${encodeURIComponent(full)}` /* direct: the wa.me redirect breaks emoji */ },
    { key: 'x', label: 'X', Icon: Twitter, color: '#0f172a', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin, color: '#0A66C2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { key: 'facebook', label: 'Facebook', Icon: Facebook, color: '#1877F2', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { key: 'email', label: 'Email', Icon: Mail, color: '#ea4335', href: `mailto:?subject=${encodeURIComponent('My carbon footprint')}&body=${encodeURIComponent(`${text}\n\n${url}`)}` },
  ];

  const open = (href: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && !href.startsWith('mailto:')) window.open(href, '_blank', 'noopener');
    else Linking.openURL(href).catch(() => {});
  };

  const copy = async () => {
    try {
      if (nav?.clipboard?.writeText) await nav.clipboard.writeText(full);
      else await Share.share({ message: full });
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard blocked: the message is still shown above to select */ }
  };

  const more = async () => {
    try {
      if (Platform.OS === 'web') await nav.share({ title: 'My carbon footprint', text, url });
      else await Share.share({ message: full });
    } catch { /* cancelled */ }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Share my result</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"><X size={22} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <View style={styles.preview}>
            <Text style={styles.previewText} selectable>{text}</Text>
            <Text style={styles.previewUrl} selectable numberOfLines={1}>{url}</Text>
          </View>
          <View style={styles.grid}>
            {targets.map((t) => (
              <TouchableOpacity key={t.key} style={styles.target} onPress={() => open(t.href)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Share on ${t.label}`}>
                <View style={[styles.targetIcon, { backgroundColor: t.color }]}><t.Icon size={20} color="white" /></View>
                <Text style={styles.targetLabel}>{t.label}</Text>
              </TouchableOpacity>
            ))}
            {hasMore && (
              <TouchableOpacity style={styles.target} onPress={more} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="More share options">
                <View style={[styles.targetIcon, { backgroundColor: colors.textMuted }]}><MoreHorizontal size={20} color="white" /></View>
                <Text style={styles.targetLabel}>More</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={[styles.copyBtn, copied && styles.copyBtnDone]} onPress={copy} activeOpacity={0.8} accessibilityRole="button" accessibilityLiveRegion="polite">
            {copied ? <Check size={18} color="white" /> : <Copy size={18} color="white" />}
            <Text style={styles.copyText}>{copied ? 'Copied! Paste it anywhere' : 'Copy message'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center', padding: Platform.OS === 'web' ? 20 : 0 },
  sheet: {
    backgroundColor: c.surface, width: '100%', maxWidth: 520, padding: 22, paddingBottom: Platform.OS === 'web' ? 22 : 34, gap: 16,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0, borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: c.text },
  preview: { backgroundColor: c.primarySoft, borderRadius: 14, padding: 14, gap: 6 },
  previewText: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: c.text },
  previewUrl: { fontSize: 12.5, fontWeight: '700', color: c.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  target: { width: '25%', alignItems: 'center', gap: 6 },
  targetIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  targetLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted },
  copyBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 14 },
  copyBtnDone: { backgroundColor: '#15803d' },
  copyText: { color: 'white', fontSize: 15, fontWeight: '800' },
}));
