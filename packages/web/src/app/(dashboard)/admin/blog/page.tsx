'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/spinner';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  FileText,
  Clock,
  Calendar,
  MoreVertical,
  Archive,
  Send,
} from 'lucide-react';

type BlogPostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const STATUS_CONFIG: Record<BlogPostStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  DRAFT: { label: 'Draft', variant: 'warning' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'default' },
};

export default function AdminBlogPage() {
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.blog.adminList.useQuery({
    limit: 50,
    status: statusFilter,
  });

  const deleteMutation = trpc.blog.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteConfirm(null);
    },
  });

  const updateMutation = trpc.blog.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  const posts = data?.items ?? [];

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Blog Posts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your blog content</p>
        </div>
        <Link href="/admin/blog/new">
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: undefined, label: 'All' },
          { key: 'DRAFT' as const, label: 'Drafts' },
          { key: 'PUBLISHED' as const, label: 'Published' },
          { key: 'ARCHIVED' as const, label: 'Archived' },
        ].map((filter) => (
          <button
            key={filter.label}
            onClick={() => setStatusFilter(filter.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === filter.key
                ? 'bg-primary/10 text-primary border border-primary/50'
                : 'text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">No blog posts yet</p>
          <Link href="/admin/blog/new">
            <Button variant="outline" size="sm">Create your first post</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-card transition-colors hover:border-border/80"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    post.status === 'PUBLISHED' ? 'bg-primary' :
                    post.status === 'DRAFT' ? 'bg-warning' : 'bg-muted-foreground'
                  }`} />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {STATUS_CONFIG[post.status].label}
                  </span>
                  {post.tags.length > 0 && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <div className="flex gap-1">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                        {post.tags.length > 2 && (
                          <span className="text-[10px] text-muted-foreground/60">+{post.tags.length - 2}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <h3 className="font-medium text-sm text-foreground truncate">{post.title}</h3>
                {post.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                  {post.readingTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readingTime}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Quick actions */}
                {post.status === 'DRAFT' && (
                  <button
                    onClick={() => updateMutation.mutate({ id: post.id, data: { status: 'PUBLISHED' } })}
                    disabled={updateMutation.isPending}
                    title="Publish"
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
                {post.status === 'PUBLISHED' && (
                  <>
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => updateMutation.mutate({ id: post.id, data: { status: 'ARCHIVED' } })}
                      disabled={updateMutation.isPending}
                      title="Archive"
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </>
                )}
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Link>
                {deleteConfirm === post.id ? (
                  <div className="flex items-center gap-1 ml-1">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ id: post.id })}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(post.id)}
                    title="Delete"
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
