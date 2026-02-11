import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

function RootLayoutNav() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (!profile) {
      if (!inAuthGroup) {
        router.replace('/(auth)/register');
      }
    } else {
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [session, profile, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="game/create"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="game/join" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="game/[id]" />
        <Stack.Screen
          name="game/[id]/add-player"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="game/[id]/summary" />
        <Stack.Screen name="game/[id]/logs" />
        <Stack.Screen
          name="table/create"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="table/[id]" />
        <Stack.Screen name="friends" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
