'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Globe,
  Lock,
  FileText,
  Eye,
  BarChart3,
} from 'lucide-react';
import { CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS } from '@forge/shared';
import type { InterviewQuestion, CustomerInterviewGating } from '@forge/shared';

function GatingOption({
  value,
  selected,
  label,
  description,
  icon: Icon,
  onSelect,
}: {
  value: CustomerInterviewGating;
  selected: boolean;
  label: string;
  description: string;
  icon: React.ElementType;
  onSelect: (v: CustomerInterviewGating) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex items-start gap-3 w-full rounded-xl border p-4 text-left transition-colors ${
        selected
          ? 'border-teal-500 bg-teal-500/10'
          : 'border-border bg-card hover:border-teal-500/50'
      }`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? 'text-teal-500' : 'text-muted-foreground'}`}
      />
      <div>
        <p className={`text-sm font-medium ${selected ? 'text-teal-400' : 'text-foreground'}`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}

export default function CustomerInterviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [gating, setGating] = useState<CustomerInterviewGating>('PUBLIC');
  const [password, setPassword] = useState('');
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const { data: ci, isLoading } = trpc.customerInterview.getByProject.useQuery({ projectId });

  const regenerate = trpc.customerInterview.regenerate.useMutation({
    onSuccess: () => utils.customerInterview.getByProject.invalidate({ projectId }),
  });

  const publish = trpc.customerInterview.publish.useMutation({
    onSuccess: () => utils.customerInterview.getByProject.invalidate({ projectId }),
  });

  const close = trpc.customerInterview.close.useMutation({
    onSuccess: () => utils.customerInterview.getByProject.invalidate({ projectId }),
  });

  const synthesize = trpc.customerInterview.synthesize.useMutation({
    onSuccess: (data) => {
      setIsSynthesizing(false);
      router.push(`/projects/${projectId}/reports`);
    },
    onError: () => setIsSynthesizing(false),
  });

  const shareUrl =
    typeof window !== 'undefined' && ci?.uuid
      ? `${window.location.origin}/interview/${ci.uuid}`
      : '';

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = () => {
    if (!ci) return;
    if (gating === 'PASSWORD' && !password.trim()) return;
    publish.mutate({
      id: ci.id,
      gating,
      password: gating === 'PASSWORD' ? password : undefined,
      waitlistEnabled,
      newsletterEnabled,
    });
  };

  const handleClose = () => {
    if (!ci) return;
    if (confirm('Close this interview? No new responses will be accepted.')) {
      close.mutate({ id: ci.id });
    }
  };

  const handleSynthesize = () => {
    if (!ci) return;
    setIsSynthesizing(true);
    synthesize.mutate({ customerInterviewId: ci.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex space-x-2">
          <div className="h-2 w-2 rounded-full bg-teal-500 animate-bounce" />
          <div className="h-2 w-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.15s]" />
          <div className="h-2 w-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.3s]" />
        </div>
      </div>
    );
  }

  if (!ci) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] px-6 gap-4">
        <p className="text-muted-foreground text-sm">No customer interview found for this project.</p>
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
      </div>
    );
  }

  const questions = (ci.questions as unknown as InterviewQuestion[]) ?? [];
  const responseCount = ci.responseCount ?? 0;
  const canSynthesize = responseCount >= CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Back nav */}
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{ci.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">Customer Interview</p>
        </div>
        {/* Status badge */}
        <span
          className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full ${
            ci.status === 'DRAFT'
              ? 'bg-muted text-muted-foreground'
              : ci.status === 'PUBLISHED'
              ? 'bg-teal-500/15 text-teal-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {ci.status === 'DRAFT' ? 'Draft' : ci.status === 'PUBLISHED' ? 'Live' : 'Closed'}
        </span>
      </div>

      {/* Questions preview */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Questions ({questions.length})
          </h2>
          {ci.status === 'DRAFT' && (
            <button
              onClick={() => regenerate.mutate({ id: ci.id })}
              disabled={regenerate.isPending}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${regenerate.isPending ? 'animate-spin' : ''}`}
              />
              Regenerate
            </button>
          )}
        </div>

        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={q.id} className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-teal-500/15 text-teal-400 text-xs font-medium flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm text-foreground leading-snug">{q.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {q.type.toLowerCase().replace('_', ' ')}
                  {q.required ? ' · required' : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* DRAFT: Gating + Publish */}
      {ci.status === 'DRAFT' && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Access Settings</h2>

          <div className="space-y-2">
            <GatingOption
              value="PUBLIC"
              selected={gating === 'PUBLIC'}
              label="Public"
              description="Anyone with the link can respond"
              icon={Globe}
              onSelect={setGating}
            />
            <GatingOption
              value="PASSWORD"
              selected={gating === 'PASSWORD'}
              label="Password protected"
              description="Respondents need a password to access"
              icon={Lock}
              onSelect={setGating}
            />
            <GatingOption
              value="NDA"
              selected={gating === 'NDA'}
              label="NDA required"
              description="Respondents must sign an NDA before responding"
              icon={FileText}
              onSelect={setGating}
            />
          </div>

          {gating === 'PASSWORD' && (
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password for respondents"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={waitlistEnabled}
                onChange={(e) => setWaitlistEnabled(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Collect waitlist sign-ups</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newsletterEnabled}
                onChange={(e) => setNewsletterEnabled(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Collect newsletter opt-ins</span>
            </label>
          </div>

          <button
            onClick={handlePublish}
            disabled={publish.isPending || (gating === 'PASSWORD' && !password.trim())}
            className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {publish.isPending ? 'Publishing…' : 'Publish Interview'}
          </button>
        </div>
      )}

      {/* PUBLISHED: Share link + actions */}
      {ci.status === 'PUBLISHED' && (
        <div className="space-y-4">
          {/* Share link */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Share Link</h2>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground focus:outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-teal-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Response count + actions */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Responses</h2>
              <span className="text-2xl font-bold text-teal-400">{responseCount}</span>
            </div>

            {responseCount === 0 && (
              <p className="text-xs text-muted-foreground">
                Share the link above to start collecting responses.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Link
                href={`/projects/${projectId}/customer-interview/responses`}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-full border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Eye className="h-4 w-4" />
                View Responses
              </Link>

              <button
                onClick={handleSynthesize}
                disabled={!canSynthesize || isSynthesizing || synthesize.isPending}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-teal-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  !canSynthesize
                    ? `Need at least ${CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS} responses to generate the report`
                    : undefined
                }
              >
                <BarChart3 className="h-4 w-4" />
                {isSynthesizing || synthesize.isPending
                  ? 'Generating Report…'
                  : `Generate Customer Discovery Report${!canSynthesize ? ` (need ${CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS - responseCount} more)` : ''}`}
              </button>

              <button
                onClick={handleClose}
                disabled={close.isPending}
                className="inline-flex items-center justify-center gap-2 py-2 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {close.isPending ? 'Closing…' : 'Close Interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSED */}
      {ci.status === 'CLOSED' && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground">
              Closed
            </span>
            <p className="text-sm text-muted-foreground">This interview is no longer accepting responses.</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total responses</span>
            <span className="text-xl font-bold text-foreground">{responseCount}</span>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href={`/projects/${projectId}/customer-interview/responses`}
              className="inline-flex items-center justify-center gap-2 py-2.5 rounded-full border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Eye className="h-4 w-4" />
              View Responses
            </Link>

            {canSynthesize && (
              <button
                onClick={handleSynthesize}
                disabled={isSynthesizing || synthesize.isPending}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-teal-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <BarChart3 className="h-4 w-4" />
                {isSynthesizing || synthesize.isPending
                  ? 'Generating Report…'
                  : 'Generate Customer Discovery Report'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
