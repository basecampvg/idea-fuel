'use client';

import { Check, GraduationCap, BarChart3, Microscope } from 'lucide-react';

type KnowledgeLevel = 'BEGINNER' | 'STANDARD' | 'EXPERT';

const levels: {
  value: KnowledgeLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'BEGINNER',
    label: 'Beginner',
    description: '~10 key assumptions for quick estimates',
    icon: <GraduationCap className="w-4 h-4" />,
  },
  {
    value: 'STANDARD',
    label: 'Standard',
    description: '25-40 assumptions with good detail',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    value: 'EXPERT',
    label: 'Expert',
    description: '75+ assumptions for full financial detail',
    icon: <Microscope className="w-4 h-4" />,
  },
];

interface KnowledgeLevelSelectorProps {
  value: KnowledgeLevel;
  onChange: (level: KnowledgeLevel) => void;
  disabled?: boolean;
}

export function KnowledgeLevelSelector({ value, onChange, disabled }: KnowledgeLevelSelectorProps) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-card/50 border border-border">
      {levels.map((level) => {
        const isSelected = value === level.value;
        return (
          <button
            key={level.value}
            onClick={() => onChange(level.value)}
            disabled={disabled}
            title={level.description}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${isSelected
                ? 'bg-primary/20 text-primary shadow-sm'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span className={isSelected ? 'text-primary' : ''}>{level.icon}</span>
            <span>{level.label}</span>
            {isSelected && <Check className="w-3.5 h-3.5" />}
          </button>
        );
      })}
    </div>
  );
}
