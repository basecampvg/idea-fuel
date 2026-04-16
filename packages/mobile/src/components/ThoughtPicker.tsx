import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { trpc } from '../lib/trpc';
import { colors, fonts } from '../lib/theme';

export function ThoughtPicker({
  visible,
  onClose,
  onSelect,
  excludeId,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (thoughtId: string) => void;
  excludeId: string;
}) {
  const { data: allThoughts } = trpc.thought.list.useQuery();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = (allThoughts ?? []).filter((t) => t.id !== excludeId);
    if (!search.trim()) return list.slice(0, 20);
    const q = search.toLowerCase();
    return list.filter(
      (t) =>
        (t.title ?? '').toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q),
    );
  }, [allThoughts, excludeId, search]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.content}>
          <Text style={styles.title}>Link a Thought</Text>

          <View style={styles.searchRow}>
            <Search size={16} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search thoughts..."
              placeholderTextColor={colors.mutedDim}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const preview = (item.title || item.content).slice(0, 80);
              return (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                >
                  <Text style={styles.itemNumber}>T-{item.thoughtNumber}</Text>
                  <Text style={styles.itemText} numberOfLines={2}>
                    {preview}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {search.trim() ? 'No matching thoughts' : 'No other thoughts yet'}
              </Text>
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  content: { backgroundColor: colors.card, borderRadius: 20, padding: 20, width: '85%', maxWidth: 340, maxHeight: '60%' },
  title: { fontSize: 18, ...fonts.outfit.bold, color: colors.foreground, marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.foreground, ...fonts.outfit.regular },
  list: { maxHeight: 300 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemNumber: { fontSize: 12, ...fonts.geist.regular, color: colors.muted, minWidth: 32 },
  itemText: { flex: 1, fontSize: 14, ...fonts.outfit.regular, color: colors.foreground },
  empty: { fontSize: 14, ...fonts.outfit.regular, color: colors.muted, textAlign: 'center', paddingVertical: 20 },
});
