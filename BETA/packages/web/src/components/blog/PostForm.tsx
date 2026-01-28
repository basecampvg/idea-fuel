'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TipTapEditor } from './TipTapEditor';
import { Save, Eye, X, Plus, ArrowLeft } from 'lucide-react';

type BlogPostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface PostFormData {
  title: string;
  slug?: string;
  description?: string;
  content: unknown;
  coverImage?: string | null;
  status: BlogPostStatus;
  tags: string[];
}

interface PostFormProps {
  initialData?: PostFormData;
  onSubmit: (data: PostFormData) => Promise<void>;
  isSubmitting?: boolean;
  mode: 'create' | 'edit';
}

const DEFAULT_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

export function PostForm({ initialData, onSubmit, isSubmitting, mode }: PostFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<PostFormData>({
    title: initialData?.title ?? '',
    slug: initialData?.slug,
    description: initialData?.description ?? '',
    content: initialData?.content ?? DEFAULT_CONTENT,
    coverImage: initialData?.coverImage,
    status: initialData?.status ?? 'DRAFT',
    tags: initialData?.tags ?? [],
  });
  const [tagInput, setTagInput] = useState('');

  const handleChange = useCallback((field: keyof PostFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  }, [tagInput, formData.tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await onSubmit(formData);
    },
    [formData, onSubmit]
  );

  const handleSaveAndPublish = useCallback(async () => {
    await onSubmit({ ...formData, status: 'PUBLISHED' });
  }, [formData, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back button */}
      <Button type="button" variant="ghost" onClick={() => router.push('/admin/blog')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Posts
      </Button>

      {/* Title and metadata */}
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Create New Post' : 'Edit Post'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter post title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Slug <span className="text-muted-foreground font-normal">(optional, auto-generated)</span>
            </label>
            <Input
              value={formData.slug ?? ''}
              onChange={(e) => handleChange('slug', e.target.value || undefined)}
              placeholder="custom-url-slug"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <Textarea
              value={formData.description ?? ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description for SEO and previews"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Cover Image URL</label>
            <Input
              value={formData.coverImage ?? ''}
              onChange={(e) => handleChange('coverImage', e.target.value || null)}
              placeholder="https://example.com/image.jpg"
              type="url"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="default" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <div className="flex gap-2">
              {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={formData.status === status ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleChange('status', status)}
                >
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content editor */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <TipTapEditor
            content={formData.content}
            onChange={(content) => handleChange('content', content)}
            placeholder="Start writing your blog post..."
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/blog')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !formData.title}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Draft'}
        </Button>
        {formData.status !== 'PUBLISHED' && (
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting || !formData.title}
            onClick={handleSaveAndPublish}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Publishing...' : 'Save & Publish'}
          </Button>
        )}
      </div>
    </form>
  );
}

export default PostForm;
