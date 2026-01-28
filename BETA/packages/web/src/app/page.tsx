export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-2xl font-semibold mb-4">Forge Automation</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          AI-powered business automation platform. Capture ideas, conduct interviews, and generate comprehensive
          business documents.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/auth/signin"
            className="px-6 py-3 bg-primary text-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </main>
  );
}
