import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Profile, Friendship } from '@/lib/types';
import Input from '@/components/Input';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';

export default function FriendsScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const [friends, setFriends] = useState<(Friendship & { friendProfile: Profile })[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(Friendship & { userProfile: Profile })[]>([]);
  const [searchTag, setSearchTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    if (!profile) return;

    // My friends (accepted)
    const { data: myFriends } = await supabase
      .from('friendships')
      .select('*, friend:friend_id(*)')
      .eq('user_id', profile.id)
      .eq('status', 'accepted');

    const { data: theirFriends } = await supabase
      .from('friendships')
      .select('*, user:user_id(*)')
      .eq('friend_id', profile.id)
      .eq('status', 'accepted');

    const allFriends = [
      ...(myFriends || []).map((f: any) => ({
        ...f,
        friendProfile: f.friend as Profile,
      })),
      ...(theirFriends || []).map((f: any) => ({
        ...f,
        friendProfile: f.user as Profile,
      })),
    ];
    setFriends(allFriends);

    // Pending requests (sent to me)
    const { data: pending } = await supabase
      .from('friendships')
      .select('*, user:user_id(*)')
      .eq('friend_id', profile.id)
      .eq('status', 'pending');

    setPendingRequests(
      (pending || []).map((f: any) => ({
        ...f,
        userProfile: f.user as Profile,
      }))
    );
  };

  const handleAddFriend = async () => {
    const tag = searchTag.replace('#', '').trim();
    if (!tag || tag.length !== 4) {
      Alert.alert('Error', 'Enter a valid 4-digit user ID');
      return;
    }
    if (!profile) return;

    setLoading(true);
    try {
      // Find user by tag
      const { data: targetUser, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_tag', tag)
        .single();

      if (error || !targetUser) {
        Alert.alert('Not Found', 'No user found with that ID');
        return;
      }

      if (targetUser.id === profile.id) {
        Alert.alert('Error', "You can't add yourself");
        return;
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(
          `and(user_id.eq.${profile.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${profile.id})`
        )
        .single();

      if (existing) {
        Alert.alert('Info', 'Friend request already exists');
        return;
      }

      await supabase.from('friendships').insert({
        user_id: profile.id,
        friend_id: targetUser.id,
        status: 'pending',
      });

      Alert.alert('Sent', `Friend request sent to ${(targetUser as Profile).nickname}`);
      setSearchTag('');
      fetchFriends();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    fetchFriends();
  };

  const handleReject = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'rejected' })
      .eq('id', friendshipId);
    fetchFriends();
  };

  const handleRemoveFriend = (friendshipId: string) => {
    Alert.alert('Remove Friend', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('friendships').delete().eq('id', friendshipId);
          fetchFriends();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Add Friend */}
      <View style={styles.addSection}>
        <Text style={styles.sectionTitle}>Add Friend by ID</Text>
        <View style={styles.addRow}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="#1234"
              value={searchTag}
              onChangeText={setSearchTag}
              keyboardType="number-pad"
              icon="search-outline"
            />
          </View>
          <Button
            title="Add"
            onPress={handleAddFriend}
            loading={loading}
            size="md"
            style={styles.addBtn}
          />
        </View>
      </View>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Pending Requests ({pendingRequests.length})
          </Text>
          {pendingRequests.map((req) => (
            <View key={req.id} style={styles.friendCard}>
              <Text style={styles.friendEmoji}>
                {req.userProfile.avatar_emoji}
              </Text>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>
                  {req.userProfile.nickname}
                </Text>
                <Text style={styles.friendTag}>
                  {req.userProfile.username}#{req.userProfile.user_tag}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAccept(req.id)}
              >
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={Colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleReject(req.id)}
              >
                <Ionicons name="close" size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Friends List */}
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.friendCard}
            onLongPress={() => handleRemoveFriend(item.id)}
          >
            <Text style={styles.friendEmoji}>
              {item.friendProfile.avatar_emoji}
            </Text>
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>
                {item.friendProfile.nickname}
              </Text>
              <Text style={styles.friendTag}>
                {item.friendProfile.username}#{item.friendProfile.user_tag}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            My Friends ({friends.length})
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No friends yet"
            subtitle="Add friends by their 4-digit ID to quickly add them to games"
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
  addSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  addBtn: {
    marginTop: 0,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  friendEmoji: {
    fontSize: 28,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  friendTag: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
