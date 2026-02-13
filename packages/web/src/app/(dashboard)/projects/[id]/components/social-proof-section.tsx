'use client';

import { MessageCircle, ThumbsUp, MessageSquare, Share2, ArrowUp, ExternalLink } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface SocialProofPost {
  platform: 'reddit' | 'facebook' | 'twitter';
  author: string;
  content: string;
  url: string;
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    upvotes?: number;
  };
  date: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number;
}

export interface SocialProofData {
  posts: SocialProofPost[];
  summary: string;
  painPointsValidated: string[];
  demandSignals: string[];
}

interface SocialProofSectionProps {
  socialProof?: SocialProofData | null;
  title?: string;
  subtitle?: string;
}

function PlatformIcon({ platform }: { platform: string }) {
  const config = {
    reddit: { color: '#ff4500', label: 'Reddit' },
    twitter: { color: '#1da1f2', label: 'Twitter' },
    facebook: { color: '#1877f2', label: 'Facebook' },
  }[platform] || { color: 'hsl(10, 80%, 50%)', label: platform };

  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-foreground"
      style={{ backgroundColor: config.color }}
    >
      {config.label[0]}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config = {
    positive: { bg: 'bg-primary/10', text: 'text-primary' },
    negative: { bg: 'bg-red-500/10', text: 'text-red-400' },
    neutral: { bg: 'bg-muted', text: 'text-muted-foreground' },
  }[sentiment] || { bg: 'bg-muted', text: 'text-muted-foreground' };

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${config.bg} ${config.text}`}>
      {sentiment}
    </span>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

function PostCard({ post }: { post: SocialProofPost }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={post.platform} />
          <div>
            <p className="text-xs font-medium text-foreground">{post.author}</p>
            <p className="text-xs text-muted-foreground">{post.date}</p>
          </div>
        </div>
        <SentimentBadge sentiment={post.sentiment} />
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{post.content}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {post.engagement.upvotes !== undefined && (
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              {formatNumber(post.engagement.upvotes)}
            </span>
          )}
          {post.engagement.likes !== undefined && (
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {formatNumber(post.engagement.likes)}
            </span>
          )}
          {post.engagement.comments !== undefined && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {formatNumber(post.engagement.comments)}
            </span>
          )}
          {post.engagement.shares !== undefined && (
            <span className="flex items-center gap-1">
              <Share2 className="w-3 h-3" />
              {formatNumber(post.engagement.shares)}
            </span>
          )}
        </div>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:opacity-80 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          View
        </a>
      </div>
    </div>
  );
}

export function SocialProofSection({ socialProof, title = 'Social Proof', subtitle = 'What people are saying online' }: SocialProofSectionProps) {
  if (!socialProof || socialProof.posts.length === 0) return null;

  return (
    <CollapsibleSection
      icon={<MessageCircle className="w-5 h-5 text-primary/60" />}
      iconBgColor="rgba(29, 161, 242, 0.2)"
      title={title}
      subtitle={subtitle}
    >
      {/* Summary */}
      <p className="text-sm text-muted-foreground mb-5 p-3 rounded-lg bg-card border-l-2 border-primary/60">
        {socialProof.summary}
      </p>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {socialProof.posts.slice(0, 6).map((post, i) => (
          <PostCard key={i} post={post} />
        ))}
      </div>

      {/* Validated Pain Points & Demand Signals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
        {socialProof.painPointsValidated.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Pain Points Validated</p>
            <div className="flex flex-wrap gap-2">
              {socialProof.painPointsValidated.map((point, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {point}
                </span>
              ))}
            </div>
          </div>
        )}
        {socialProof.demandSignals.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Demand Signals</p>
            <div className="flex flex-wrap gap-2">
              {socialProof.demandSignals.map((signal, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">
                  {signal}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
