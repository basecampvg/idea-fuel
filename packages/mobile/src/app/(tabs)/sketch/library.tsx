import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../../lib/theme';

export default function LibraryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Library placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.foreground, ...fonts.outfit.medium, fontSize: 16 },
});
