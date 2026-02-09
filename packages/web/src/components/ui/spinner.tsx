interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div className={`relative ${sizeStyles[size]} ${className}`}>
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-md animate-pulse" />

      {/* Main spinner */}
      <svg
        className="relative animate-spin"
        viewBox="0 0 50 50"
      >
        <defs>
          <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="url(#spinnerGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="90 150"
        />
      </svg>
    </div>
  );
}

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background z-50">
      {/* Animated dots loader */}
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
        <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
        <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
      </div>

      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
