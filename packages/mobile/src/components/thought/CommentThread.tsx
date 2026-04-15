import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

interface ThoughtComment {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentThreadProps {
  comments: ThoughtComment[];
  onAddComment: (content: string) => void;
  onDeleteComment: (commentId: string) => void;
  isSubmitting: boolean;
  userName?: string;
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function CommentThread({
  comments,
  onAddComment,
  onDeleteComment,
  isSubmitting,
  userName = 'You',
}: CommentThreadProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setText('');
  };

  const handleLongPress = (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDeleteComment(commentId),
      },
    ]);
  };

  const initial = userName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>
        💬 Comments{comments.length > 0 ? ` (${comments.length})` : ''}
      </Text>

      {comments.length === 0 && (
        <Text style={styles.emptyText}>No comments yet</Text>
      )}

      {comments.map((comment) => (
        <TouchableOpacity
          key={comment.id}
          style={styles.commentRow}
          activeOpacity={0.7}
          onLongPress={() => handleLongPress(comment.id)}
          delayLongPress={500}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.commentBody}>
            <View style={styles.commentMeta}>
              <Text style={styles.commentAuthor}>{userName}</Text>
              <Text style={styles.commentTime}>
                {formatRelativeTime(comment.createdAt)}
              </Text>
            </View>
            <Text style={styles.commentText}>{comment.content}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="+ Add comment"
          placeholderTextColor={colors.mutedDim}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          editable={!isSubmitting}
        />
        {text.trim().length > 0 && (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <ArrowUp size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  sectionHeader: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 12,
    ...fonts.text.medium,
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedDim,
    marginBottom: 12,
    ...fonts.text.regular,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    color: colors.white,
    ...fonts.text.semiBold,
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 13,
    color: colors.foreground,
    ...fonts.text.medium,
  },
  commentTime: {
    fontSize: 12,
    color: colors.mutedDim,
    ...fonts.text.regular,
  },
  commentText: {
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
    ...fonts.text.regular,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    maxHeight: 80,
    paddingVertical: 0,
    ...fonts.text.regular,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
