import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { colors } from '../../lib/theme';

const localColors = {
  mutedBg: '#262422',
};

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  iconColor?: string;
  iconBgColor: string;
  title: string;
  subtitle?: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  defaultCollapsed = true,
  children,
}: CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed(!isCollapsed);
  };

  return (
    <LinearGradient
      colors={[colors.glassBorderStart, colors.glassBorderEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBorder}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.header}
          onPress={toggleCollapse}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
              {icon}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
          <View style={styles.chevronContainer}>
            {isCollapsed ? (
              <ChevronDown size={20} color={colors.muted} />
            ) : (
              <ChevronUp size={20} color={colors.muted} />
            )}
          </View>
        </TouchableOpacity>

        {!isCollapsed && <View style={styles.content}>{children}</View>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBorder: {
    borderRadius: 16,
    padding: 1,
    marginBottom: 12,
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: 15,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: localColors.mutedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default CollapsibleSection;
