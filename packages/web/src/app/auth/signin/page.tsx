'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import LightPillar from '@/components/ui/light-pillar';

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

  const handleFacebookSignIn = () => {
    signIn('facebook', { callbackUrl });
  };

  const handleAppleSignIn = () => {
    signIn('apple', { callbackUrl });
  };

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder for email/password sign in
    signIn('credentials', { email, password, callbackUrl });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Background + Value Prop */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0a0a0a]">
        {/* LightPillar Background */}
        <LightPillar
          topColor="hsl(160, 84%, 44%)"
          bottomColor="hsl(160, 60%, 55%)"
          intensity={0.2}
          rotationSpeed={0.1}
          interactive={false}
          glowAmount={0.001}
          pillarWidth={7.5}
          pillarHeight={0.4}
          noiseIntensity={1.2}
          pillarRotation={65}
        />

        {/* Back Button */}
        <Link
          href="/"
          className="absolute top-8 left-8 z-10 flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>

        {/* Value Proposition - Bottom Left */}
        <div className="absolute bottom-12 left-8 right-8 z-10">
          <h2 className="text-2xl md:text-2xl font-semibold text-white leading-tight">
            <span className="text-white/60">Turn sparks into</span> validated
            <br />
            business ideas
          </h2>
          <p className="mt-4 text-sm text-white/50 max-w-md">
            AI-powered research and validation that transforms raw concepts into market-ready opportunities. Stop guessing, start building.
          </p>
        </div>
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-[#111111]">
        {/* Logo */}
        <div className="p-8 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">FORGE</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16">
          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
              <p className="mt-2 text-sm text-white/50">
                Sign in to your account to continue your journey with Forge
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error === 'OAuthSignin' && 'Error starting sign in.'}
                {error === 'OAuthCallback' && 'Error during sign in callback.'}
                {error === 'OAuthAccountNotLinked' && 'This email is already associated with another account.'}
                {error === 'Callback' && 'Error during callback.'}
                {error === 'CredentialsSignin' && 'Invalid email or password.'}
                {error === 'Default' && 'An error occurred during sign in.'}
              </div>
            )}

            {/* OAuth Buttons - Single Column */}
            <div className="flex flex-col gap-3 mb-6">
              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
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

              {/* Apple */}
              <button
                onClick={handleAppleSignIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Sign in with Apple
              </button>

              {/* Facebook */}
              <button
                onClick={handleFacebookSignIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Sign in with Facebook
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-[#111111] text-white/40">Or</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1.5">
                  Email <span className="text-primary">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1.5">
                  Password <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-[hsl(160,70%,38%)] transition-colors"
              >
                Sign in
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center text-sm">
              <p className="text-white/50">
                Sign in with your preferred provider above
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="p-8 lg:p-12 text-center lg:text-right">
          <p className="text-xs text-white/30">
            Powered by <span className="text-white/50">Forge</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#111111]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
