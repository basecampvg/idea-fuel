import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { trpc } from '../lib/trpc';
import { colors, fonts } from '../lib/theme';

const SANDBOX_COLORS = [
  '#6C5CE7', '#00B894', '#FDCB6E', '#E17055',
  '#0984E3', '#D63031', '#A29BFE', '#55EFC4',
];

export function SandboxPicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (sandboxId: string) => void;
}) {
  const { data: sandboxList } = trpc.sandbox.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(SANDBOX_COLORS[0]);

  const createMutation = trpc.sandbox.create.useMutation({
    onSuccess: (sandbox) => {
      setShowCreate(false);
      setNewName('');
      onSelect(sandbox.id);
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), color: newColor });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.content}>
          <Text style={styles.title}>Pin to Sandbox</Text>

          {!showCreate ? (
            <>
              <FlatList
                data={sandboxList ?? []}
                keyExtractor={(item) => item.id}
                style={styles.list}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.item}
                    onPress={() => onSelect(item.id)}
                  >
                    <View style={[styles.dot, { backgroundColor: item.color || '#6C5CE7' }]} />
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCount}>{item.noteCount}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.empty}>No sandboxes yet</Text>
                }
              />

              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setShowCreate(true)}
              >
                <Plus size={16} color={colors.brand} />
                <Text style={styles.createBtnText}>New Sandbox</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Sandbox name"
                placeholderTextColor={colors.mutedDim}
                value={newName}
                onChangeText={setNewName}
                maxLength={100}
                autoFocus
              />
              <View style={styles.colorRow}>
                {SANDBOX_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorOption, { backgroundColor: c }, newColor === c && styles.colorSelected]}
                    onPress={() => setNewColor(c)}
                  />
                ))}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => setShowCreate(false)}>
                  <Text style={styles.cancelText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, !newName.trim() && { opacity: 0.5 }]}
                  onPress={handleCreate}
                  disabled={!newName.trim()}
                >
                  <Text style={styles.confirmText}>Create & Pin</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  content: { backgroundColor: colors.card, borderRadius: 20, padding: 20, width: '85%', maxWidth: 340, maxHeight: '60%' },
  title: { fontSize: 18, ...fonts.outfit.bold, color: colors.foreground, marginBottom: 12 },
  list: { maxHeight: 240 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  itemName: { flex: 1, fontSize: 15, ...fonts.outfit.semiBold, color: colors.foreground },
  itemCount: { fontSize: 13, ...fonts.geist.regular, color: colors.muted },
  empty: { fontSize: 14, ...fonts.outfit.regular, color: colors.muted, textAlign: 'center', paddingVertical: 20 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, justifyContent: 'center' },
  createBtnText: { fontSize: 15, ...fonts.outfit.semiBold, color: colors.brand },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, fontSize: 16, color: colors.foreground, ...fonts.outfit.regular, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  colorOption: { width: 28, height: 28, borderRadius: 14 },
  colorSelected: { borderWidth: 3, borderColor: colors.white },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelText: { fontSize: 15, ...fonts.outfit.semiBold, color: colors.muted },
  confirmBtn: { backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  confirmText: { fontSize: 15, ...fonts.outfit.semiBold, color: colors.white },
});
