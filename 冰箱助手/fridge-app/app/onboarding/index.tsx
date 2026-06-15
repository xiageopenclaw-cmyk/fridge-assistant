import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Radius } from '../../theme';

// In-memory store (web) / AsyncStorage (native)
// We avoid static import of AsyncStorage because it crashes Metro web bundle
const memStore: Record<string, string> = {};
const save = async (k: string, v: string) => { memStore[k] = v; };
const load = async (k: string): Promise<string | null> => memStore[k] || null;
const remove = async (k: string) => { delete memStore[k]; };

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Onboarding data ──

type StepKey = 'family' | 'taste' | 'allergy' | 'goal' | 'time';

interface StepConfig {
  key: StepKey;
  emoji: string;
  title: string;
  subtitle: string;
  options: { label: string; value: string; emoji?: string; default?: boolean }[];
  multi?: boolean;
  allowSkip?: boolean;
  minSelect?: number;
}

const CUISINES = ['中式', '西式', '日韩', '东南亚', '不辣', '无辣不欢', '清淡', '重口'];
const ALLERGENS = ['花生', '海鲜', '牛奶', '鸡蛋', '麸质', '大豆'];

const STEPS: StepConfig[] = [
  {
    key: 'family',
    emoji: '🏠',
    title: '家里几口人吃饭？',
    subtitle: '我会根据人数推荐合适的份量',
    options: ['1', '2', '3', '4', '5', '6'].map((v) => ({ label: `${v}人`, value: v })),
    minSelect: 1,
  },
  {
    key: 'taste',
    emoji: '🍳',
    title: '喜欢什么口味？',
    subtitle: '可以多选，以后还能改',
    options: CUISINES.map((c) => ({ label: c, value: c, default: c === '中式' || c === '清淡' })),
    multi: true,
    minSelect: 1,
  },
  {
    key: 'allergy',
    emoji: '🚫',
    title: '有什么不能吃的？',
    subtitle: '过敏和忌口，绝不能含糊',
    options: ALLERGENS.map((a) => ({ label: a, value: a })),
    multi: true,
    allowSkip: true,
  },
  {
    key: 'goal',
    emoji: '💪',
    title: '有什么饮食需求？',
    subtitle: '选一个，我会调整营养搭配',
    options: [
      { label: '无特殊需求', value: 'none', emoji: '🟢', default: true },
      { label: '健身增肌', value: 'muscle', emoji: '💪' },
      { label: '减脂控卡', value: 'fatloss', emoji: '🔥' },
      { label: '孕期营养', value: 'pregnancy', emoji: '🤰' },
      { label: '糖尿病饮食', value: 'diabetes', emoji: '🩸' },
      { label: '素食', value: 'vegan', emoji: '🥬' },
    ],
    minSelect: 1,
  },
  {
    key: 'time',
    emoji: '⏱',
    title: '一般多久搞定一顿饭？',
    subtitle: '按你的节奏推荐菜谱',
    options: [
      { label: '快手党（≤15分钟）', value: '15min', emoji: '⚡' },
      { label: '日常烹饪（≤30分钟）', value: '30min', emoji: '🍳' },
      { label: '享受厨房（不限时）', value: 'any', emoji: '🎨' },
    ],
    minSelect: 1,
  },
];

// ── Profile persistence ──

interface UserProfile {
  familySize: number;
  preferences: string[];
  allergies: string[];
  goal: string;
  cookTime: string;
  completed: boolean;
}

async function saveProfile(profile: UserProfile) {
  await save('user_profile', JSON.stringify(profile));
}

// ── Page ──

export default function OnboardingScreen() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [selections, setSelections] = useState<Record<StepKey, string[]>>({
    family: [],
    taste: STEPS[1].options.filter((o) => o.default).map((o) => o.value),
    allergy: [],
    goal: [],
    time: [],
  });
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const step = STEPS[stepIdx];

  // crossfade between steps
  const goToStep = useCallback(
    (next: number) => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setStepIdx(next);
    },
    [fadeAnim],
  );

  const currentValues = selections[step.key];

  const toggleOption = (val: string) => {
    setSelections((prev) => {
      const cur = prev[step.key];
      if (step.multi) {
        const next = cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
        return { ...prev, [step.key]: next };
      }
      return { ...prev, [step.key]: [val] };
    });
  };

  const canNext = step.allowSkip
    ? true
    : currentValues.length >= (step.minSelect ?? 1);

  const handleNext = () => {
    if (!canNext) return;
    if (stepIdx < STEPS.length - 1) {
      goToStep(stepIdx + 1);
    } else {
      const profile: UserProfile = {
        familySize: parseInt(selections.family[0] || '2', 10),
        preferences: selections.taste,
        allergies: selections.allergy,
        goal: selections.goal[0] || 'none',
        cookTime: selections.time[0] || '30min',
        completed: true,
      };
      saveProfile(profile).then(() => {
        router.replace('/');
      });
    }
  };

  const handlePrev = () => {
    if (stepIdx > 0) goToStep(stepIdx - 1);
  };

  const handleSkip = () => {
    setSelections((prev) => ({ ...prev, [step.key]: [] }));
    if (stepIdx < STEPS.length - 1) goToStep(stepIdx + 1);
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={stepIdx === 0 ? () => router.replace('/') : handlePrev}>
          <Text style={styles.headerAction}>
            {stepIdx === 0 ? '跳过' : '← 上一步'}
          </Text>
        </TouchableOpacity>
        <View style={styles.progressDots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === stepIdx && styles.dotActive, i < stepIdx && styles.dotDone]}
            />
          ))}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Step content */}
      <Animated.View style={[styles.body, { opacity: fadeAnim }]}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{step.emoji}</Text>
        </View>

        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.subtitle}>{step.subtitle}</Text>

        <View style={styles.optionsWrap}>
          {step.options.map((opt) => {
            const selected = currentValues.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionCard, selected && styles.optionCardOn]}
                activeOpacity={0.7}
                onPress={() => toggleOption(opt.value)}
              >
                {opt.emoji && <Text style={styles.optionEmoji}>{opt.emoji}</Text>}
                <Text style={[styles.optionLabel, selected && styles.optionLabelOn]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {step.key === 'allergy' && (
          <View style={styles.customInputWrap}>
            <Text style={styles.customHint}>
              输入其他忌口食材，用逗号分隔（如：香菜, 内脏, 苦瓜）
            </Text>
            <TouchableOpacity style={styles.customAdd}>
              <Text style={styles.customAddText}>+ 添加</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Bottom */}
      <View style={styles.footer}>
        {step.allowSkip && currentValues.length === 0 && (
          <TouchableOpacity style={styles.skipLink} onPress={handleSkip}>
            <Text style={styles.skipLinkText}>没有忌口，跳过</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, !canNext && styles.nextBtnOff]}
          activeOpacity={0.8}
          onPress={handleNext}
          disabled={!canNext}
        >
          <Text style={styles.nextBtnText}>
            {stepIdx === STEPS.length - 1 ? '开始使用 🎉' : '下一步'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerAction: {
    fontSize: Fonts.sizes.sm,
    color: Colors.subtitle,
    fontWeight: Fonts.weights.medium,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  progressDots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.divider,
  },
  dotActive: {
    backgroundColor: Colors.greenPrimary,
    width: 24,
  },
  dotDone: {
    backgroundColor: Colors.greenLight,
  },

  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    justifyContent: 'center',
  },

  hero: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#eef4ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  heroEmoji: { fontSize: 56 },

  title: {
    fontSize: 24,
    fontWeight: Fonts.weights.bold,
    color: Colors.title,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.subtitle,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },

  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionCardOn: {
    backgroundColor: '#e8f2de',
    borderColor: Colors.greenPrimary,
  },
  optionEmoji: { fontSize: 18 },
  optionLabel: {
    fontSize: Fonts.sizes.md,
    color: Colors.body,
    fontWeight: Fonts.weights.medium,
  },
  optionLabelOn: {
    color: Colors.greenDark,
    fontWeight: Fonts.weights.bold,
  },

  customInputWrap: {
    marginTop: 20,
    alignItems: 'center',
    gap: 10,
  },
  customHint: {
    fontSize: Fonts.sizes.xs,
    color: Colors.hint,
    textAlign: 'center',
  },
  customAdd: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    backgroundColor: '#f4f6f0',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  customAddText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.subtitle,
  },

  footer: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 30,
    gap: 12,
  },
  skipLink: {
    paddingVertical: 8,
  },
  skipLinkText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.hint,
    textDecorationLine: 'underline',
  },
  nextBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.greenPrimary,
    alignItems: 'center',
  },
  nextBtnOff: {
    backgroundColor: Colors.divider,
  },
  nextBtnText: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },
});
