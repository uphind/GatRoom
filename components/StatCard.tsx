import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  compact?: boolean;
}

export default function StatCard({ label, value, color, compact }: StatCardProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text style={[styles.value, color ? { color } : null]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compact: {
    paddingVertical: Spacing.sm,
  },
  value: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
