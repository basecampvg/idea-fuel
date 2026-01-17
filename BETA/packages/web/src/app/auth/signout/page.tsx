'use client';

import { signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignOutContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSignOut = () => {
    signOut({ callbackUrl });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Sign out
          </h1>
          <p className="mt-4 text-center text-gray-600">
            Are you sure you want to sign out?
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            Sign out
          </button>

          <a
            href="/dashboard"
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SignOutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      }
    >
      <SignOutContent />
    </Suspense>
  );
}
