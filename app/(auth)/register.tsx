import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { generateUserTag } from '@/lib/utils';
import { AVATAR_EMOJIS } from '@/constants/emojis';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function RegisterScreen() {
  const { session, refreshProfile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🃏');
  const [defaultBuyin, setDefaultBuyin] = useState('50');
  const [loading, setLoading] = useState(false);

  // Generate a stable tag preview that stays the same during the session
  const previewTag = useMemo(() => generateUserTag(), []);

  const totalSteps = 3;

  const handleNext = () => {
    if (step === 1 && !username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!session?.user?.id) {
      Alert.alert('Session Error', 'No active session. Please sign in again.');
      router.replace('/(auth)/login');
      return;
    }

    setLoading(true);
    try {
      const userTag = generateUserTag();
      const { error } = await supabase.from('profiles').insert({
        id: session.user.id,
        email: session.user.email,
        username: username.trim(),
        user_tag: userTag,
        nickname: username.trim(), // use username as display name
        avatar_emoji: selectedEmoji,
        default_buyin: parseInt(defaultBuyin) || 50,
      });

      if (error) throw error;
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create profile');
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Choose your username</Text>
            <Text style={styles.stepSubtitle}>
              This is how other players will find you
            </Text>
            <Input
              placeholder="e.g. PokerPro"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="off"
              icon="person-outline"
            />
            {username.trim().length > 0 && (
              <View style={styles.tagPreview}>
                <Text style={styles.tagPreviewLabel}>Your ID will look like</Text>
                <Text style={styles.tagPreviewText}>
                  {username.trim()}#{previewTag}
                </Text>
              </View>
            )}
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Pick your avatar</Text>
            <Text style={styles.stepSubtitle}>
              Choose an emoji that represents you
            </Text>
            <View style={styles.selectedPreview}>
              <Text style={styles.selectedEmojiLarge}>{selectedEmoji}</Text>
            </View>
            <View style={styles.emojiGrid}>
              {AVATAR_EMOJIS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.emojiItem,
                    selectedEmoji === emoji && styles.emojiItemSelected,
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Default buy-in</Text>
            <Text style={styles.stepSubtitle}>
              Quick-add amount when joining games
            </Text>
            <Input
              placeholder="50"
              value={defaultBuyin}
              onChangeText={setDefaultBuyin}
              keyboardType="numeric"
              icon="cash-outline"
            />
            <View style={styles.quickAmounts}>
              {[25, 50, 100, 200, 500].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.quickAmount,
                    parseInt(defaultBuyin) === amount &&
                      styles.quickAmountSelected,
                  ]}
                  onPress={() => setDefaultBuyin(amount.toString())}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      parseInt(defaultBuyin) === amount &&
                        styles.quickAmountTextSelected,
                    ]}
                  >
                    {amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.progress}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i < step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <Text style={styles.stepIndicator}>
          Step {step} of {totalSteps}
        </Text>

        {renderStep()}

        <View style={styles.buttons}>
          {step > 1 && (
            <Button
              title="Back"
              onPress={() => setStep(step - 1)}
              variant="outline"
              size="lg"
              style={styles.backBtn}
            />
          )}
          <Button
            title={step === totalSteps ? 'Get Started' : 'Continue'}
            onPress={handleNext}
            loading={loading}
            size="lg"
            style={styles.nextBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    padding: Spacing.xxl,
    paddingTop: 60,
  },
  progress: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHighlight,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  stepIndicator: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.xxxl,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxxl,
  },
  tagPreview: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagPreviewLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginBottom: Spacing.xs,
  },
  tagPreviewText: {
    color: Colors.primary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  emojiItem: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.transparent,
  },
  emojiItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  emojiText: {
    fontSize: 24,
  },
  selectedPreview: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  selectedEmojiLarge: {
    fontSize: 64,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  quickAmount: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickAmountSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  quickAmountText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  quickAmountTextSelected: {
    color: Colors.primary,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xxxl,
    paddingBottom: Spacing.xxxl,
  },
  backBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
  },
});
