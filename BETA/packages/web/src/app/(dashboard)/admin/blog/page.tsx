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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog Posts</h1>
          <p className="text-muted-foreground">Manage your blog content</p>
        </div>
        <Link href="/admin/blog/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === undefined ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter(undefined)}
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'DRAFT' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('DRAFT')}
        >
          Drafts
        </Button>
        <Button
          variant={statusFilter === 'PUBLISHED' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('PUBLISHED')}
        >
          Published
        </Button>
        <Button
          variant={statusFilter === 'ARCHIVED' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('ARCHIVED')}
        >
          Archived
        </Button>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No blog posts yet</p>
            <Link href="/admin/blog/new" className="mt-4 inline-block">
              <Button variant="outline">Create your first post</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={STATUS_CONFIG[post.status].variant}>
                        {STATUS_CONFIG[post.status].label}
                      </Badge>
                      {post.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="default">
                          {tag}
                        </Badge>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{post.tags.length - 3}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                    {post.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
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
                      <span>by {post.author.name || post.author.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick actions */}
                    {post.status === 'DRAFT' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateMutation.mutate({ id: post.id, data: { status: 'PUBLISHED' } })}
                        disabled={updateMutation.isPending}
                        title="Publish"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    {post.status === 'PUBLISHED' && (
                      <>
                        <Link href={`/blog/${post.slug}`} target="_blank">
                          <Button variant="outline" size="sm" title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: post.id, data: { status: 'ARCHIVED' } })}
                          disabled={updateMutation.isPending}
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Link href={`/admin/blog/${post.id}`}>
                      <Button variant="outline" size="sm" title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    {deleteConfirm === post.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteMutation.mutate({ id: post.id })}
                          disabled={deleteMutation.isPending}
                        >
                          Confirm
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(post.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
