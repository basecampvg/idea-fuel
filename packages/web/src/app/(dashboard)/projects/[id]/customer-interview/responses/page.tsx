'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, Mail, User, CheckCircle } from 'lucide-react';
import type { InterviewQuestion, InterviewAnswer } from '@forge/shared';

export default function CustomerInterviewResponsesPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const { data: ci, isLoading: ciLoading } = trpc.customerInterview.getByProject.useQuery({
    projectId,
  });

  const { data: responses, isLoading: responsesLoading } =
    trpc.customerInterview.listResponses.useQuery(
      { customerInterviewId: ci?.id ?? '' },
      { enabled: !!ci?.id },
    );

  const isLoading = ciLoading || responsesLoading;

  const questions: InterviewQuestion[] = ci
    ? ((ci.questions as unknown as InterviewQuestion[]) ?? [])
    : [];

  const getAnswer = (answers: InterviewAnswer[], questionId: string): string => {
    const answer = answers.find((a) => a.questionId === questionId);
    if (answer === undefined) return '—';
    const val = answer.value;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back nav */}
      <Link
        href={`/projects/${projectId}/customer-interview`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Interview
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Responses</h1>
        {ci && (
          <p className="text-sm text-muted-foreground mt-1">
            {ci.title} · {responses?.length ?? 0} response{responses?.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Empty state */}
      {(!responses || responses.length === 0) && (
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-3 text-center">
          <CheckCircle className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No responses yet.</p>
          <p className="text-xs text-muted-foreground/70">
            Share the interview link to start collecting responses.
          </p>
        </div>
      )}

      {/* Response cards */}
      {responses && responses.length > 0 && (
        <div className="space-y-4">
          {responses.map((response, idx) => {
            const answers = (response.answers as unknown as InterviewAnswer[]) ?? [];
            const completedAt = response.completedAt
              ? new Date(response.completedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : null;

            return (
              <div
                key={response.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Response header */}
                <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-teal-500/15 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-teal-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {response.respondentName ?? `Respondent ${idx + 1}`}
                      </p>
                      {response.respondentEmail && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {response.respondentEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {response.joinedWaitlist && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-400 font-medium">
                        Waitlist
                      </span>
                    )}
                    {response.joinedNewsletter && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                        Newsletter
                      </span>
                    )}
                    {completedAt && (
                      <span className="text-xs text-muted-foreground">{completedAt}</span>
                    )}
                  </div>
                </div>

                {/* Q&A */}
                <div className="divide-y divide-border">
                  {questions.map((q, qIdx) => (
                    <div key={q.id} className="px-5 py-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Q{qIdx + 1}. {q.text}
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {getAnswer(answers, q.id)}
                      </p>
                    </div>
                  ))}
                  {questions.length === 0 && answers.length > 0 && (
                    <div className="px-5 py-4">
                      {answers.map((a) => (
                        <div key={a.questionId} className="mb-3 last:mb-0">
                          <p className="text-xs text-muted-foreground mb-0.5">{a.questionId}</p>
                          <p className="text-sm text-foreground">{String(a.value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
