import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';

/**
 * ClusterMaturityDot — visual indicator for a cluster's readiness.
 *
 *  exploring: hollow ring (muted)            — cluster still being filled out
 *  forming:   half-filled (warning amber)    — getting close, gaps remain
 *  ready:     solid filled (success)         — ready to crystallize
 */
export function ClusterMaturityDot({
  status,
  size = 12,
}: {
  status: 'exploring' | 'forming' | 'ready';
  size?: number;
}) {
  const style = (() => {
    switch (status) {
      case 'exploring':
        return { borderColor: colors.muted, backgroundColor: 'transparent' };
      case 'forming':
        return { borderColor: colors.warning, backgroundColor: 'rgba(245,158,11,0.3)' };
      case 'ready':
        return { borderColor: colors.success, backgroundColor: colors.success };
    }
  })();

  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, borderWidth: 2 },
        style,
      ]}
      accessibilityLabel={`Cluster status: ${status}`}
    />
  );
}

const styles = StyleSheet.create({ dot: {} });
