import { View, Pressable, StyleSheet, Platform, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@app-psy-sophia/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);


interface TabBarButtonProps {
  isActive: boolean;
  icon: any;
  label: string;
  onPress: () => void;
  colorScheme: 'light' | 'dark';
}

function TabBarButton({ isActive, icon, label, onPress, colorScheme }: TabBarButtonProps) {
  const theme = useTheme();
  const pressed = useSharedValue(0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    iconScale.value = withSpring(isActive ? 1.2 : 0.8, {
      damping: 100,
      stiffness: 1000,
    });
  }, [isActive, iconScale]);

  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(1 - pressed.value * 0.05, { duration: 100 }) }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handlePressIn = () => {
    pressed.value = 1;
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    pressed.value = 0;
  };

  // Icon color: white for good contrast on vibrant backgrounds
  const iconColor = isActive
    ? '#FFFFFF'  // White icon on vibrant gradient
    : theme.colors.fgMuted;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tabButton, animatedPressStyle]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      {/* Icon */}
      <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
        {icon({ color: iconColor })}
      </Animated.View>
    </AnimatedPressable>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const tabBarPadding = 16 * 2;
  const innerPadding = 12;
  const availableWidth = screenWidth - tabBarPadding - innerPadding;
  const tabWidth = availableWidth / state.routes.length;
  
  const slideX = useSharedValue(0);
  
  useEffect(() => {
    slideX.value = withSpring(state.index * tabWidth, {
      damping: 100,
      stiffness: 1000,
    });
  }, [state.index, tabWidth, slideX]);

  const slidingBackgroundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    width: '33%',
  }));

  const renderContent = () => (
    <View style={styles.tabBarInner}>
      {/* Sliding background */}
      <Animated.View style={[styles.slidingBackground, slidingBackgroundStyle]}>
        <LinearGradient
          colors={['#FFB800', '#FF8A3D', '#E63946']}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {state.routes.map((route, index) => {
        const isActive = state.index === index;
        const { options } = descriptors[route.key];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isActive && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabBarButton
            key={route.key}
            isActive={isActive}
            icon={options.tabBarIcon}
            label={options.title ?? route.name}
            onPress={onPress}
            colorScheme={colorScheme ?? 'light'}
          />
        );
      })}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={[styles.tabBar, { backgroundColor: theme.colors.bgSurface }]}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabBar: {
    borderRadius: 25,
    overflow: 'hidden',
    padding: 6,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabBarInner: {
    flexDirection: 'row',
    position: 'relative',
  },
  slidingBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 60, // Ensure proper height without padding
    zIndex: 1,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
