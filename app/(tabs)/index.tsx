import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Game } from '@/lib/types';
import GameCard from '@/components/GameCard';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import { useFocusEffect } from 'expo-router';

export default function GamesScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    if (!profile) return;
    try {
      // Fetch games where the user is a participant or creator
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          poker_table:poker_tables(*),
          game_players(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter games where the user is a participant or creator
      const myGames = (data || []).filter(
        (g: any) =>
          g.created_by === profile.id ||
          g.game_players?.some((p: any) => p.user_id === profile.id)
      );

      setGames(myGames as Game[]);
    } catch (err) {
      console.error('Error fetching games:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGames();
    }, [profile])
  );

  useEffect(() => {
    if (!profile) return;
    // Subscribe to game changes
    const channel = supabase
      .channel('games-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        () => fetchGames()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players' },
        () => fetchGames()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGames();
    setRefreshing(false);
  };

  const liveGames = games.filter((g) => g.status === 'live');
  const pastGames = games.filter((g) => g.status === 'ended');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.name}>{profile?.nickname || 'Player'}</Text>
      </View>

      <FlatList
        data={games}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GameCard
            game={item}
            onPress={() => router.push(`/game/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          liveGames.length > 0 ? (
            <View style={styles.sectionHeader}>
              <View style={styles.liveIndicator} />
              <Text style={styles.sectionTitle}>Live Games</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{liveGames.length}</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="game-controller-outline"
              title="No games yet"
              subtitle="Create a new game or join an existing one to get started"
            />
          ) : null
        }
      />

      <View style={styles.bottomButtons}>
        <Button
          title="New Game"
          onPress={() => router.push('/game/create')}
          size="lg"
          style={styles.newGameBtn}
          icon={<Ionicons name="add" size={20} color={Colors.white} />}
        />
        <Button
          title="Join"
          onPress={() => router.push('/game/join')}
          variant="secondary"
          size="lg"
          style={styles.joinBtn}
          icon={<Ionicons name="keypad" size={20} color={Colors.text} />}
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
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
  },
  welcome: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.background,
  },
  newGameBtn: {
    flex: 1,
  },
  joinBtn: {
    flex: 1,
  },
});
