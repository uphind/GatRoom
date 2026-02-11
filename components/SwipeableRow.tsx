import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors, BorderRadius, Spacing, FontSize } from '@/constants/theme';

interface SwipeAction {
  label: string;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeOpen?: (direction: 'left' | 'right') => void;
}

export default function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
}: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (leftActions.length === 0) return null;
    return (
      <View style={styles.actionsContainer}>
        {leftActions.map((action, index) => {
          const trans = dragX.interpolate({
            inputRange: [0, 50 * (index + 1), 100 * (index + 1)],
            outputRange: [-20, 0, 20 * (index + 1)],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={index}
              style={[{ transform: [{ translateX: trans }] }]}
            >
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: action.color }]}
                onPress={() => {
                  action.onPress();
                  swipeableRef.current?.close();
                }}
              >
                <Text style={styles.actionText}>{action.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (rightActions.length === 0) return null;
    return (
      <View style={[styles.actionsContainer, styles.rightActions]}>
        {rightActions.map((action, index) => {
          const trans = dragX.interpolate({
            inputRange: [-100 * (rightActions.length - index), -50, 0],
            outputRange: [0, 10, 60],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={index}
              style={[{ transform: [{ translateX: trans }] }]}
            >
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: action.color }]}
                onPress={() => {
                  action.onPress();
                  swipeableRef.current?.close();
                }}
              >
                <Text style={styles.actionText}>{action.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  if (Platform.OS === 'web') {
    return <View>{children}</View>;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={leftActions.length > 0 ? renderLeftActions : undefined}
      renderRightActions={rightActions.length > 0 ? renderRightActions : undefined}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightActions: {
    justifyContent: 'flex-end',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    height: '100%',
    minWidth: 80,
    borderRadius: BorderRadius.md,
    marginHorizontal: 2,
  },
  actionText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
