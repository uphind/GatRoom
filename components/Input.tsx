import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export default function Input({
  label,
  error,
  icon,
  isPassword,
  style,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.container, error && styles.containerError]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={Colors.textMuted}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  containerError: {
    borderColor: Colors.danger,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
  },
  error: {
    color: Colors.danger,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});
