import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface PillFilterProps {
  items: { id: string; label: string }[];
  selected?: string | null;
  onSelect: (id: string | null) => void;
  showAll?: boolean;
}

export default function PillFilter({
  items,
  selected,
  onSelect,
  showAll = true,
}: PillFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {showAll && (
        <TouchableOpacity
          style={[styles.pill, !selected && styles.pillActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.pillText, !selected && styles.pillTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      )}
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.pill,
            selected === item.id && styles.pillActive,
          ]}
          onPress={() => onSelect(selected === item.id ? null : item.id)}
        >
          <Text
            style={[
              styles.pillText,
              selected === item.id && styles.pillTextActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  pillText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  pillTextActive: {
    color: Colors.primary,
  },
});
