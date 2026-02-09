'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { PostForm } from '@/components/blog';

export default function NewBlogPostPage() {
  const router = useRouter();

  const createMutation = trpc.blog.create.useMutation({
    onSuccess: (post) => {
      router.push(`/admin/blog/${post.id}`);
    },
  });

  const handleSubmit = async (data: {
    title: string;
    slug?: string;
    description?: string;
    content: unknown;
    coverImage?: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    tags: string[];
  }) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="p-8 max-w-4xl">
      <PostForm
        mode="create"
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
      />
      {createMutation.isError && (
        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-xl text-sm">
          Error: {createMutation.error.message}
        </div>
      )}
    </div>
  );
}
