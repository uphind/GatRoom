import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { PokerTable } from '@/lib/types';
import { getCurrentLocation, getDistanceMeters, reverseGeocode } from '@/lib/location';
import { generatePasscode } from '@/lib/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';

export default function CreateGameScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const [tables, setTables] = useState<PokerTable[]>([]);
  const [nearbyTables, setNearbyTables] = useState<PokerTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<PokerTable | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    fetchTables();
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      setUserLocation(loc);
    }
  };

  const fetchTables = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('poker_tables')
      .select('*')
      .order('created_at', { ascending: false });

    const allTables = (data || []) as PokerTable[];
    setTables(allTables);

    // Check for nearby tables
    const loc = await getCurrentLocation();
    if (loc) {
      const nearby = allTables.filter(
        (t) =>
          t.latitude &&
          t.longitude &&
          getDistanceMeters(loc.latitude, loc.longitude, t.latitude, t.longitude) < 200
      );
      setNearbyTables(nearby);
      // Auto-select first nearby table
      if (nearby.length > 0 && !selectedTable) {
        setSelectedTable(nearby[0]);
      }
    }
  };

  const handleCreateTable = async () => {
    if (!newTableName.trim()) {
      Alert.alert('Error', 'Please enter a table name');
      return;
    }
    if (!profile) return;

    try {
      let locationName = 'Unknown';
      if (userLocation) {
        locationName = await reverseGeocode(
          userLocation.latitude,
          userLocation.longitude
        );
      }

      const { data, error } = await supabase
        .from('poker_tables')
        .insert({
          name: newTableName.trim(),
          latitude: userLocation?.latitude,
          longitude: userLocation?.longitude,
          location_name: locationName,
          currency: 'ILS',
          currency_symbol: '₪',
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newTable = data as PokerTable;
      setSelectedTable(newTable);
      setShowCreateTable(false);
      setNewTableName('');
      setTables([newTable, ...tables]);

      // Add creator as table member
      await supabase.from('table_members').insert({
        table_id: newTable.id,
        user_id: profile.id,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCreateGame = async () => {
    if (!selectedTable) {
      Alert.alert('Error', 'Please select or create a table');
      return;
    }
    if (!profile) return;

    setLoading(true);
    try {
      const passcode = generatePasscode();

      const { data: game, error } = await supabase
        .from('games')
        .insert({
          table_id: selectedTable.id,
          passcode,
          created_by: profile.id,
          status: 'live',
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as player if "I am playing"
      if (isPlaying && game) {
        await supabase.from('game_players').insert({
          game_id: game.id,
          user_id: profile.id,
          player_name: profile.nickname,
          total_buyin: profile.default_buyin,
        });

        // Log the creation
        await supabase.from('game_logs').insert({
          game_id: game.id,
          actor_id: profile.id,
          action: 'game_created',
          details: { table_name: selectedTable.name },
        });

        // Log player joining
        await supabase.from('game_logs').insert({
          game_id: game.id,
          actor_id: profile.id,
          action: 'player_joined',
          details: {
            player_name: profile.nickname,
            buyin: profile.default_buyin,
          },
        });
      }

      // Ensure creator is member of the table
      await supabase.from('table_members').upsert({
        table_id: selectedTable.id,
        user_id: profile.id,
      }, { onConflict: 'table_id,user_id' });

      router.replace(`/game/${game.id}`);
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
        <Text style={styles.title}>New Game</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Table Selection */}
        <Text style={styles.sectionTitle}>Select Table</Text>

        {nearbyTables.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>
              <Ionicons name="location" size={14} color={Colors.primary} />{' '}
              Nearby Tables
            </Text>
            {nearbyTables.map((table) => (
              <TouchableOpacity
                key={table.id}
                style={[
                  styles.tableCard,
                  selectedTable?.id === table.id && styles.tableCardSelected,
                ]}
                onPress={() => setSelectedTable(table)}
              >
                <View style={styles.tableInfo}>
                  <Text style={styles.tableName}>{table.name}</Text>
                  <Text style={styles.tableLocation}>
                    {table.location_name || 'Unknown'}
                  </Text>
                </View>
                {selectedTable?.id === table.id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={Colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {tables.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>All Tables</Text>
            {tables
              .filter((t) => !nearbyTables.find((n) => n.id === t.id))
              .map((table) => (
                <TouchableOpacity
                  key={table.id}
                  style={[
                    styles.tableCard,
                    selectedTable?.id === table.id && styles.tableCardSelected,
                  ]}
                  onPress={() => setSelectedTable(table)}
                >
                  <View style={styles.tableInfo}>
                    <Text style={styles.tableName}>{table.name}</Text>
                    <Text style={styles.tableLocation}>
                      {table.location_name || 'Unknown'}
                    </Text>
                  </View>
                  {selectedTable?.id === table.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
          </>
        )}

        {/* Create New Table inline */}
        {!showCreateTable ? (
          <TouchableOpacity
            style={styles.createTableBtn}
            onPress={() => setShowCreateTable(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.createTableBtnText}>Create New Table</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.createTableForm}>
            <Input
              placeholder="Table name (e.g. Friday Night Poker)"
              value={newTableName}
              onChangeText={setNewTableName}
              icon="grid-outline"
            />
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={16} color={Colors.primary} />
              <Text style={styles.locationInfoText}>
                {userLocation
                  ? 'Using your current location'
                  : 'Location not available'}
              </Text>
            </View>
            <View style={styles.createTableActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowCreateTable(false);
                  setNewTableName('');
                }}
                variant="ghost"
                size="sm"
              />
              <Button
                title="Create Table"
                onPress={handleCreateTable}
                size="sm"
              />
            </View>
          </View>
        )}

        {/* I am playing toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>I am playing</Text>
            <Text style={styles.toggleSubtext}>
              Join with default buy-in ({profile?.default_buyin || 50})
            </Text>
          </View>
          <Switch
            value={isPlaying}
            onValueChange={setIsPlaying}
            trackColor={{ false: Colors.surfaceHighlight, true: Colors.primaryLight }}
            thumbColor={isPlaying ? Colors.primary : Colors.textMuted}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Create Game"
          onPress={handleCreateGame}
          loading={loading}
          disabled={!selectedTable}
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
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  subsectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  tableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  tableCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  tableInfo: {
    flex: 1,
  },
  tableName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  tableLocation: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  createTableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
  },
  createTableBtnText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  createTableForm: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  locationInfoText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  createTableActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xxl,
  },
  toggleLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  toggleSubtext: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.background,
  },
});
