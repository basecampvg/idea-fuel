import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { FlaskConical, Vault, X } from 'lucide-react-native';
import { colors, fonts } from '../lib/theme';
import { trpc } from '../lib/trpc';

interface PinTarget {
  type: 'sandbox' | 'vault';
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (target: PinTarget) => void;
}

interface SandboxItem {
  id: string;
  name: string;
  color: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  thoughtCount: number;
}

interface ProjectItem {
  id: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  status: string;
  cardResult?: unknown;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    interviews: number;
    reports: number;
  };
  research: {
    status: string;
    currentPhase?: string;
    progress?: number;
  } | null;
}

export function PinSheet({ visible, onClose, onSelect }: Props) {
  const { data: sandboxes, isLoading: loadingSandboxes } = trpc.sandbox.list.useQuery(
    undefined,
    { enabled: visible },
  );
  const { data: projectData, isLoading: loadingProjects } = trpc.project.list.useQuery(
    {},
    { enabled: visible },
  );

  const projects = projectData?.items;
  const isLoading = loadingSandboxes || loadingProjects;

  const listData: Array<PinTarget> = [
    ...(sandboxes ?? []).map((s: SandboxItem) => ({
      type: 'sandbox' as const,
      id: s.id,
      name: s.name,
    })),
    ...(projects ?? []).map((p: ProjectItem) => ({
      type: 'vault' as const,
      id: p.id,
      name: p.title,
    })),
  ];

  const handleSelect = (target: PinTarget) => {
    onSelect(target);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Pin to...</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={listData}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  {item.type === 'sandbox' ? (
                    <FlaskConical size={18} color={colors.accent} />
                  ) : (
                    <Vault size={18} color={colors.brand} />
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.rowType}>
                      {item.type === 'sandbox' ? 'Sandbox' : 'Vault'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No sandboxes or ideas yet. Create one first!
                </Text>
              }
              style={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    ...fonts.outfit.medium,
    color: colors.foreground,
  },
  rowType: {
    fontSize: 12,
    color: colors.mutedDim,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 20,
  },
});
