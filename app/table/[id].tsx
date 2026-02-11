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
import { PokerTable } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import StatCard from '@/components/StatCard';

type Period = 'week' | 'month' | 'year' | 'all';

interface LeaderboardEntry {
  player_name: string;
  user_id: string | null;
  avatar_emoji: string;
  total_buyin: number;
  total_cashout: number;
  net: number;
  games_played: number;
}

export default function TableDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [table, setTable] = useState<PokerTable | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [weekCashIn, setWeekCashIn] = useState(0);
  const [gameDates, setGameDates] = useState<string[]>([]);

  useEffect(() => {
    fetchTableData();
  }, [id, selectedPeriod]);

  const fetchTableData = async () => {
    if (!id) return;

    // Get table info
    const { data: tableData } = await supabase
      .from('poker_tables')
      .select('*')
      .eq('id', id)
      .single();

    if (tableData) setTable(tableData as PokerTable);

    // Get total games
    const { count } = await supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('table_id', id);
    setTotalGames(count || 0);

    // Get this week's cash in
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const { data: weekGames } = await supabase
      .from('games')
      .select('id, game_players(total_buyin)')
      .eq('table_id', id)
      .gte('created_at', weekStart.toISOString());

    const cashIn = (weekGames || []).reduce((sum: number, g: any) => {
      return sum + (g.game_players || []).reduce((s: number, p: any) => s + p.total_buyin, 0);
    }, 0);
    setWeekCashIn(cashIn);

    // Get game dates for calendar
    const { data: dates } = await supabase
      .from('games')
      .select('created_at')
      .eq('table_id', id);
    setGameDates((dates || []).map((d: any) => d.created_at.split('T')[0]));

    // Build leaderboard based on period
    let dateFilter: string | null = null;
    const now = new Date();

    if (selectedPeriod === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      dateFilter = start.toISOString();
    } else if (selectedPeriod === 'month') {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      dateFilter = start.toISOString();
    } else if (selectedPeriod === 'year') {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      dateFilter = start.toISOString();
    }

    let gamesQuery = supabase
      .from('games')
      .select('id')
      .eq('table_id', id);

    if (dateFilter) {
      gamesQuery = gamesQuery.gte('created_at', dateFilter);
    }

    const { data: periodGames } = await gamesQuery;
    const gameIds = (periodGames || []).map((g: any) => g.id);

    if (gameIds.length === 0) {
      setLeaderboard([]);
      return;
    }

    const { data: players } = await supabase
      .from('game_players')
      .select('*, profile:user_id(avatar_emoji)')
      .in('game_id', gameIds)
      .eq('is_cashed_out', true);

    // Aggregate by player
    const playerMap = new Map<string, LeaderboardEntry>();
    for (const p of (players || []) as any[]) {
      const key = p.user_id || p.player_name;
      const existing = playerMap.get(key);
      if (existing) {
        existing.total_buyin += p.total_buyin;
        existing.total_cashout += p.cashout_amount || 0;
        existing.net += (p.cashout_amount || 0) - p.total_buyin;
        existing.games_played += 1;
      } else {
        playerMap.set(key, {
          player_name: p.player_name,
          user_id: p.user_id,
          avatar_emoji: p.profile?.avatar_emoji || '🃏',
          total_buyin: p.total_buyin,
          total_cashout: p.cashout_amount || 0,
          net: (p.cashout_amount || 0) - p.total_buyin,
          games_played: 1,
        });
      }
    }

    const sorted = Array.from(playerMap.values()).sort((a, b) => b.net - a.net);
    setLeaderboard(sorted);
  };

  const periods: { key: Period; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'all', label: 'All Time' },
  ];

  const currencySymbol = table?.currency_symbol || '$';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{table?.name || 'Table'}</Text>
          {table?.location_name && (
            <Text style={styles.headerLocation}>{table.location_name}</Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Games Played" value={totalGames} />
          <StatCard
            label="This Week"
            value={`${currencySymbol}${weekCashIn}`}
            color={Colors.primary}
          />
        </View>

        {/* Period Tabs */}
        <View style={styles.periodTabs}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.periodTab,
                selectedPeriod === p.key && styles.periodTabActive,
              ]}
              onPress={() => setSelectedPeriod(p.key)}
            >
              <Text
                style={[
                  styles.periodTabText,
                  selectedPeriod === p.key && styles.periodTabTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calendar dots */}
        {gameDates.length > 0 && (
          <View style={styles.calendarHint}>
            <Ionicons name="calendar" size={14} color={Colors.textMuted} />
            <Text style={styles.calendarHintText}>
              {gameDates.length} game day{gameDates.length !== 1 ? 's' : ''} recorded
            </Text>
          </View>
        )}

        {/* Leaderboard */}
        <Text style={styles.sectionTitle}>Player Leaderboard</Text>
        {leaderboard.length === 0 ? (
          <View style={styles.emptyLeaderboard}>
            <Text style={styles.emptyText}>No data for this period</Text>
          </View>
        ) : (
          leaderboard.map((player, index) => (
            <View key={index} style={styles.leaderRow}>
              <Text style={styles.leaderRank}>#{index + 1}</Text>
              <Text style={styles.leaderEmoji}>{player.avatar_emoji}</Text>
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderName}>{player.player_name}</Text>
                <Text style={styles.leaderMeta}>
                  {player.games_played} game{player.games_played !== 1 ? 's' : ''} |
                  Buy-in: {currencySymbol}{player.total_buyin}
                </Text>
              </View>
              <Text
                style={[
                  styles.leaderNet,
                  player.net >= 0 ? styles.profit : styles.loss,
                ]}
              >
                {player.net >= 0 ? '+' : ''}{currencySymbol}{Math.abs(player.net)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
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
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerLocation: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  periodTabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  periodTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodTabActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  periodTabText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  periodTabTextActive: {
    color: Colors.primary,
  },
  calendarHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  calendarHintText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  emptyLeaderboard: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leaderRank: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '700',
    width: 28,
  },
  leaderEmoji: {
    fontSize: 24,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  leaderMeta: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  leaderNet: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  profit: {
    color: Colors.profit,
  },
  loss: {
    color: Colors.loss,
  },
});
