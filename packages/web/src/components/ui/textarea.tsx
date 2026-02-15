import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, hint, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            block w-full rounded-lg border px-3 py-2 text-sm
            placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground
            ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-border focus:border-primary focus:ring-primary'
            }
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
        )}
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
