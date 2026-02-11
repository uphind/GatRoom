import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { getCurrentLocation, reverseGeocode } from '@/lib/location';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/constants/currencies';
import { Currency } from '@/lib/types';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function CreateTableScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    const loc = await getCurrentLocation();
    if (loc) {
      setCoordinates(loc);
      const addr = await reverseGeocode(loc.latitude, loc.longitude);
      setLocationName(addr);
    } else {
      Alert.alert('Error', 'Could not get your location');
    }
    setLoadingLocation(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a table name');
      return;
    }
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('poker_tables')
        .insert({
          name: name.trim(),
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          location_name: locationName || 'No location set',
          currency: selectedCurrency.code,
          currency_symbol: selectedCurrency.symbol,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as table member
      await supabase.from('table_members').insert({
        table_id: data.id,
        user_id: profile.id,
      });

      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCurrencies = CURRENCIES.filter(
    (c) =>
      c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>New Table</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Table Name"
          placeholder="e.g. Friday Night Poker"
          value={name}
          onChangeText={setName}
          icon="grid-outline"
        />

        <Text style={styles.label}>Location</Text>
        <Button
          title={loadingLocation ? 'Getting location...' : 'Use Current Location'}
          onPress={handleUseCurrentLocation}
          variant="outline"
          size="md"
          loading={loadingLocation}
          icon={
            <Ionicons name="navigate" size={18} color={Colors.primary} />
          }
          fullWidth
          style={styles.locationBtn}
        />

        {locationName ? (
          <View style={styles.locationPreview}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={styles.locationText}>{locationName}</Text>
          </View>
        ) : (
          <Input
            placeholder="Or enter location manually"
            value={locationName}
            onChangeText={setLocationName}
            icon="location-outline"
          />
        )}

        <Text style={styles.label}>Currency</Text>
        <TouchableOpacity
          style={styles.currencySelector}
          onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
        >
          <Text style={styles.currencyFlag}>{selectedCurrency.flag}</Text>
          <View style={styles.currencyInfo}>
            <Text style={styles.currencyName}>{selectedCurrency.name}</Text>
            <Text style={styles.currencyCode}>
              {selectedCurrency.code} ({selectedCurrency.symbol})
            </Text>
          </View>
          <Ionicons
            name={showCurrencyPicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.textMuted}
          />
        </TouchableOpacity>

        {showCurrencyPicker && (
          <View style={styles.currencyPicker}>
            <Input
              placeholder="Search currencies..."
              value={currencySearch}
              onChangeText={setCurrencySearch}
              icon="search-outline"
            />
            <View style={styles.currencyList}>
              {filteredCurrencies.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyItem,
                    selectedCurrency.code === currency.code &&
                      styles.currencyItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCurrency(currency);
                    setShowCurrencyPicker(false);
                    setCurrencySearch('');
                  }}
                >
                  <Text style={styles.currencyItemFlag}>{currency.flag}</Text>
                  <Text style={styles.currencyItemName}>{currency.name}</Text>
                  <Text style={styles.currencyItemCode}>
                    {currency.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Create Table"
          onPress={handleCreate}
          loading={loading}
          disabled={!name.trim()}
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
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  locationBtn: {
    marginBottom: Spacing.md,
  },
  locationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  locationText: {
    color: Colors.text,
    fontSize: FontSize.md,
    flex: 1,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  currencyFlag: {
    fontSize: 24,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  currencyCode: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  currencyPicker: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    maxHeight: 300,
  },
  currencyList: {
    gap: 2,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  currencyItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  currencyItemFlag: {
    fontSize: 20,
  },
  currencyItemName: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
  },
  currencyItemCode: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.background,
  },
});
