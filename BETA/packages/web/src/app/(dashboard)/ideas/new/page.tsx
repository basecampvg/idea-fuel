'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { INTERVIEW_MODE_LABELS, INTERVIEW_MODE_DESCRIPTIONS } from '@forge/shared';

type InterviewMode = 'LIGHTNING' | 'LIGHT' | 'IN_DEPTH';

export default function NewIdeaPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<InterviewMode>('LIGHT');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  const startInterview = trpc.idea.startInterview.useMutation();

  const createIdea = trpc.idea.create.useMutation({
    onSuccess: async (data) => {
      // After creating the idea, start the interview with selected mode
      await startInterview.mutateAsync({ ideaId: data.id, mode });
      router.push(`/ideas/${data.id}/interview`);
    },
    onError: (error) => {
      alert('Failed to create idea: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: { title?: string; description?: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createIdea.mutate({ title, description });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/ideas"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Ideas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Capture a New Idea</h1>
        <p className="mt-1 text-gray-500">
          Describe your business idea and choose how you&apos;d like to develop it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Idea Details */}
        <Card>
          <CardHeader>
            <CardTitle>Idea Details</CardTitle>
            <CardDescription>
              Tell us about your business idea
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Title"
              placeholder="e.g., AI-powered meal planning app"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              error={errors.title}
            />
            <Textarea
              label="Description"
              placeholder="Describe your business idea in detail. What problem does it solve? Who is it for?"
              rows={5}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              error={errors.description}
              hint="The more detail you provide, the better our AI can help you develop your idea."
            />
          </CardContent>
        </Card>

        {/* Interview Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Mode</CardTitle>
            <CardDescription>
              Choose how you want to explore your idea
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(['LIGHTNING', 'LIGHT', 'IN_DEPTH'] as const).map((modeOption) => (
                <label
                  key={modeOption}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                    mode === modeOption
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={modeOption}
                    checked={mode === modeOption}
                    onChange={() => setMode(modeOption)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      {INTERVIEW_MODE_LABELS[modeOption]}
                      {modeOption === 'LIGHT' && (
                        <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {INTERVIEW_MODE_DESCRIPTIONS[modeOption]}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/ideas">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={createIdea.isPending}>
            {mode === 'LIGHTNING' ? 'Create & Start Research' : 'Create & Start Interview'}
          </Button>
        </div>
      </form>
    </div>
  );
}
