'use client';

import { MessageCircle, ThumbsUp, MessageSquare, Share2, ArrowUp, ExternalLink } from 'lucide-react';

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
}

function PlatformIcon({ platform }: { platform: string }) {
  const config = {
    reddit: { color: '#ff4500', label: 'Reddit' },
    twitter: { color: '#1da1f2', label: 'Twitter' },
    facebook: { color: '#1877f2', label: 'Facebook' },
  }[platform] || { color: '#6a6a7a', label: platform };

  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
      style={{ backgroundColor: config.color }}
    >
      {config.label[0]}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config = {
    positive: { bg: 'bg-[#22c55e]/10', text: 'text-[#22c55e]' },
    negative: { bg: 'bg-[#ef4444]/10', text: 'text-[#ef4444]' },
    neutral: { bg: 'bg-[#6a6a7a]/10', text: 'text-[#6a6a7a]' },
  }[sentiment] || { bg: 'bg-[#6a6a7a]/10', text: 'text-[#6a6a7a]' };

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
    <div className="p-4 rounded-xl bg-[#1a1a24] border border-[#1e1e2a]">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={post.platform} />
          <div>
            <p className="text-xs font-medium text-white">{post.author}</p>
            <p className="text-xs text-[#6a6a7a]">{post.date}</p>
          </div>
        </div>
        <SentimentBadge sentiment={post.sentiment} />
      </div>

      <p className="text-sm text-[#a0a0b0] mb-3 line-clamp-3">{post.content}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-[#6a6a7a]">
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
          className="text-xs text-[#00d4ff] hover:opacity-80 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          View
        </a>
      </div>
    </div>
  );
}

export function SocialProofSection({ socialProof }: SocialProofSectionProps) {
  if (!socialProof || socialProof.posts.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-[#1da1f2]/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-[#1da1f2]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Social Proof</h2>
          <p className="text-xs text-[#6a6a7a]">What people are saying online</p>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-[#a0a0b0] mb-5 p-3 rounded-lg bg-[#1a1a24] border-l-2 border-[#1da1f2]">
        {socialProof.summary}
      </p>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {socialProof.posts.slice(0, 6).map((post, i) => (
          <PostCard key={i} post={post} />
        ))}
      </div>

      {/* Validated Pain Points & Demand Signals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#1e1e2a]">
        {socialProof.painPointsValidated.length > 0 && (
          <div>
            <p className="text-xs text-[#6a6a7a] uppercase tracking-wider mb-2">Pain Points Validated</p>
            <div className="flex flex-wrap gap-2">
              {socialProof.painPointsValidated.map((point, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-[#22c55e]/10 text-[#22c55e]">
                  {point}
                </span>
              ))}
            </div>
          </div>
        )}
        {socialProof.demandSignals.length > 0 && (
          <div>
            <p className="text-xs text-[#6a6a7a] uppercase tracking-wider mb-2">Demand Signals</p>
            <div className="flex flex-wrap gap-2">
              {socialProof.demandSignals.map((signal, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">
                  {signal}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
