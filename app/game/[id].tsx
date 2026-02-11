import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Game, GamePlayer, PokerTable } from '@/lib/types';
import StatCard from '@/components/StatCard';
import PillFilter from '@/components/PillFilter';
import PlayerCard from '@/components/PlayerCard';
import Button from '@/components/Button';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [table, setTable] = useState<PokerTable | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showPasscode, setShowPasscode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Rebuy modal
  const [rebuyModal, setRebuyModal] = useState(false);
  const [rebuyPlayer, setRebuyPlayer] = useState<GamePlayer | null>(null);
  const [rebuyAmount, setRebuyAmount] = useState('');

  // Cashout modal
  const [cashoutModal, setCashoutModal] = useState(false);
  const [cashoutPlayer, setCashoutPlayer] = useState<GamePlayer | null>(null);
  const [cashoutAmount, setCashoutAmount] = useState('');

  const fetchGame = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('games')
      .select('*, poker_table:poker_tables(*), game_players(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    const gameData = data as any;
    setGame(gameData as Game);
    setPlayers((gameData.game_players || []) as GamePlayer[]);
    setTable(gameData.poker_table as PokerTable);
  }, [id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`game-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${id}` },
        () => fetchGame()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${id}` },
        () => fetchGame()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchGame]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGame();
    setRefreshing(false);
  };

  const activePlayers = players.filter((p) => !p.is_cashed_out);
  const cashedOutPlayers = players.filter((p) => p.is_cashed_out);
  const totalBuyins = players.reduce((sum, p) => sum + p.total_buyin, 0);
  const totalCashedOut = cashedOutPlayers.reduce(
    (sum, p) => sum + (p.cashout_amount || 0),
    0
  );
  const amountOnTable = totalBuyins - totalCashedOut;
  const currencySymbol = table?.currency_symbol || '$';
  const isLive = game?.status === 'live';

  const filteredActive = selectedPlayer
    ? activePlayers.filter((p) => p.id === selectedPlayer)
    : activePlayers;
  const filteredCashedOut = selectedPlayer
    ? cashedOutPlayers.filter((p) => p.id === selectedPlayer)
    : cashedOutPlayers;

  const handleQuickBuy = async (player: GamePlayer, amount: number) => {
    try {
      const newBuyin = player.total_buyin + amount;
      await supabase
        .from('game_players')
        .update({ total_buyin: newBuyin })
        .eq('id', player.id);

      await supabase.from('game_logs').insert({
        game_id: id,
        actor_id: profile?.id,
        action: 'rebuy',
        details: {
          player_name: player.player_name,
          amount,
          new_total: newBuyin,
        },
      });

      fetchGame();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRebuy = (player: GamePlayer) => {
    setRebuyPlayer(player);
    setRebuyAmount('');
    setRebuyModal(true);
  };

  const confirmRebuy = async () => {
    if (!rebuyPlayer || !rebuyAmount) return;
    const amount = parseInt(rebuyAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }

    await handleQuickBuy(rebuyPlayer, amount);
    setRebuyModal(false);
  };

  const handleCashout = (player: GamePlayer) => {
    setCashoutPlayer(player);
    setCashoutAmount('');
    setCashoutModal(true);
  };

  const confirmCashout = async () => {
    if (!cashoutPlayer || !cashoutAmount) return;
    const amount = parseInt(cashoutAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }

    try {
      await supabase
        .from('game_players')
        .update({
          cashout_amount: amount,
          is_cashed_out: true,
          cashed_out_at: new Date().toISOString(),
        })
        .eq('id', cashoutPlayer.id);

      await supabase.from('game_logs').insert({
        game_id: id,
        actor_id: profile?.id,
        action: 'cashout',
        details: {
          player_name: cashoutPlayer.player_name,
          buyin: cashoutPlayer.total_buyin,
          cashout: amount,
          net: amount - cashoutPlayer.total_buyin,
        },
      });

      setCashoutModal(false);
      fetchGame();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEndGame = () => {
    Alert.alert(
      'End Game',
      'Are you sure you want to end this game? Make sure all players have cashed out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Game',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('games')
                .update({
                  status: 'ended',
                  ended_at: new Date().toISOString(),
                })
                .eq('id', id);

              await supabase.from('game_logs').insert({
                game_id: id,
                actor_id: profile?.id,
                action: 'game_ended',
                details: { total_pot: totalBuyins },
              });

              router.replace(`/game/${id}/summary`);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const playerPills = players.map((p) => ({
    id: p.id,
    label: p.player_name,
  }));

  if (!game) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{table?.name || 'Game'}</Text>
          {isLive && (
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/game/${id}/logs`)}
            style={styles.headerBtn}
          >
            <Ionicons name="list" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowPasscode(!showPasscode)}
            style={styles.headerBtn}
          >
            <Ionicons
              name={showPasscode ? 'eye-off' : 'key'}
              size={20}
              color={Colors.text}
            />
          </TouchableOpacity>
          {isLive && (
            <TouchableOpacity onPress={handleEndGame} style={styles.endBtn}>
              <Text style={styles.endBtnText}>End</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Passcode banner */}
      {showPasscode && (
        <View style={styles.passcodeBanner}>
          <Text style={styles.passcodeLabel}>Game Code:</Text>
          <Text style={styles.passcodeValue}>{game.passcode}</Text>
        </View>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Total Buy-ins"
          value={`${currencySymbol}${totalBuyins}`}
          compact
        />
        <StatCard
          label="On Table"
          value={`${currencySymbol}${amountOnTable}`}
          color={Colors.primary}
          compact
        />
        <StatCard
          label="Players"
          value={players.length}
          compact
        />
      </View>

      {/* Player Filter Pills */}
      {players.length > 0 && (
        <PillFilter
          items={playerPills}
          selected={selectedPlayer}
          onSelect={setSelectedPlayer}
        />
      )}

      {/* Player List */}
      <FlatList
        data={[
          ...filteredActive.map((p) => ({ ...p, section: 'active' })),
          ...(filteredCashedOut.length > 0
            ? [{ id: 'separator', section: 'separator' } as any]
            : []),
          ...filteredCashedOut.map((p) => ({ ...p, section: 'cashed' })),
        ]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.section === 'separator') {
            return (
              <View style={styles.separator}>
                <Text style={styles.separatorText}>Cashed Out</Text>
              </View>
            );
          }
          return (
            <PlayerCard
              player={item as GamePlayer}
              currencySymbol={currencySymbol}
              onRebuy={handleRebuy}
              onCashout={handleCashout}
              onQuickBuy={handleQuickBuy}
              isGameLive={isLive}
            />
          );
        }}
        contentContainerStyle={styles.playerList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      />

      {/* Add Player FAB */}
      {isLive && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push(`/game/${id}/add-player`)}
        >
          <Ionicons name="person-add" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* Rebuy Modal */}
      <Modal visible={rebuyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Rebuy for {rebuyPlayer?.player_name}
            </Text>
            <Text style={styles.modalSubtitle}>
              Current buy-in: {currencySymbol}{rebuyPlayer?.total_buyin}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={rebuyAmount}
              onChangeText={setRebuyAmount}
              placeholder="Amount"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.quickAmountsRow}>
              {[25, 50, 100, 200].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.quickAmountBtn,
                    rebuyAmount === amt.toString() && styles.quickAmountBtnActive,
                  ]}
                  onPress={() => setRebuyAmount(amt.toString())}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      rebuyAmount === amt.toString() && styles.quickAmountTextActive,
                    ]}
                  >
                    {currencySymbol}{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setRebuyModal(false)}
                variant="ghost"
              />
              <Button title="Confirm Rebuy" onPress={confirmRebuy} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Cashout Modal */}
      <Modal visible={cashoutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Cash out {cashoutPlayer?.player_name}
            </Text>
            <Text style={styles.modalSubtitle}>
              Total buy-in: {currencySymbol}{cashoutPlayer?.total_buyin}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={cashoutAmount}
              onChangeText={setCashoutAmount}
              placeholder="Cash out amount"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setCashoutModal(false)}
                variant="ghost"
              />
              <Button title="Confirm Cash Out" onPress={confirmCashout} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  liveText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtn: {
    paddingHorizontal: Spacing.md,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  passcodeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  passcodeLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  passcodeValue: {
    color: Colors.primary,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    letterSpacing: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  playerList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  separator: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  separatorText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    paddingBottom: 48,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginBottom: Spacing.xl,
  },
  modalInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickAmountBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  quickAmountText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  quickAmountTextActive: {
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
});
