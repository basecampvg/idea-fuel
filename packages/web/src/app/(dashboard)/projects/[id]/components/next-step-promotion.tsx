'use client';

import { useState } from 'react';
import { Feather, Microscope, Sparkles, ArrowRight, Lock, Info, ChevronUp } from 'lucide-react';
import { useSubscription } from '@/components/subscription/use-subscription';
import {
  type JourneyState,
  type InterviewMode,
  getAvailableUpgrades,
  willReplaceResearch,
  getReplaceMessage,
  MODE_CONFIG,
} from '@forge/shared';

// =============================================================================
// TYPES
// =============================================================================

interface NextStepPromotionProps {
  projectId: string;
  journeyState: JourneyState;
  onStartMode: (mode: InterviewMode) => void;
  isStarting: boolean;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const ICONS = {
  Sparkles,
  Feather,
  Microscope,
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function NextStepPromotion({
  projectId,
  journeyState,
  onStartMode,
  isStarting,
}: NextStepPromotionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { canAccessMode, showUpgradePrompt } = useSubscription();

  const availableUpgrades = getAvailableUpgrades(journeyState);
  const showReplaceWarning = willReplaceResearch(journeyState);
  const replaceMessage = getReplaceMessage(journeyState);

  // Don't render if no upgrades available (journey complete)
  if (availableUpgrades.length === 0) {
    return null;
  }

  const handleModeClick = (mode: InterviewMode) => {
    // Check subscription access for IN_DEPTH
    if (mode === 'IN_DEPTH' && !canAccessMode('IN_DEPTH')) {
      showUpgradePrompt({ type: 'interview_mode', mode: 'IN_DEPTH' });
      return;
    }

    // Confirm if replacing existing research
    if (showReplaceWarning) {
      const message = replaceMessage || 'This will replace your current research. Continue?';
      if (!confirm(message)) {
        return;
      }
    }

    onStartMode(mode);
  };

  // Get header text based on journey state
  const headerText = journeyState === 'LIGHT_COMPLETE'
    ? 'Final Step: Unlock Full Reports'
    : 'Go Deeper';

  const headerDescription = journeyState === 'LIGHT_COMPLETE'
    ? 'Upgrade to the complete research suite with all 10 report types'
    : 'Upgrade your validation with more comprehensive analysis';

  return (
    <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground">{headerText}</h3>
            <p className="text-xs text-muted-foreground">{headerDescription}</p>
          </div>
        </div>
        <ChevronUp
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isCollapsed ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-4">
          {/* Mode Cards */}
          <div className={`grid gap-3 ${availableUpgrades.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {availableUpgrades.map((mode) => {
              const config = MODE_CONFIG[mode];
              const Icon = ICONS[config.iconName];
              const canAccess = mode !== 'IN_DEPTH' || canAccessMode('IN_DEPTH');

              return (
                <button
                  key={mode}
                  onClick={() => handleModeClick(mode)}
                  disabled={isStarting}
                  className={`
                    group relative rounded-xl bg-card border p-4 text-left transition-all duration-300
                    ${canAccess
                      ? `border-[${config.color}]/20 hover:border-[${config.color}]/50 hover:shadow-lg`
                      : 'border-border opacity-80'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  style={{
                    borderColor: canAccess ? `${config.color}20` : undefined,
                  }}
                >
                  {/* PRO badge for locked IN_DEPTH */}
                  {mode === 'IN_DEPTH' && !canAccess && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-primary/20 border border-primary/40 text-primary text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        PRO
                      </div>
                    </div>
                  )}

                  {/* Lock overlay for FREE users on IN_DEPTH */}
                  {mode === 'IN_DEPTH' && !canAccess && (
                    <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                        <Lock className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium text-primary">Upgrade to unlock</span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    {/* Header Row */}
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: config.bgColor }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <div>
                        <h4
                          className="text-sm font-semibold text-foreground transition-colors"
                          style={{ color: canAccess ? undefined : undefined }}
                        >
                          {config.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{config.tagline}</p>
                      </div>
                    </div>

                    {/* Benefits */}
                    <ul className="space-y-1 mb-3">
                      {config.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: config.color }} />
                          {benefit}
                        </li>
                      ))}
                    </ul>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{config.duration}</span>
                      <ArrowRight
                        className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-all"
                        style={{ color: canAccess ? config.color : undefined }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Replace Warning */}
          {showReplaceWarning && replaceMessage && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">{replaceMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
