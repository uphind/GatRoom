import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Profile, GamePlayer } from '@/lib/types';
import { QUICK_AMOUNTS } from '@/constants/emojis';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function AddPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [usualPlayers, setUsualPlayers] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [existingPlayerIds, setExistingPlayerIds] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [userIdSearch, setUserIdSearch] = useState('');
  const [buyinAmount, setBuyinAmount] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!profile || !id) return;

    // Get game info to find table_id
    const { data: game } = await supabase
      .from('games')
      .select('table_id')
      .eq('id', id)
      .single();

    if (!game) return;

    // Get existing players in this game
    const { data: gamePlayers } = await supabase
      .from('game_players')
      .select('user_id')
      .eq('game_id', id);

    const existingIds = (gamePlayers || [])
      .map((p: any) => p.user_id)
      .filter(Boolean);
    setExistingPlayerIds(existingIds);

    // Get usual players from this table
    const { data: tableMembers } = await supabase
      .from('table_members')
      .select('user_id, profiles:user_id(*)')
      .eq('table_id', game.table_id)
      .eq('is_removed', false);

    const usual = (tableMembers || [])
      .map((m: any) => m.profiles)
      .filter((p: any) => p && p.id !== profile.id && !existingIds.includes(p.id));
    setUsualPlayers(usual as Profile[]);

    // Get friends
    const { data: friendships } = await supabase
      .from('friendships')
      .select('friend_id, friend:friend_id(*)')
      .eq('user_id', profile.id)
      .eq('status', 'accepted');

    const friendsList = (friendships || [])
      .map((f: any) => f.friend)
      .filter((f: any) => f && !existingIds.includes(f.id));
    setFriends(friendsList as Profile[]);

    // Set default buy-in
    setBuyinAmount(profile.default_buyin?.toString() || '50');
  };

  const selectExistingPlayer = (p: Profile) => {
    setSelectedUser(p);
    setPlayerName(p.nickname);
    setBuyinAmount(p.default_buyin?.toString() || buyinAmount);
  };

  const handleSearchUser = async () => {
    if (!userIdSearch.trim()) return;
    const tag = userIdSearch.replace('#', '').trim();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_tag', tag)
      .single();

    if (error || !data) {
      Alert.alert('Not Found', 'No user found with that ID');
      return;
    }

    selectExistingPlayer(data as Profile);
  };

  const handleConfirm = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }
    const buyin = parseInt(buyinAmount) || 0;
    if (buyin <= 0) {
      Alert.alert('Error', 'Please enter a valid buy-in amount');
      return;
    }

    setLoading(true);
    try {
      await supabase.from('game_players').insert({
        game_id: id,
        user_id: selectedUser?.id || null,
        player_name: playerName.trim(),
        total_buyin: buyin,
      });

      // Log
      await supabase.from('game_logs').insert({
        game_id: id,
        actor_id: profile?.id,
        action: 'player_added',
        details: {
          player_name: playerName.trim(),
          buyin,
          added_by: profile?.nickname,
        },
      });

      // Add to table members if they have a user_id
      if (selectedUser?.id) {
        const { data: game } = await supabase
          .from('games')
          .select('table_id')
          .eq('id', id)
          .single();

        if (game) {
          await supabase.from('table_members').upsert({
            table_id: game.table_id,
            user_id: selectedUser.id,
          }, { onConflict: 'table_id,user_id' });
        }
      }

      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Player</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Usual Players */}
        {usualPlayers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Usual Players</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              {usualPlayers.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.pill,
                    selectedUser?.id === p.id && styles.pillSelected,
                  ]}
                  onPress={() => selectExistingPlayer(p)}
                >
                  <Text style={styles.pillEmoji}>{p.avatar_emoji}</Text>
                  <Text
                    style={[
                      styles.pillText,
                      selectedUser?.id === p.id && styles.pillTextSelected,
                    ]}
                  >
                    {p.nickname}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Friends */}
        {friends.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Friends</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              {friends.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.pill,
                    selectedUser?.id === f.id && styles.pillSelected,
                  ]}
                  onPress={() => selectExistingPlayer(f)}
                >
                  <Text style={styles.pillEmoji}>{f.avatar_emoji}</Text>
                  <Text
                    style={[
                      styles.pillText,
                      selectedUser?.id === f.id && styles.pillTextSelected,
                    ]}
                  >
                    {f.nickname}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Manual Entry */}
        <Text style={styles.sectionTitle}>Player Details</Text>

        <Input
          label="Player Name"
          placeholder="Enter player name"
          value={playerName}
          onChangeText={(text) => {
            setPlayerName(text);
            if (selectedUser) setSelectedUser(null);
          }}
          icon="person-outline"
        />

        <View style={styles.userIdRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="User #ID (optional)"
              placeholder="#12345"
              value={userIdSearch}
              onChangeText={setUserIdSearch}
              icon="search-outline"
            />
          </View>
          <Button
            title="Find"
            onPress={handleSearchUser}
            variant="outline"
            size="sm"
            style={styles.findBtn}
          />
        </View>

        {selectedUser && (
          <View style={styles.selectedBanner}>
            <Text style={styles.selectedEmoji}>{selectedUser.avatar_emoji}</Text>
            <View>
              <Text style={styles.selectedName}>{selectedUser.nickname}</Text>
              <Text style={styles.selectedTag}>
                {selectedUser.username}#{selectedUser.user_tag}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Buy-in Amount</Text>

        <Input
          placeholder="Amount"
          value={buyinAmount}
          onChangeText={setBuyinAmount}
          keyboardType="numeric"
          icon="cash-outline"
        />

        <View style={styles.quickAmounts}>
          {QUICK_AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.quickAmount,
                buyinAmount === amount.toString() && styles.quickAmountActive,
              ]}
              onPress={() => setBuyinAmount(amount.toString())}
            >
              <Text
                style={[
                  styles.quickAmountText,
                  buyinAmount === amount.toString() &&
                    styles.quickAmountTextActive,
                ]}
              >
                {amount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Confirm Player"
          onPress={handleConfirm}
          loading={loading}
          disabled={!playerName.trim()}
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  pillsRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  pillEmoji: {
    fontSize: 16,
  },
  pillText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: Colors.primary,
  },
  userIdRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  findBtn: {
    marginBottom: Spacing.lg,
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  selectedEmoji: {
    fontSize: 32,
  },
  selectedName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  selectedTag: {
    color: Colors.primary,
    fontSize: FontSize.sm,
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
  quickAmountActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  quickAmountText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  quickAmountTextActive: {
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.background,
  },
});
