'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

interface NdaSignatureProps {
  uuid: string;
  onSigned: (data: { fullName: string; email: string }) => void;
}

type SignatureMode = 'type' | 'draw';

export function NdaSignature({ uuid, onSigned }: NdaSignatureProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('type');
  const [typedSignature, setTypedSignature] = useState('');
  const [error, setError] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (signatureMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signatureMode]);

  function getCanvasPos(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    setHasDrawing(true);
    const canvas = canvasRef.current!;
    lastPosRef.current = getCanvasPos(canvas, e.nativeEvent);
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getCanvasPos(canvas, e.nativeEvent);
    if (lastPosRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPosRef.current = pos;
  }

  function handleCanvasMouseUp() {
    setIsDrawing(false);
    lastPosRef.current = null;
  }

  function handleCanvasTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawing(true);
    const canvas = canvasRef.current!;
    const t = e.touches[0]!;
    lastPosRef.current = getCanvasPos(canvas, { clientX: t.clientX, clientY: t.clientY });
  }

  function handleCanvasTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const t = e.touches[0]!;
    const pos = getCanvasPos(canvas, { clientX: t.clientX, clientY: t.clientY });
    if (lastPosRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPosRef.current = pos;
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  }

  const signNda = trpc.customerInterview.signNda.useMutation({
    onSuccess: () => {
      onSigned({ fullName, email });
    },
    onError: (err) => {
      setError(err.message || 'Failed to sign NDA. Please try again.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    let signature = '';
    if (signatureMode === 'type') {
      if (!typedSignature.trim()) {
        setError('Please type your signature.');
        return;
      }
      signature = typedSignature;
    } else {
      if (!hasDrawing) {
        setError('Please draw your signature.');
        return;
      }
      signature = canvasRef.current!.toDataURL('image/png');
    }

    signNda.mutate({ uuid, fullName: fullName.trim(), email: email.trim(), signature });
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl animate-in fade-in duration-300">
        <h1 className="text-2xl font-bold text-white mb-2">Non-Disclosure Agreement</h1>
        <p className="text-neutral-400 mb-6 text-sm">
          Please review and sign the NDA below to access this interview.
        </p>

        {/* NDA Text */}
        <div className="border border-neutral-700 rounded-xl bg-neutral-900 p-4 mb-6 max-h-56 overflow-y-auto text-neutral-400 text-xs leading-relaxed space-y-3">
          <p className="font-semibold text-neutral-300 text-sm">
            IDEAFUEL NON-DISCLOSURE AGREEMENT
          </p>
          <p>
            This Non-Disclosure Agreement (&quot;Agreement&quot;) is entered into between IdeaFuel
            (&quot;Discloser&quot;) and the individual signing below (&quot;Recipient&quot;).
          </p>
          <p>
            <strong className="text-neutral-300">1. Confidential Information.</strong> Recipient agrees
            that all information shared during this interview session, including but not limited to
            business concepts, product ideas, strategies, market research, financial data, and any
            other proprietary information disclosed by Discloser (&quot;Confidential Information&quot;),
            is confidential and proprietary to Discloser.
          </p>
          <p>
            <strong className="text-neutral-300">2. Non-Disclosure Obligation.</strong> Recipient agrees
            not to disclose, publish, or share any Confidential Information with any third party
            without prior written consent from Discloser. Recipient shall use the Confidential
            Information solely for the purpose of participating in this interview.
          </p>
          <p>
            <strong className="text-neutral-300">3. Term.</strong> This Agreement shall remain in effect
            for a period of two (2) years from the date of signing.
          </p>
          <p>
            <strong className="text-neutral-300">4. No License.</strong> Nothing in this Agreement grants
            Recipient any rights in or to the Confidential Information except as expressly set forth
            herein.
          </p>
          <p>
            <strong className="text-neutral-300">5. Governing Law.</strong> This Agreement shall be
            governed by and construed in accordance with applicable law.
          </p>
          <p>
            By signing below, Recipient acknowledges that they have read, understand, and agree to
            be bound by the terms of this Agreement.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Full Legal Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-4 py-3 rounded-full bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-[#E32B1A]/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-4 py-3 rounded-full bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-[#E32B1A]/50 transition-colors"
            />
          </div>

          {/* Signature section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm text-neutral-400">Signature</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSignatureMode('type')}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    signatureMode === 'type'
                      ? 'bg-[#E32B1A] border-[#E32B1A] text-white'
                      : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  Type
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('draw')}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    signatureMode === 'draw'
                      ? 'bg-[#E32B1A] border-[#E32B1A] text-white'
                      : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  Draw
                </button>
              </div>
            </div>

            {signatureMode === 'type' ? (
              <div className="relative">
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Type your full name"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-[#E32B1A]/50 transition-colors"
                  style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1.25rem' }}
                />
                {typedSignature && (
                  <p
                    className="mt-2 text-white text-2xl px-4"
                    style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
                  >
                    {typedSignature}
                  </p>
                )}
              </div>
            ) : (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={160}
                  className="w-full rounded-xl border border-neutral-700 cursor-crosshair touch-none"
                  style={{ background: '#111111' }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasMouseUp}
                />
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="absolute top-2 right-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Clear
                </button>
                {!hasDrawing && (
                  <p className="absolute inset-0 flex items-center justify-center text-neutral-600 text-sm pointer-events-none">
                    Draw your signature here
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={signNda.isPending}
            className="w-full bg-[#E32B1A] text-white py-3 rounded-full font-semibold hover:bg-[#c42516] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signNda.isPending ? 'Signing...' : 'Sign & Continue'}
          </button>
        </form>
      </div>

      {/* Powered by footer */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center">
        <a
          href="https://ideafuel.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-400 transition-colors text-sm"
        >
          <span>Powered by</span>
          <span className="font-semibold text-[#E32B1A]">IdeaFuel</span>
        </a>
      </div>
    </div>
  );
}
