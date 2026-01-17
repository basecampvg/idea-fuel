import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'accent-outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground)]/90 focus-visible:ring-[var(--foreground)]',
  secondary:
    'bg-transparent text-[#a0a0b0] hover:text-white focus-visible:ring-[var(--border)]',
  outline:
    'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--card-bg)] hover:border-[var(--border-strong)] focus-visible:ring-[var(--border)]',
  ghost:
    'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)] focus-visible:ring-[var(--border)]',
  danger:
    'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 focus-visible:ring-red-500',
  accent: `
    bg-[#e91e8c] text-white font-medium
    rounded-full
    shadow-[0_0_20px_rgba(233,30,140,0.3)]
    hover:shadow-[0_0_30px_rgba(233,30,140,0.5)]
    focus-visible:ring-[#e91e8c]
    disabled:opacity-50 disabled:shadow-none
  `,
  'accent-outline': `
    border border-[#4ecdc4]/50 text-[#4ecdc4]
    bg-transparent
    hover:bg-[#4ecdc4]/10 hover:border-[#4ecdc4]/70
    focus-visible:ring-[#4ecdc4]
    disabled:opacity-50
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap
          transition-all duration-300
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]
          disabled:cursor-not-allowed
          active:scale-[0.98]
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {isLoading && (
          <svg className="h-4 w-4 animate-spin flex-shrink-0" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
