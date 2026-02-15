'use client';

import { BookOpen, Clock, Quote, ArrowRight } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface UserStoryData {
  scenario: string;
  protagonist: string;
  problem: string;
  solution: string;
  outcome: string;
  dayInTheLife?: {
    before: string;
    after: string;
    timeSaved: string;
  };
  emotionalArc?: {
    frustration: string;
    discovery: string;
    relief: string;
  };
  quote?: string;
}

interface UserStoryProps {
  userStory?: UserStoryData | null;
  title?: string;
  subtitle?: string;
}

export function UserStory({ userStory, title = 'The Story', subtitle }: UserStoryProps) {
  if (!userStory) return null;

  return (
    <CollapsibleSection
      icon={<BookOpen className="w-5 h-5 text-primary" />}
      iconBgColor="hsl(var(--primary) / 0.15)"
      title={title}
      subtitle={subtitle}
    >
      <div className="space-y-5">
        {/* Scenario - Main narrative */}
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {userStory.scenario}
        </p>

        {/* Key elements grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-card border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">The User</p>
            <p className="text-sm text-foreground">{userStory.protagonist}</p>
          </div>
          <div className="p-3 rounded-lg bg-card border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Their Problem</p>
            <p className="text-sm text-muted-foreground">{userStory.problem}</p>
          </div>
          <div className="p-3 rounded-lg bg-card border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">The Solution</p>
            <p className="text-sm text-muted-foreground">{userStory.solution}</p>
          </div>
          <div className="p-3 rounded-lg bg-card border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">The Outcome</p>
            <p className="text-sm text-primary">{userStory.outcome}</p>
          </div>
        </div>

        {/* Day in the Life - Before/After */}
        {userStory.dayInTheLife && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">A Day in the Life</p>
              {userStory.dayInTheLife.timeSaved && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                  Saves {userStory.dayInTheLife.timeSaved}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Before</p>
                <p className="text-xs text-muted-foreground">{userStory.dayInTheLife.before}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-primary uppercase tracking-wider mb-1">After</p>
                <p className="text-xs text-muted-foreground">{userStory.dayInTheLife.after}</p>
              </div>
            </div>
          </div>
        )}

        {/* Emotional Arc */}
        {userStory.emotionalArc && (
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Emotional Journey</p>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 p-3 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Frustration</p>
                <p className="text-xs text-muted-foreground">{userStory.emotionalArc.frustration}</p>
              </div>
              <div className="hidden sm:flex items-center shrink-0">
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex-1 p-3 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Discovery</p>
                <p className="text-xs text-muted-foreground">{userStory.emotionalArc.discovery}</p>
              </div>
              <div className="hidden sm:flex items-center shrink-0">
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex-1 p-3 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-primary uppercase tracking-wider mb-1">Relief</p>
                <p className="text-xs text-muted-foreground">{userStory.emotionalArc.relief}</p>
              </div>
            </div>
          </div>
        )}

        {/* Testimonial Quote */}
        {userStory.quote && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-start gap-2">
              <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80 italic leading-relaxed">{userStory.quote}</p>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
