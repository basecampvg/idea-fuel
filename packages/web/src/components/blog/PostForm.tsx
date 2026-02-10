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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/blog')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-lg font-semibold text-foreground">
            {mode === 'create' ? 'New Post' : 'Edit Post'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleChange('status', status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                formData.status === status
                  ? status === 'PUBLISHED'
                    ? 'bg-primary/10 text-primary border border-primary/50'
                    : status === 'ARCHIVED'
                    ? 'bg-muted text-muted-foreground border border-border'
                    : 'bg-warning/10 text-warning border border-warning/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Title and metadata */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Title
          </label>
          <Input
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter post title"
            required
            className="text-lg font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Slug <span className="text-muted-foreground/60 normal-case">(auto-generated)</span>
            </label>
            <Input
              value={formData.slug ?? ''}
              onChange={(e) => handleChange('slug', e.target.value || undefined)}
              placeholder="custom-url-slug"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Cover Image URL
            </label>
            <Input
              value={formData.coverImage ?? ''}
              onChange={(e) => handleChange('coverImage', e.target.value || null)}
              placeholder="https://example.com/image.jpg"
              type="url"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Description
          </label>
          <Textarea
            value={formData.description ?? ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Brief description for SEO and previews"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Tags
          </label>
          <div className="flex gap-2 mb-3 flex-wrap min-h-[28px]">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="default" className="gap-1 text-xs">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-0.5 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {formData.tags.length === 0 && (
              <span className="text-xs text-muted-foreground/60">No tags added</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a tag and press Enter"
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content editor */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Content</h2>
        </div>
        <div className="p-6">
          <TipTapEditor
            content={formData.content}
            onChange={(content) => handleChange('content', content)}
            placeholder="Start writing your blog post..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/blog')}
          className="text-muted-foreground"
        >
          Cancel
        </Button>
        <Button type="submit" variant="outline" size="sm" disabled={isSubmitting || !formData.title}>
          <Save className="h-4 w-4 mr-1.5" />
          {isSubmitting ? 'Saving...' : 'Save Draft'}
        </Button>
        {formData.status !== 'PUBLISHED' && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSubmitting || !formData.title}
            onClick={handleSaveAndPublish}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            {isSubmitting ? 'Publishing...' : 'Publish'}
          </Button>
        )}
      </div>
    </form>
  );
}

export default PostForm;
