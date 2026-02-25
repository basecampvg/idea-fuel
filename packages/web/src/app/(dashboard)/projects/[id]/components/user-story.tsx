'use client';

import { useState } from 'react';
import { Clock, Quote, ArrowRight, ChevronDown } from 'lucide-react';
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

function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between pb-2 border-b border-border cursor-pointer"
      >
        <span className="font-mono text-xs font-light uppercase tracking-[1px] text-primary">
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-primary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  );
}

export function UserStory({ userStory, title = 'The Story', subtitle }: UserStoryProps) {
  if (!userStory) return null;

  return (
    <CollapsibleSection title={title}>
      <div className="space-y-5">
        {/* Scenario - Main narrative */}
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
          {userStory.scenario}
        </p>

        {/* Key elements as accordion items */}
        <div className="space-y-6">
          <AccordionItem title="The User" defaultOpen>
            <p className="text-sm text-foreground">{userStory.protagonist}</p>
          </AccordionItem>

          <AccordionItem title="Their Problem">
            <p className="text-sm text-foreground">{userStory.problem}</p>
          </AccordionItem>

          <AccordionItem title="The Solution">
            <p className="text-sm text-foreground">{userStory.solution}</p>
          </AccordionItem>

          <AccordionItem title="The Outcome">
            <p className="text-sm text-foreground">{userStory.outcome}</p>
          </AccordionItem>

          {/* Day in the Life - Before/After */}
          {userStory.dayInTheLife && (
            <AccordionItem title="A Day in the Life">
              {userStory.dayInTheLife.timeSaved && (
                <div className="flex items-start gap-3 py-3 px-4 rounded-lg bg-primary/5 border-l-3 border-primary mb-3">
                  <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-primary">
                    Saves {userStory.dayInTheLife.timeSaved}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Before</p>
                  <p className="text-sm text-foreground">{userStory.dayInTheLife.before}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">After</p>
                  <p className="text-sm text-foreground">{userStory.dayInTheLife.after}</p>
                </div>
              </div>
            </AccordionItem>
          )}

          {/* Emotional Arc */}
          {userStory.emotionalArc && (
            <AccordionItem title="Emotional Journey">
              <div className="flex flex-col sm:flex-row items-stretch gap-4">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Frustration</p>
                  <p className="text-sm text-foreground">{userStory.emotionalArc.frustration}</p>
                </div>
                <div className="hidden sm:flex items-center shrink-0">
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">Discovery</p>
                  <p className="text-sm text-foreground">{userStory.emotionalArc.discovery}</p>
                </div>
                <div className="hidden sm:flex items-center shrink-0">
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Relief</p>
                  <p className="text-sm text-foreground">{userStory.emotionalArc.relief}</p>
                </div>
              </div>
            </AccordionItem>
          )}
        </div>

        {/* Testimonial Quote */}
        {userStory.quote && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-start gap-2">
              <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground italic leading-relaxed">{userStory.quote}</p>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
