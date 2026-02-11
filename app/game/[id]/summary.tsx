import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Game, GamePlayer, PokerTable } from '@/lib/types';
import { getDuration, formatDate } from '@/lib/utils';
import Button from '@/components/Button';

interface PlayerResult {
  player_name: string;
  total_buyin: number;
  cashout_amount: number;
  net: number;
  avatar_emoji?: string;
}

export default function GameSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [table, setTable] = useState<PokerTable | null>(null);
  const [results, setResults] = useState<PlayerResult[]>([]);

  useEffect(() => {
    fetchSummary();
  }, [id]);

  const fetchSummary = async () => {
    const { data } = await supabase
      .from('games')
      .select('*, poker_table:poker_tables(*), game_players(*, profile:user_id(avatar_emoji))')
      .eq('id', id)
      .single();

    if (!data) return;

    const gameData = data as any;
    setGame(gameData as Game);
    setTable(gameData.poker_table as PokerTable);

    const playerResults: PlayerResult[] = (gameData.game_players || [])
      .map((p: any) => ({
        player_name: p.player_name,
        total_buyin: p.total_buyin,
        cashout_amount: p.cashout_amount || 0,
        net: (p.cashout_amount || 0) - p.total_buyin,
        avatar_emoji: p.profile?.avatar_emoji,
      }))
      .sort((a: PlayerResult, b: PlayerResult) => b.net - a.net);

    setResults(playerResults);
  };

  const totalPot = results.reduce((sum, r) => sum + r.total_buyin, 0);
  const currencySymbol = table?.currency_symbol || '$';
  const top3 = results.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];

  if (!game) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Game Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Game Info */}
        <View style={styles.gameInfo}>
          <Text style={styles.tableName}>{table?.name}</Text>
          <Text style={styles.gameDate}>{formatDate(game.created_at)}</Text>
          {game.ended_at && (
            <Text style={styles.duration}>
              Duration: {getDuration(game.created_at, game.ended_at)}
            </Text>
          )}
        </View>

        {/* Total Pot */}
        <View style={styles.potCard}>
          <Text style={styles.potLabel}>Total Pot</Text>
          <Text style={styles.potValue}>
            {currencySymbol}{totalPot}
          </Text>
          <Text style={styles.potPlayers}>
            {results.length} player{results.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Podium - Top 3 */}
        {top3.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top Earners</Text>
            <View style={styles.podium}>
              {top3.map((player, index) => (
                <View
                  key={index}
                  style={[
                    styles.podiumItem,
                    index === 0 && styles.podiumFirst,
                  ]}
                >
                  <Text style={styles.podiumMedal}>{medals[index]}</Text>
                  <Text style={styles.podiumEmoji}>
                    {player.avatar_emoji || '🃏'}
                  </Text>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {player.player_name}
                  </Text>
                  <Text
                    style={[
                      styles.podiumNet,
                      player.net >= 0 ? styles.profit : styles.loss,
                    ]}
                  >
                    {player.net >= 0 ? '+' : ''}
                    {currencySymbol}{Math.abs(player.net)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Full Results */}
        <Text style={styles.sectionTitle}>All Players</Text>
        {results.map((player, index) => (
          <View key={index} style={styles.resultRow}>
            <View style={styles.resultLeft}>
              <Text style={styles.resultRank}>#{index + 1}</Text>
              <Text style={styles.resultEmoji}>
                {player.avatar_emoji || '🃏'}
              </Text>
              <View>
                <Text style={styles.resultName}>{player.player_name}</Text>
                <Text style={styles.resultBuyin}>
                  Buy-in: {currencySymbol}{player.total_buyin} | Took:{' '}
                  {currencySymbol}{player.cashout_amount}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.resultNet,
                player.net >= 0 ? styles.profit : styles.loss,
              ]}
            >
              {player.net >= 0 ? '+' : ''}
              {currencySymbol}{Math.abs(player.net)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Back to Games"
          onPress={() => router.replace('/(tabs)')}
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  gameInfo: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  tableName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  gameDate: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  duration: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  potCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    marginBottom: Spacing.xxl,
  },
  potLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  potValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  potPlayers: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  podium: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  podiumFirst: {
    borderColor: Colors.primary + '66',
    backgroundColor: '#0f1f0f',
  },
  podiumMedal: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  podiumEmoji: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  podiumName: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  podiumNet: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginTop: Spacing.xs,
  },
  profit: {
    color: Colors.profit,
  },
  loss: {
    color: Colors.loss,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  resultRank: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '700',
    width: 24,
  },
  resultEmoji: {
    fontSize: 24,
  },
  resultName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  resultBuyin: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  resultNet: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.background,
  },
});
