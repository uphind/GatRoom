import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Button from '@/components/Button';

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const router = useRouter();

  const [totalGames, setTotalGames] = useState(0);
  const [monthlyNet, setMonthlyNet] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [biggestWin, setBiggestWin] = useState(0);

  const [editingBuyin, setEditingBuyin] = useState(false);
  const [buyinValue, setBuyinValue] = useState('');
  const [editingRules, setEditingRules] = useState(false);
  const [rulesValue, setRulesValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      if (profile) {
        setBuyinValue(profile.default_buyin?.toString() || '50');
        setRulesValue(profile.house_rules || '');
      }
    }, [profile])
  );

  const fetchStats = async () => {
    if (!profile) return;

    // Total games played
    const { count } = await supabase
      .from('game_players')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id);
    setTotalGames(count || 0);

    // Monthly net
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthlyGames } = await supabase
      .from('game_players')
      .select('total_buyin, cashout_amount, is_cashed_out, games!inner(created_at)')
      .eq('user_id', profile.id)
      .eq('is_cashed_out', true)
      .gte('games.created_at', monthStart.toISOString());

    const mNet = (monthlyGames || []).reduce(
      (sum: number, g: any) => sum + ((g.cashout_amount || 0) - g.total_buyin),
      0
    );
    setMonthlyNet(mNet);

    // All time stats
    const { data: allGames } = await supabase
      .from('game_players')
      .select('total_buyin, cashout_amount, is_cashed_out')
      .eq('user_id', profile.id)
      .eq('is_cashed_out', true);

    let wins = 0;
    let biggest = 0;
    for (const g of (allGames || []) as any[]) {
      const net = (g.cashout_amount || 0) - g.total_buyin;
      if (net > 0) {
        wins++;
        if (net > biggest) biggest = net;
      }
    }
    setTotalWins(wins);
    setBiggestWin(biggest);
  };

  const handleSaveBuyin = async () => {
    const amount = parseInt(buyinValue);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    await supabase
      .from('profiles')
      .update({ default_buyin: amount })
      .eq('id', profile?.id);
    await refreshProfile();
    setEditingBuyin(false);
  };

  const handleSaveRules = async () => {
    await supabase
      .from('profiles')
      .update({ house_rules: rulesValue })
      .eq('id', profile?.id);
    await refreshProfile();
    setEditingRules(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // In production, this would call a server function
            await signOut();
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarEmoji}>{profile.avatar_emoji}</Text>
          </View>
          <Text style={styles.nickname}>{profile.nickname}</Text>
          <Text style={styles.userTag}>
            {profile.username}#{profile.user_tag}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalGames}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                monthlyNet >= 0 ? styles.profit : styles.loss,
              ]}
            >
              {monthlyNet >= 0 ? '+' : ''}{monthlyNet}
            </Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalWins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.profit]}>{biggestWin}</Text>
            <Text style={styles.statLabel}>Best Win</Text>
          </View>
        </View>

        {/* Friends */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/friends')}
        >
          <Ionicons name="people" size={22} color={Colors.primary} />
          <Text style={styles.menuItemText}>Friends</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>

        {/* Default Buy-in */}
        <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <Ionicons name="cash-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.settingLabel}>Default Buy-in</Text>
            {!editingBuyin && (
              <TouchableOpacity onPress={() => setEditingBuyin(true)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {editingBuyin ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={buyinValue}
                onChangeText={setBuyinValue}
                keyboardType="numeric"
                autoFocus
              />
              <Button title="Save" onPress={handleSaveBuyin} size="sm" />
              <Button
                title="Cancel"
                onPress={() => setEditingBuyin(false)}
                variant="ghost"
                size="sm"
              />
            </View>
          ) : (
            <Text style={styles.settingValue}>{profile.default_buyin}</Text>
          )}
        </View>

        {/* House Rules */}
        <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <Ionicons name="document-text-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.settingLabel}>House Rules</Text>
            {!editingRules && (
              <TouchableOpacity onPress={() => setEditingRules(true)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {editingRules ? (
            <View>
              <TextInput
                style={[styles.editInput, styles.editInputMultiline]}
                value={rulesValue}
                onChangeText={setRulesValue}
                multiline
                numberOfLines={4}
                placeholder="Enter your house rules..."
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <View style={styles.editRow}>
                <Button title="Save" onPress={handleSaveRules} size="sm" />
                <Button
                  title="Cancel"
                  onPress={() => setEditingRules(false)}
                  variant="ghost"
                  size="sm"
                />
              </View>
            </View>
          ) : (
            <Text style={styles.settingValue}>
              {profile.house_rules || 'No rules set'}
            </Text>
          )}
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>
          Account
        </Text>

        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          size="lg"
          fullWidth
          style={{ marginBottom: Spacing.md }}
        />

        <Button
          title="Delete Account"
          onPress={handleDeleteAccount}
          variant="danger"
          size="lg"
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: 120,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  nickname: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  userTag: {
    fontSize: FontSize.md,
    color: Colors.primary,
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xxl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  profit: {
    color: Colors.profit,
  },
  loss: {
    color: Colors.loss,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xxl,
  },
  menuItemText: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  settingItem: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  settingLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  settingValue: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  editLink: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  editRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  editInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  editInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    flex: 0,
    width: '100%',
    marginBottom: Spacing.sm,
  },
});
