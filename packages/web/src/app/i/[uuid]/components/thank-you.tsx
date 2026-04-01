'use client';

export function ThankYou() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-300">
        {/* Green checkmark */}
        <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Thank you!</h1>
          <p className="text-gray-400 text-lg max-w-sm">
            Your responses have been submitted. We appreciate your time and feedback.
          </p>
        </div>
      </div>

      {/* Powered by footer */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center">
        <a
          href="https://ideafuel.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-400 transition-colors text-sm"
        >
          <span>Powered by</span>
          <span className="font-semibold text-[#E32B1A]">IdeaFuel</span>
        </a>
      </div>
    </div>
  );
}
