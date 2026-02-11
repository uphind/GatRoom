import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { GamePlayer } from '@/lib/types';
import SwipeableRow from './SwipeableRow';

interface PlayerCardProps {
  player: GamePlayer;
  currencySymbol: string;
  onRebuy: (player: GamePlayer) => void;
  onCashout: (player: GamePlayer) => void;
  onQuickBuy: (player: GamePlayer, amount: number) => void;
  isGameLive: boolean;
}

export default function PlayerCard({
  player,
  currencySymbol,
  onRebuy,
  onCashout,
  onQuickBuy,
  isGameLive,
}: PlayerCardProps) {
  const net = player.is_cashed_out
    ? (player.cashout_amount || 0) - player.total_buyin
    : 0;
  const isPositive = net >= 0;

  if (player.is_cashed_out) {
    return (
      <View style={[styles.card, styles.cardCashedOut]}>
        <View style={styles.cardContent}>
          <View style={styles.leftSection}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarText}>
                {player.player_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.name, styles.nameCashedOut]}>
                {player.player_name}
              </Text>
              <Text style={styles.buyinLabel}>
                Buy-in: {currencySymbol}{player.total_buyin}
              </Text>
            </View>
          </View>
          <View style={styles.rightSection}>
            <Text style={styles.cashedOutLabel}>
              Took: {currencySymbol}{player.cashout_amount || 0}
            </Text>
            <Text
              style={[
                styles.netAmount,
                isPositive ? styles.profit : styles.loss,
              ]}
            >
              {isPositive ? '+' : '-'}{currencySymbol}{Math.abs(net)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const leftActions = isGameLive
    ? [
        {
          label: `+${currencySymbol}50`,
          color: Colors.primary,
          onPress: () => onQuickBuy(player, 50),
        },
        {
          label: `+${currencySymbol}100`,
          color: Colors.primaryDark,
          onPress: () => onQuickBuy(player, 100),
        },
      ]
    : [];

  const rightActions = isGameLive
    ? [
        {
          label: 'Cash Out',
          color: Colors.warning,
          onPress: () => onCashout(player),
        },
      ]
    : [];

  return (
    <SwipeableRow leftActions={leftActions} rightActions={rightActions}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.leftSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {player.player_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.name}>{player.player_name}</Text>
              <Text style={styles.buyinAmount}>
                {currencySymbol}{player.total_buyin}
              </Text>
            </View>
          </View>
          {isGameLive && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onRebuy(player)}
              >
                <Ionicons name="add-circle" size={18} color={Colors.primary} />
                <Text style={styles.actionBtnText}>Rebuy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cashoutBtn]}
                onPress={() => onCashout(player)}
              >
                <Ionicons name="exit-outline" size={18} color={Colors.warning} />
                <Text style={[styles.actionBtnText, styles.cashoutBtnText]}>
                  Cash Out
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardCashedOut: {
    opacity: 0.5,
    backgroundColor: Colors.surfaceLight,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: FontSize.lg,
  },
  name: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  nameCashedOut: {
    color: Colors.textSecondary,
  },
  buyinAmount: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginTop: 2,
  },
  buyinLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  cashedOutLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  netAmount: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginTop: 2,
  },
  profit: {
    color: Colors.profit,
  },
  loss: {
    color: Colors.loss,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
  },
  cashoutBtn: {
    backgroundColor: Colors.warning + '22',
  },
  actionBtnText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  cashoutBtnText: {
    color: Colors.warning,
  },
});
