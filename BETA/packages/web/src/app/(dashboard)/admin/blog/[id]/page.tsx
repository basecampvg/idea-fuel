'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { PostForm } from '@/components/blog';
import { LoadingScreen } from '@/components/ui/spinner';

export default function EditBlogPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: post, isLoading, error } = trpc.blog.adminGet.useQuery({
    id: params.id,
  });

  const updateMutation = trpc.blog.update.useMutation({
    onSuccess: () => {
      router.push('/admin/blog');
    },
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !post) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center py-12">
          <h1 className="text-lg font-semibold text-destructive mb-2">Post Not Found</h1>
          <p className="text-sm text-muted-foreground">The blog post you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: {
    title: string;
    slug?: string;
    description?: string;
    content: unknown;
    coverImage?: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    tags: string[];
  }) => {
    await updateMutation.mutateAsync({
      id: post.id,
      data,
    });
  };

  return (
    <div className="p-8 max-w-4xl">
      <PostForm
        mode="edit"
        initialData={{
          title: post.title,
          slug: post.slug,
          description: post.description ?? undefined,
          content: post.content,
          coverImage: post.coverImage,
          status: post.status,
          tags: post.tags,
        }}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
      />
      {updateMutation.isError && (
        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-xl text-sm">
          Error: {updateMutation.error.message}
        </div>
      )}
    </div>
  );
}
