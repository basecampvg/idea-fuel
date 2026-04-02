import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { BottomSheet } from './ui/BottomSheet';
import { colors, fonts } from '../lib/theme';

type AiActionResult =
  | { type: 'summary'; data: { summary: string } }
  | { type: 'todos'; data: { todos: string[] } }
  | { type: 'gaps'; data: { gaps: string[] } }
  | { type: 'brief'; data: { brief: string } }
  | { type: 'contradictions'; data: { contradictions: string[] } }
  | { type: 'promoted'; data: { projectId: string } };

const TITLES: Record<AiActionResult['type'], string> = {
  summary: 'Summary',
  todos: 'Action Items',
  gaps: 'Gaps Identified',
  brief: 'Generated Brief',
  contradictions: 'Contradictions',
  promoted: 'Idea Created',
};

export function AiActionSheet({
  visible,
  onClose,
  result,
}: {
  visible: boolean;
  onClose: () => void;
  result: AiActionResult | null;
}) {
  if (!result) return null;

  const title = TITLES[result.type];

  const renderContent = () => {
    switch (result.type) {
      case 'summary':
        return <Text style={styles.prose}>{result.data.summary}</Text>;
      case 'brief':
        return <Text style={styles.prose}>{result.data.brief}</Text>;
      case 'todos':
        return (
          <View style={styles.list}>
            {result.data.todos.map((todo, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.listText}>{todo}</Text>
              </View>
            ))}
          </View>
        );
      case 'gaps':
        return (
          <View style={styles.list}>
            {result.data.gaps.map((gap, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.listText}>{gap}</Text>
              </View>
            ))}
          </View>
        );
      case 'contradictions':
        return result.data.contradictions.length === 0 ? (
          <Text style={styles.prose}>No contradictions found across your notes.</Text>
        ) : (
          <View style={styles.list}>
            {result.data.contradictions.map((c, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.listText}>{c}</Text>
              </View>
            ))}
          </View>
        );
      case 'promoted':
        return <Text style={styles.prose}>Your idea has been created in the Vault.</Text>;
      default:
        return null;
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 400, paddingHorizontal: 4 },
  prose: { fontSize: 15, ...fonts.geist.regular, color: colors.foreground, lineHeight: 22 },
  list: { gap: 8 },
  listItem: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 15, color: colors.muted, marginTop: 1 },
  listText: { fontSize: 15, ...fonts.geist.regular, color: colors.foreground, lineHeight: 22, flex: 1 },
});
