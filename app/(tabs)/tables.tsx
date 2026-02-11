import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { PokerTable } from '@/lib/types';
import SwipeableRow from '@/components/SwipeableRow';
import EmptyState from '@/components/EmptyState';
import Button from '@/components/Button';

interface TableWithStats extends PokerTable {
  game_count?: number;
  my_net?: number;
  last_played?: string;
}

export default function TablesScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tables, setTables] = useState<TableWithStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTables = async () => {
    if (!profile) return;

    // Get tables I'm a member of
    const { data: memberships } = await supabase
      .from('table_members')
      .select('table_id, poker_tables(*)')
      .eq('user_id', profile.id)
      .eq('is_removed', false);

    if (!memberships) {
      setTables([]);
      return;
    }

    const tableList: TableWithStats[] = [];

    for (const m of memberships) {
      const t = (m as any).poker_tables as PokerTable;
      if (!t) continue;

      // Get game count
      const { count } = await supabase
        .from('games')
        .select('id', { count: 'exact', head: true })
        .eq('table_id', t.id);

      // Get my net P/L at this table
      const { data: myGames } = await supabase
        .from('game_players')
        .select('total_buyin, cashout_amount, is_cashed_out, game_id, games!inner(table_id)')
        .eq('user_id', profile.id)
        .eq('games.table_id', t.id)
        .eq('is_cashed_out', true);

      const myNet = (myGames || []).reduce(
        (sum: number, g: any) => sum + ((g.cashout_amount || 0) - g.total_buyin),
        0
      );

      // Last game
      const { data: lastGame } = await supabase
        .from('games')
        .select('created_at')
        .eq('table_id', t.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      tableList.push({
        ...t,
        game_count: count || 0,
        my_net: myNet,
        last_played: lastGame?.created_at,
      });
    }

    setTables(tableList);
  };

  useFocusEffect(
    useCallback(() => {
      fetchTables();
    }, [profile])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTables();
    setRefreshing(false);
  };

  const handleRemoveTable = async (tableId: string) => {
    Alert.alert('Remove Table', 'Remove this table from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('table_members')
            .update({ is_removed: true })
            .eq('table_id', tableId)
            .eq('user_id', profile?.id);
          fetchTables();
        },
      },
    ]);
  };

  const currencySymbol = (table: TableWithStats) => table.currency_symbol || '$';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tables</Text>
        <TouchableOpacity
          onPress={() => router.push('/table/create')}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tables}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SwipeableRow
            leftActions={[
              {
                label: `${item.my_net !== undefined && item.my_net >= 0 ? '+' : ''}${currencySymbol(item)}${Math.abs(item.my_net || 0)}`,
                color: (item.my_net || 0) >= 0 ? Colors.primary : Colors.danger,
                onPress: () => {},
              },
            ]}
            rightActions={[
              {
                label: 'Remove',
                color: Colors.danger,
                onPress: () => handleRemoveTable(item.id),
              },
            ]}
          >
            <TouchableOpacity
              style={styles.tableCard}
              onPress={() => router.push(`/table/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.tableIconContainer}>
                <Ionicons name="grid" size={20} color={Colors.primary} />
              </View>
              <View style={styles.tableInfo}>
                <Text style={styles.tableName}>{item.name}</Text>
                <View style={styles.tableMetaRow}>
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.tableMeta}>
                    {item.location_name || 'No location'}
                  </Text>
                </View>
                <View style={styles.tableMetaRow}>
                  <Ionicons
                    name="game-controller-outline"
                    size={12}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.tableMeta}>
                    {item.game_count} games
                  </Text>
                  <Text style={styles.tableMeta}> | </Text>
                  <Text style={styles.tableCurrency}>{item.currency}</Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </SwipeableRow>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="grid-outline"
            title="No tables yet"
            subtitle="Create a table or join a game to get started"
            action={
              <Button
                title="Create Table"
                onPress={() => router.push('/table/create')}
                size="md"
              />
            }
          />
        }
      />
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
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  tableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  tableIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableInfo: {
    flex: 1,
  },
  tableName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  tableMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tableMeta: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  tableCurrency: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
