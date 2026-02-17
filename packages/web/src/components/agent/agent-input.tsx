'use client';

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';

interface AgentInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function AgentInput({ onSend, onStop, isLoading, disabled }: AgentInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isLoading, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-resize textarea
  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  return (
    <div className="border-t border-border bg-background p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your project..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm
            placeholder:text-muted-foreground/50
            focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50
            disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />
        {isLoading ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-destructive/10 text-destructive
              flex items-center justify-center hover:bg-destructive/20 transition-colors"
            title="Stop generating"
          >
            <Square className="w-3.5 h-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground
              flex items-center justify-center hover:bg-primary/90 transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
        Shift+Enter for new line
      </p>
    </div>
  );
}
