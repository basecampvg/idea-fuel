import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Check, Plus, Tag } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { BottomSheet } from '../ui/BottomSheet';
import { trpc } from '../../lib/trpc';
import { PREDEFINED_LABELS } from '@forge/shared';

interface LabelPickerProps {
  visible: boolean;
  onClose: () => void;
  currentLabels: string[];
  onUpdateLabels: (labels: string[]) => void;
}

export function LabelPicker({ visible, onClose, currentLabels, onUpdateLabels }: LabelPickerProps) {
  const [newLabelName, setNewLabelName] = useState('');
  const { data: userLabelsData } = trpc.thought.listUserLabels.useQuery(undefined, { enabled: visible });
  const createLabelMutation = trpc.thought.createUserLabel.useMutation({
    onSuccess: (label) => {
      if (!currentLabels.includes(label.name)) {
        onUpdateLabels([...currentLabels, label.name]);
      }
      setNewLabelName('');
    },
  });

  const toggleLabel = (name: string) => {
    if (currentLabels.includes(name)) {
      onUpdateLabels(currentLabels.filter((l) => l !== name));
    } else {
      onUpdateLabels([...currentLabels, name]);
    }
  };

  const handleCreateLabel = () => {
    const trimmed = newLabelName.toLowerCase().trim();
    if (!trimmed) return;
    createLabelMutation.mutate({ name: trimmed });
  };

  const allLabels = [
    ...PREDEFINED_LABELS.map((l) => ({ name: l.name, color: l.color, custom: false })),
    ...(userLabelsData?.custom ?? []).map((l) => ({ name: l.name, color: l.color, custom: true })),
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Labels">
      <View style={styles.options}>
        {allLabels.map(({ name, color }) => {
          const isSelected = currentLabels.includes(name);
          return (
            <TouchableOpacity
              key={name}
              style={[styles.option, isSelected && { backgroundColor: `${color}15` }]}
              onPress={() => toggleLabel(name)}
              activeOpacity={0.7}
            >
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <Text style={[styles.label, isSelected && { color }]}>{name}</Text>
              {isSelected && <Check size={16} color={color} />}
            </TouchableOpacity>
          );
        })}

        <View style={styles.createRow}>
          <Tag size={14} color={colors.mutedDim} />
          <TextInput
            style={styles.input}
            value={newLabelName}
            onChangeText={setNewLabelName}
            placeholder="New label..."
            placeholderTextColor={colors.mutedDim}
            maxLength={50}
            autoCapitalize="none"
            onSubmitEditing={handleCreateLabel}
            returnKeyType="done"
          />
          {newLabelName.trim() && (
            <TouchableOpacity onPress={handleCreateLabel} activeOpacity={0.7}>
              {createLabelMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Plus size={18} color={colors.brand} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 15,
    ...fonts.text.medium,
    color: colors.foreground,
    flex: 1,
    textTransform: 'capitalize',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    ...fonts.text.regular,
    color: colors.foreground,
    paddingVertical: 0,
  },
});
