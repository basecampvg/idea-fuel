import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../ui/CollapsibleSection';

const colors = {
  card: '#1A1918',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  border: '#1F1E1C',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  destructive: '#EF4444',
  destructiveMuted: 'rgba(239, 68, 68, 0.15)',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
};

const PLATFORM_COLORS = {
  reddit: '#ff4500',
  twitter: '#1da1f2',
  facebook: '#1877f2',
};

interface SocialProofPost {
  platform: 'reddit' | 'facebook' | 'twitter';
  author?: string;
  content: string;
  url?: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    upvotes?: number;
  };
  date?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface SocialProofData {
  posts?: SocialProofPost[];
  summary?: string;
  painPointsValidated?: string[];
  demandSignals?: string[];
}

interface SocialProofSectionProps {
  socialProof?: SocialProofData | null;
}

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

function PlatformIcon({ platform }: { platform: 'reddit' | 'facebook' | 'twitter' }) {
  const letter = platform === 'reddit' ? 'R' : platform === 'twitter' ? 'T' : 'F';
  const color = PLATFORM_COLORS[platform];

  return (
    <View style={[styles.platformIcon, { backgroundColor: color }]}>
      <Text style={styles.platformLetter}>{letter}</Text>
    </View>
  );
}

function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'negative' | 'neutral' }) {
  const config = {
    positive: { color: colors.success, bg: colors.successMuted },
    negative: { color: colors.destructive, bg: colors.destructiveMuted },
    neutral: { color: colors.muted, bg: colors.mutedBg },
  };
  const { color, bg } = config[sentiment];

  return (
    <View style={[styles.sentimentBadge, { backgroundColor: bg }]}>
      <Text style={[styles.sentimentText, { color }]}>
        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
      </Text>
    </View>
  );
}

function PostCard({ post }: { post: SocialProofPost }) {
  const handlePress = () => {
    if (post.url) {
      Linking.openURL(post.url);
    }
  };

  return (
    <TouchableOpacity
      style={styles.postCard}
      onPress={handlePress}
      activeOpacity={post.url ? 0.7 : 1}
      disabled={!post.url}
    >
      <View style={styles.postHeader}>
        <PlatformIcon platform={post.platform} />
        <View style={styles.postMeta}>
          {post.author && <Text style={styles.postAuthor}>{post.author}</Text>}
          {post.date && <Text style={styles.postDate}>{post.date}</Text>}
        </View>
        {post.sentiment && <SentimentBadge sentiment={post.sentiment} />}
      </View>

      <Text style={styles.postContent} numberOfLines={3}>
        {post.content}
      </Text>

      {post.engagement && (
        <View style={styles.engagementRow}>
          {post.engagement.upvotes !== undefined && (
            <View style={styles.engagementItem}>
              <Ionicons name="arrow-up" size={12} color={colors.muted} />
              <Text style={styles.engagementText}>{formatNumber(post.engagement.upvotes)}</Text>
            </View>
          )}
          {post.engagement.likes !== undefined && (
            <View style={styles.engagementItem}>
              <Ionicons name="heart" size={12} color={colors.muted} />
              <Text style={styles.engagementText}>{formatNumber(post.engagement.likes)}</Text>
            </View>
          )}
          {post.engagement.comments !== undefined && (
            <View style={styles.engagementItem}>
              <Ionicons name="chatbubble" size={12} color={colors.muted} />
              <Text style={styles.engagementText}>{formatNumber(post.engagement.comments)}</Text>
            </View>
          )}
          {post.url && (
            <Ionicons name="open-outline" size={14} color={colors.info} style={styles.linkIcon} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function SocialProofSection({ socialProof }: SocialProofSectionProps) {
  if (!socialProof) return null;

  const { posts, summary, painPointsValidated, demandSignals } = socialProof;
  const hasContent =
    (posts?.length || 0) > 0 ||
    summary ||
    (painPointsValidated?.length || 0) > 0 ||
    (demandSignals?.length || 0) > 0;

  if (!hasContent) return null;

  return (
    <CollapsibleSection
      icon="chatbubbles"
      iconColor={colors.info}
      iconBgColor={colors.infoMuted}
      title="Social Proof"
      subtitle="Community validation"
      defaultCollapsed={true}
    >
      {/* Summary */}
      {summary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>"{summary}"</Text>
        </View>
      )}

      {/* Posts */}
      {posts && posts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.postsScroll}
          contentContainerStyle={styles.postsContent}
        >
          {posts.slice(0, 4).map((post, index) => (
            <PostCard key={index} post={post} />
          ))}
        </ScrollView>
      )}

      {/* Validated Pain Points & Demand Signals */}
      {((painPointsValidated?.length || 0) > 0 || (demandSignals?.length || 0) > 0) && (
        <View style={styles.tagsContainer}>
          {painPointsValidated && painPointsValidated.length > 0 && (
            <View style={styles.tagSection}>
              <Text style={[styles.tagLabel, { color: colors.success }]}>Pain Points Validated</Text>
              <View style={styles.tagsRow}>
                {painPointsValidated.slice(0, 4).map((point, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: colors.successMuted }]}>
                    <Text style={[styles.tagText, { color: colors.success }]} numberOfLines={1}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {demandSignals && demandSignals.length > 0 && (
            <View style={styles.tagSection}>
              <Text style={[styles.tagLabel, { color: colors.secondary }]}>Demand Signals</Text>
              <View style={styles.tagsRow}>
                {demandSignals.slice(0, 4).map((signal, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: colors.secondaryMuted }]}>
                    <Text style={[styles.tagText, { color: colors.secondary }]} numberOfLines={1}>
                      {signal}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.mutedBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 13,
    color: colors.foreground,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  postsScroll: {
    marginHorizontal: -16,
  },
  postsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  postCard: {
    width: 240,
    backgroundColor: colors.mutedBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  platformIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformLetter: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  postMeta: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  postDate: {
    fontSize: 10,
    color: colors.muted,
  },
  sentimentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sentimentText: {
    fontSize: 9,
    fontWeight: '600',
  },
  postContent: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
    marginBottom: 8,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    fontSize: 11,
    color: colors.muted,
  },
  linkIcon: {
    marginLeft: 'auto',
  },
  tagsContainer: {
    marginTop: 16,
    gap: 12,
  },
  tagSection: {},
  tagLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: '48%',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default SocialProofSection;
