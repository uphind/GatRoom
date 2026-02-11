import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { GameLog } from '@/lib/types';
import { formatTime, formatDate } from '@/lib/utils';

const ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  game_created: 'flag',
  game_ended: 'stop-circle',
  player_joined: 'person-add',
  player_added: 'person-add',
  rebuy: 'add-circle',
  cashout: 'exit',
};

const ACTION_COLORS: Record<string, string> = {
  game_created: Colors.primary,
  game_ended: Colors.danger,
  player_joined: Colors.primary,
  player_added: Colors.primary,
  rebuy: Colors.warning,
  cashout: Colors.textSecondary,
};

function formatLogMessage(log: GameLog): string {
  const details = log.details as any;
  switch (log.action) {
    case 'game_created':
      return `Game created at ${details?.table_name || 'table'}`;
    case 'game_ended':
      return `Game ended. Total pot: ${details?.total_pot || 0}`;
    case 'player_joined':
      return `${details?.player_name} joined with ${details?.buyin || 0}`;
    case 'player_added':
      return `${details?.player_name} added by ${details?.added_by || 'host'} with ${details?.buyin || 0}`;
    case 'rebuy':
      return `${details?.player_name} rebought +${details?.amount || 0} (total: ${details?.new_total || 0})`;
    case 'cashout':
      const net = (details?.cashout || 0) - (details?.buyin || 0);
      return `${details?.player_name} cashed out ${details?.cashout || 0} (${net >= 0 ? '+' : ''}${net})`;
    default:
      return log.action;
  }
}

export default function GameLogsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [logs, setLogs] = useState<GameLog[]>([]);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel(`logs-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_logs', filter: `game_id=eq.${id}` },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('game_logs')
      .select('*, actor:actor_id(nickname, avatar_emoji)')
      .eq('game_id', id)
      .order('created_at', { ascending: false });

    setLogs((data || []) as GameLog[]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Game Log</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <View
              style={[
                styles.logIcon,
                {
                  backgroundColor:
                    (ACTION_COLORS[item.action] || Colors.textMuted) + '22',
                },
              ]}
            >
              <Ionicons
                name={ACTION_ICONS[item.action] || 'information-circle'}
                size={18}
                color={ACTION_COLORS[item.action] || Colors.textMuted}
              />
            </View>
            <View style={styles.logContent}>
              <Text style={styles.logMessage}>{formatLogMessage(item)}</Text>
              <Text style={styles.logTime}>
                {formatDate(item.created_at)} at {formatTime(item.created_at)}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
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
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  list: {
    padding: Spacing.lg,
  },
  logItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logContent: {
    flex: 1,
  },
  logMessage: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  logTime: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
});
