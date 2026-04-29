'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0A',
          color: '#fafafa',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 8px' }}>
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: '14px',
              opacity: 0.7,
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}
          >
            The app hit an unexpected error. Please try again — if this keeps happening, refresh the page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              borderRadius: '9999px',
              background: '#E32B1A',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
