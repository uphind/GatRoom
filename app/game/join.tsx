import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Button from '@/components/Button';

export default function JoinGameScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-advance to next input
    if (text && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleJoin = async () => {
    const passcode = code.join('');
    if (passcode.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit code');
      return;
    }
    if (!profile) return;

    setLoading(true);
    try {
      const { data: game, error } = await supabase
        .from('games')
        .select('*, poker_table:poker_tables(*)')
        .eq('passcode', passcode)
        .eq('status', 'live')
        .single();

      if (error || !game) {
        Alert.alert('Error', 'Game not found or has ended');
        return;
      }

      // Check if already in game
      const { data: existing } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('user_id', profile.id)
        .single();

      if (!existing) {
        // Add player to game
        await supabase.from('game_players').insert({
          game_id: game.id,
          user_id: profile.id,
          player_name: profile.nickname,
          total_buyin: profile.default_buyin,
        });

        // Log joining
        await supabase.from('game_logs').insert({
          game_id: game.id,
          actor_id: profile.id,
          action: 'player_joined',
          details: {
            player_name: profile.nickname,
            buyin: profile.default_buyin,
          },
        });

        // Add to table members
        await supabase.from('table_members').upsert({
          table_id: game.table_id,
          user_id: profile.id,
        }, { onConflict: 'table_id,user_id' });
      }

      router.replace(`/game/${game.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join game');
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
        <Text style={styles.title}>Join Game</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Enter the 4-digit game code</Text>

        <View style={styles.codeInputs}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputs.current[index] = ref; }}
              style={[
                styles.codeInput,
                digit && styles.codeInputFilled,
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text.slice(-1), index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        <Button
          title="Join Game"
          onPress={handleJoin}
          loading={loading}
          disabled={code.join('').length !== 4}
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl * 2,
    alignItems: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    marginBottom: Spacing.xxxl,
    textAlign: 'center',
  },
  codeInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxxl * 1.5,
  },
  codeInput: {
    width: 64,
    height: 72,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
});
