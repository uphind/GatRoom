import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Game } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/utils';

interface GameCardProps {
  game: Game;
  onPress: () => void;
}

export default function GameCard({ game, onPress }: GameCardProps) {
  const isLive = game.status === 'live';
  const playerCount = game.game_players?.length || 0;
  const totalPot = game.game_players?.reduce((sum, p) => sum + p.total_buyin, 0) || 0;
  const currencySymbol = game.poker_table?.currency_symbol || '$';
  const timeAgo = formatDistanceToNow(game.created_at);

  return (
    <TouchableOpacity
      style={[styles.card, isLive && styles.cardLive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isLive && styles.statusLive]} />
          <Text style={[styles.statusText, isLive && styles.statusLiveText]}>
            {isLive ? 'LIVE' : 'ENDED'}
          </Text>
        </View>
        <View style={styles.potContainer}>
          <Text style={styles.potAmount}>
            {currencySymbol}{totalPot}
          </Text>
          <Text style={styles.potLabel}>total pot</Text>
        </View>
      </View>

      <Text style={styles.gameNumber}>#{game.game_number}</Text>

      <View style={styles.locationRow}>
        <Ionicons name="location" size={14} color={Colors.textSecondary} />
        <Text style={styles.locationText}>
          {game.poker_table?.name || 'Unknown Table'}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.playersRow}>
          <Ionicons name="people" size={16} color={Colors.textSecondary} />
          <Text style={styles.playersText}>
            <Text style={styles.playersCount}>{playerCount}</Text> playing
          </Text>
        </View>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.timeText}>{timeAgo}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  cardLive: {
    borderColor: Colors.primary + '55',
    backgroundColor: '#0f1f0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.ended,
  },
  statusLive: {
    backgroundColor: Colors.live,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.ended,
    letterSpacing: 1,
  },
  statusLiveText: {
    color: Colors.live,
  },
  potContainer: {
    alignItems: 'flex-end',
  },
  potAmount: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  potLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  gameNumber: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  locationText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  playersText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  playersCount: {
    color: Colors.text,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
