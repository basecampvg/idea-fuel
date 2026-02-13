'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion, useInView } from 'motion/react';

// ─── Demo timing constants (seconds) ───
const TYPING_SPEED_MS = 55;
const DEMO_IDEA = 'An AI-powered meal planning app that reduces food waste';
const PAUSE_BEFORE_MOVE = 0.4;
const CURSOR_MOVE_DURATION = 0.6;
const CLICK_DURATION = 0.3;
const TRANSITION_DURATION = 0.5;
const CHAT_STAGGER_DELAY = 1.2;
const HOLD_DURATION = 3000;
const FADE_DURATION = 1200;
const RESET_PAUSE = 1500;

type DemoPhase = 'idle' | 'typing' | 'moving' | 'clicking' | 'transitioning' | 'chat' | 'holding' | 'fading';

/**
 * Animated cursor demo showing the product "in use":
 * Types an idea → clicks Forge → shows interview beginning
 * Loops continuously, pauses when not visible.
 */
export function AnimatedCursorDemo() {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [phase, setPhase] = useState<DemoPhase>('idle');
  const [typedText, setTypedText] = useState('');
  const [chatMessages, setChatMessages] = useState<number>(0);
  const [cursorPos, setCursorPos] = useState<{ x: string; y: string }>({ x: '50%', y: '55%' });
  const [buttonPressed, setButtonPressed] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isRunningRef = useRef(false);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const resetState = useCallback(() => {
    setPhase('idle');
    setTypedText('');
    setChatMessages(0);
    setCursorPos({ x: '50%', y: '55%' });
    setButtonPressed(false);
    setShowLoading(false);
    setOpacity(1);
  }, []);

  const runDemoLoop = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    clearAllTimeouts();
    resetState();

    let elapsed = 0;

    // Phase: idle (brief pause)
    const idleDuration = 500;
    elapsed += idleDuration;

    // Phase: typing
    schedule(() => setPhase('typing'), elapsed);
    for (let i = 0; i < DEMO_IDEA.length; i++) {
      const charDelay = elapsed + i * TYPING_SPEED_MS;
      schedule(() => {
        setTypedText(DEMO_IDEA.slice(0, i + 1));
      }, charDelay);
    }
    elapsed += DEMO_IDEA.length * TYPING_SPEED_MS;

    // Phase: pause, then move cursor to button
    elapsed += PAUSE_BEFORE_MOVE * 1000;
    schedule(() => {
      setPhase('moving');
      setCursorPos({ x: '82%', y: '55%' });
    }, elapsed);
    elapsed += CURSOR_MOVE_DURATION * 1000;

    // Phase: click
    schedule(() => {
      setPhase('clicking');
      setButtonPressed(true);
    }, elapsed);
    elapsed += CLICK_DURATION * 1000;
    schedule(() => {
      setButtonPressed(false);
    }, elapsed);

    // Phase: transition to loading
    elapsed += 200;
    schedule(() => {
      setPhase('transitioning');
      setShowLoading(true);
    }, elapsed);
    elapsed += TRANSITION_DURATION * 1000;

    // Phase: chat messages appear
    schedule(() => {
      setPhase('chat');
      setShowLoading(false);
      setChatMessages(1);
    }, elapsed);
    elapsed += CHAT_STAGGER_DELAY * 1000;
    schedule(() => setChatMessages(2), elapsed);

    // Phase: hold
    elapsed += HOLD_DURATION;
    schedule(() => setPhase('holding'), elapsed);

    // Phase: fade out
    elapsed += 500;
    schedule(() => {
      setPhase('fading');
      setOpacity(0);
    }, elapsed);

    // Reset and restart
    elapsed += FADE_DURATION;
    schedule(() => {
      resetState();
      isRunningRef.current = false;
    }, elapsed);
    schedule(() => {
      runDemoLoop();
    }, elapsed + RESET_PAUSE);
  }, [clearAllTimeouts, resetState, schedule]);

  // Start/stop loop based on visibility
  useEffect(() => {
    if (prefersReducedMotion || !isInView) {
      clearAllTimeouts();
      isRunningRef.current = false;
      if (!isInView) resetState();
      return;
    }
    runDemoLoop();
    return () => {
      clearAllTimeouts();
      isRunningRef.current = false;
    };
  }, [isInView, prefersReducedMotion, runDemoLoop, clearAllTimeouts, resetState]);

  // Reduced motion: show static screenshot of the completed state
  if (prefersReducedMotion) {
    return (
      <div ref={containerRef} className="relative aspect-[4/3] w-full p-6">
        <StaticDemoState />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full overflow-hidden"
      style={{ opacity, transition: `opacity ${FADE_DURATION}ms ease-in-out` }}
    >
      {/* Fake app UI */}
      <div className="flex h-full flex-col p-5">
        {/* App header */}
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/30" />
          <span className="text-xs font-medium text-foreground/70">IdeationLab</span>
        </div>

        {/* Content area — either input or chat */}
        {phase !== 'chat' && phase !== 'holding' && !showLoading ? (
          <InputPhaseUI typedText={typedText} buttonPressed={buttonPressed} />
        ) : showLoading ? (
          <LoadingPhaseUI />
        ) : (
          <ChatPhaseUI messageCount={chatMessages} />
        )}
      </div>

      {/* Animated cursor */}
      <AnimatedCursor x={cursorPos.x} y={cursorPos.y} phase={phase} />
    </div>
  );
}

// ─── Sub-components ───

function InputPhaseUI({ typedText, buttonPressed }: { typedText: string; buttonPressed: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <p className="text-center text-sm font-medium text-foreground/80">
        What&apos;s your business idea?
      </p>
      <div className="w-full max-w-[280px]">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground/90">
          {typedText || (
            <span className="text-muted-foreground/50">Describe your idea...</span>
          )}
          {typedText.length > 0 && typedText.length < DEMO_IDEA.length && (
            <span className="typewriter-cursor">|</span>
          )}
        </div>
      </div>
      <motion.div
        className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-[0_0_20px_hsl(160_84%_44%/0.3)]"
        animate={{
          scale: buttonPressed ? 0.95 : 1,
          boxShadow: buttonPressed
            ? '0 0 30px hsl(160 84% 44% / 0.6)'
            : '0 0 20px hsl(160 84% 44% / 0.3)',
        }}
        transition={{ duration: 0.15 }}
      >
        Forge
      </motion.div>
    </div>
  );
}

function LoadingPhaseUI() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Analyzing your idea...</p>
    </div>
  );
}

function ChatPhaseUI({ messageCount }: { messageCount: number }) {
  const messages = [
    "Interesting idea! Tell me more about your meal planning concept. What specific problem does it solve?",
    "Who is your target audience — busy professionals, families, or health-conscious individuals?",
  ];

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-1 pt-2">
      <div className="mb-1 flex items-center gap-2 border-b border-white/5 pb-2">
        <div className="h-5 w-5 rounded-full bg-primary/30 flex items-center justify-center">
          <span className="text-[8px] text-primary">AI</span>
        </div>
        <span className="text-xs text-foreground/60">Interview</span>
      </div>
      {messages.slice(0, messageCount).map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="rounded-xl bg-white/5 border border-white/5 px-3 py-2.5 text-xs leading-relaxed text-foreground/80"
        >
          {msg}
        </motion.div>
      ))}
    </div>
  );
}

function AnimatedCursor({ x, y, phase }: { x: string; y: string; phase: DemoPhase }) {
  if (phase === 'fading' || phase === 'idle') return null;

  return (
    <motion.div
      className="pointer-events-none absolute z-10"
      animate={{ left: x, top: y }}
      transition={{
        duration: phase === 'moving' ? CURSOR_MOVE_DURATION : 0,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* Cursor SVG */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
        <path
          d="M5.65 2.44L20.16 12.1a.5.5 0 01-.22.9l-6.97.89a.5.5 0 00-.4.31l-2.54 6.63a.5.5 0 01-.95-.05L5.11 3.02a.5.5 0 01.54-.58z"
          fill="white"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.5"
        />
      </svg>
      {/* Subtle glow behind cursor */}
      <div className="absolute -inset-2 rounded-full bg-primary/20 blur-md" />
    </motion.div>
  );
}

function StaticDemoState() {
  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary/30" />
        <span className="text-xs font-medium text-foreground/70">IdeationLab</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-1 pt-2">
        <div className="mb-1 flex items-center gap-2 border-b border-white/5 pb-2">
          <div className="h-5 w-5 rounded-full bg-primary/30 flex items-center justify-center">
            <span className="text-[8px] text-primary">AI</span>
          </div>
          <span className="text-xs text-foreground/60">Interview</span>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/5 px-3 py-2.5 text-xs leading-relaxed text-foreground/80">
          Interesting idea! Tell me more about your meal planning concept. What specific problem does it solve?
        </div>
        <div className="rounded-xl bg-white/5 border border-white/5 px-3 py-2.5 text-xs leading-relaxed text-foreground/80">
          Who is your target audience — busy professionals, families, or health-conscious individuals?
        </div>
      </div>
    </div>
  );
}
