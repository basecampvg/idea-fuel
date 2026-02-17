'use client';

import { Bot, User } from 'lucide-react';

interface AgentMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function AgentMessage({ role, content }: AgentMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" />
        ) : (
          <Bot className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none
              prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
              prose-headings:my-2 prose-headings:text-sm
              prose-code:text-xs prose-code:bg-background/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
          />
        )}
      </div>
    </div>
  );
}

/** Streaming indicator for assistant responses */
export function AgentTypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal Markdown to HTML formatter.
 * Handles bold, italic, code, links, and line breaks.
 * For full Markdown, swap to a library like react-markdown + rehype-sanitize.
 */
function formatMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />');
}
