'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl });
  };

  // const handleFacebookSignIn = () => {
  //   signIn('facebook', { callbackUrl });
  // };

  // const handleAppleSignIn = () => {
  //   signIn('apple', { callbackUrl });
  // };

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    signIn('credentials', { email, password, callbackUrl });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 relative">
      {/* Back link */}
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </Link>

      {/* Centered card */}
      <div className="w-full max-w-sm">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-10">
          <img
            src="/ideafuel-logo.svg"
            alt="Idea Fuel"
            className="h-12 w-auto mb-4"
          />
          <span className="font-mono text-xl font-medium uppercase tracking-[3px]">
            <span className="text-foreground">idea</span>
            <span className="text-gradient-brand">fuel</span>
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue validating your ideas
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error === 'OAuthSignin' && 'Error starting sign in.'}
            {error === 'OAuthCallback' && 'Error during sign in callback.'}
            {error === 'OAuthAccountNotLinked' && 'This email is already associated with another account.'}
            {error === 'Callback' && 'Error during callback.'}
            {error === 'CredentialsSignin' && 'Invalid email or password.'}
            {error === 'Default' && 'An error occurred during sign in.'}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.27 9.76A7.08 7.08 0 0 1 12 4.91c1.73 0 3.22.57 4.42 1.64l3.31-3.31A11.9 11.9 0 0 0 12 0 12 12 0 0 0 1.24 6.65l4.03 3.11z"
              />
              <path
                fill="#34A853"
                d="M16.04 18.01A7.05 7.05 0 0 1 12 19.09a7.08 7.08 0 0 1-6.73-4.85l-4.03 3.11A12 12 0 0 0 12 24c3.24 0 5.95-1.09 7.95-3.02l-3.91-2.97z"
              />
              <path
                fill="#4A90E2"
                d="M19.95 20.98A11.97 11.97 0 0 0 24 12c0-.79-.08-1.58-.23-2.36H12v4.73h6.74a5.88 5.88 0 0 1-2.7 3.64l3.91 2.97z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.24A7.2 7.2 0 0 1 4.91 12c0-.79.13-1.54.36-2.24L1.24 6.65A12.02 12.02 0 0 0 0 12c0 1.92.45 3.74 1.24 5.35l4.03-3.11z"
              />
            </svg>
            Sign in with Google
          </button>

          {/* Apple — hidden until provider is configured */}
          {/* <button
            onClick={handleAppleSignIn}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            Sign in with Apple
          </button> */}

          {/* Facebook — hidden until provider is configured */}
          {/* <button
            onClick={handleFacebookSignIn}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Sign in with Facebook
          </button> */}
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-background text-muted-foreground">Or</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Email <span className="text-primary">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Password <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          >
            Sign in
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Sign in with your preferred provider above
        </p>
      </div>

      {/* Bottom attribution */}
      <p className="absolute bottom-8 text-xs text-muted-foreground/50">
        Powered by <span className="font-mono uppercase tracking-[2px] text-muted-foreground/70">idea<span className="text-gradient-brand">fuel</span></span>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
